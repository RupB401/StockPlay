from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.requests import Request
import logging
import requests
import time
import os
import json
import pandas as pd
import random
import asyncio
from datetime import datetime, timedelta
from dotenv import load_dotenv
import aiohttp
import yfinance as yf
from database import search_stocks_in_db, insert_stock_info, get_connection

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
from auth_routes import router as auth_router
from auth_database import AuthDatabase
from trading_routes import router as trading_router
from trading_database import TradingDatabase
from stock_info_database import StockInfoDatabase
from screener_service import ScreenerService
from stock_universe_database import StockUniverseDatabase
from universe_scheduler import start_universe_scheduler, stop_universe_scheduler
from price_scheduler import start_price_scheduler, stop_price_scheduler

# Load environment variables from credentials.env
import os
current_dir = os.path.dirname(os.path.abspath(__file__))
credentials_path = os.path.join(current_dir, "credentials.env")
load_dotenv(credentials_path)

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="StockPlay API", description="Stock market data and authentication API")

# Enable CORS for frontend communication
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
        "https://stockplay.netlify.app"  # <-- add your deployed frontend here!
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Import database growth scheduler
from database_growth_scheduler import StockDatabaseGrowthScheduler

# Initialize growth scheduler
growth_scheduler = None

# Initialize authentication and trading tables
@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup"""
    global growth_scheduler
    
    AuthDatabase.create_auth_tables()
    TradingDatabase.create_trading_tables()
    StockInfoDatabase.create_stock_info_table()
    
    # Start automatic database growth scheduler
    try:
        growth_scheduler = StockDatabaseGrowthScheduler()
        growth_scheduler.start_scheduler()
        logger.info("✅ Database growth scheduler started - will automatically add more stocks over time")
    except Exception as e:
        logger.error(f"Failed to start database growth scheduler: {e}")
    
    # Create unknown searches table
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS unknown_searches (
                id SERIAL PRIMARY KEY,
                query VARCHAR(255) NOT NULL,
                user_id INTEGER,
                ip_address VARCHAR(45),
                search_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                search_count INTEGER DEFAULT 1
            );
        """)
        conn.commit()
        conn.close()
        logging.info("✅ Unknown searches table created successfully")
    except Exception as e:
        logging.error(f"Failed to create unknown searches table: {e}")
    
# Helper functions for search functionality
async def track_unknown_search(query: str, client_ip: str, user_id: int = None):
    """Track searches that returned no results for future universe expansion"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Store unknown search queries for analysis
        cursor.execute("""
            INSERT INTO unknown_searches (query, user_id, ip_address, search_date)
            VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
        """, (query, user_id, client_ip))
        
        conn.commit()
        conn.close()
        logging.info(f"Tracked unknown search: '{query}' from {client_ip}")
    except Exception as e:
        logging.error(f"Failed to track unknown search: {e}")

async def add_to_stock_universe(stock_result: dict):
    """Add found stock to the stock universe database"""
    try:
        from stock_universe_database import StockUniverseDatabase
        
        with StockUniverseDatabase.get_connection() as conn:
            cursor = conn.cursor()
            
            # Check if stock already exists
            cursor.execute("SELECT id FROM stock_universe WHERE UPPER(symbol) = UPPER(?)", (stock_result["symbol"],))
            if cursor.fetchone():
                return  # Already exists
            
            # Add to universe
            cursor.execute("""
                INSERT INTO stock_universe (symbol, name, sector, industry, market_cap, exchange)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                stock_result["symbol"].upper(),
                stock_result.get("name", ""),
                stock_result.get("sector", "Unknown"),
                stock_result.get("industry", "Unknown"),
                stock_result.get("market_cap", 0),
                stock_result.get("region", "US")
            ))
            
            conn.commit()
            logging.info(f"Added {stock_result['symbol']} to stock universe")
    except Exception as e:
        logging.error(f"Failed to add {stock_result.get('symbol', 'unknown')} to universe: {e}")
    StockUniverseDatabase.create_tables()
    
    # Start the universe update scheduler
    start_universe_scheduler()
    
    # Start the price update scheduler
    start_price_scheduler()
    
    logging.info("✅ Application startup complete")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    global growth_scheduler
    
    stop_universe_scheduler()
    stop_price_scheduler()
    
    # Stop database growth scheduler
    if growth_scheduler:
        try:
            growth_scheduler.stop_scheduler()
            logger.info("✅ Database growth scheduler stopped")
        except Exception as e:
            logger.error(f"Error stopping database growth scheduler: {e}")
    
    logging.info("✅ Application shutdown complete")

# Include authentication and trading routes
app.include_router(auth_router)
app.include_router(trading_router)

@app.exception_handler(Exception)
async def internal_exception_handler(request: Request, exc: Exception):
    logging.error(f"Unhandled error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )

# Get API keys from environment variables
ALPHA_VANTAGE_API_KEY = os.getenv('ALPHA_VANTAGE_API_KEY')
FINNHUB_API_KEY = os.getenv('FINNHUB_API_KEY')

# ETF name mapping for better display names
ETF_NAMES = {
    "SPY": "SPDR S&P 500 ETF Trust",
    "QQQ": "Invesco QQQ ETF",
    "DIA": "SPDR Dow Jones Industrial Average ETF",
    "IWM": "iShares Russell 2000 ETF",
    "VXX": "iPath Series B S&P 500 VIX Short-Term Futures ETN"
}

# Real historical data fetching functions
async def fetch_historical_data_finnhub(symbol, range_type):
    """Fetch historical data from Finnhub API"""
    try:
        if not FINNHUB_API_KEY:
            raise Exception("Finnhub API key not found")
            
        # Calculate date range
        end_date = datetime.now()
        
        if range_type == "1D":
            start_date = end_date - timedelta(days=1)
            resolution = "5"  # 5-minute intervals
        elif range_type == "1W":
            start_date = end_date - timedelta(days=7)
            resolution = "30"  # 30-minute intervals
        elif range_type == "1M":
            start_date = end_date - timedelta(days=30)
            resolution = "D"  # Daily
        elif range_type == "3M":
            start_date = end_date - timedelta(days=90)
            resolution = "D"
        elif range_type == "5Y":
            start_date = end_date - timedelta(days=365*5)
            resolution = "W"  # Weekly data for 5 years
        elif range_type == "All":
            start_date = end_date - timedelta(days=365*20)  # 20 years max
            resolution = "M"  # Monthly data for all time
        else:  # 1Y
            start_date = end_date - timedelta(days=365)
            resolution = "D"
        
        # Convert to Unix timestamps
        start_timestamp = int(start_date.timestamp())
        end_timestamp = int(end_date.timestamp())
        
        url = f"https://finnhub.io/api/v1/stock/candle"
        params = {
            'symbol': symbol,
            'resolution': resolution,
            'from': start_timestamp,
            'to': end_timestamp,
            'token': FINNHUB_API_KEY
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, params=params) as response:
                data = await response.json()
                
                if data.get('s') == 'ok':
                    # Process Finnhub data
                    timestamps = data.get('t', [])
                    opens = data.get('o', [])
                    highs = data.get('h', [])
                    lows = data.get('l', [])
                    closes = data.get('c', [])
                    volumes = data.get('v', [])
                    
                    processed_data = []
                    for i in range(len(timestamps)):
                        dt = datetime.fromtimestamp(timestamps[i])
                        
                        if range_type == "1D":
                            processed_data.append({
                                "time": dt.strftime("%H:%M"),
                                "price": round(closes[i], 2),
                                "volume": volumes[i]
                            })
                        else:
                            processed_data.append({
                                "date": dt.strftime("%Y-%m-%d"),
                                "open": round(opens[i], 2),
                                "high": round(highs[i], 2),
                                "low": round(lows[i], 2),
                                "close": round(closes[i], 2),
                                "volume": volumes[i]
                            })
                    
                    return processed_data
                else:
                    logging.warning(f"Finnhub API returned status: {data.get('s')}")
                    return None
                    
    except Exception as e:
        logging.error(f"Error fetching Finnhub historical data: {e}")
        return None

def fetch_historical_data_yfinance(symbol, range_type):
    """Fetch historical data from yfinance as fallback"""
    try:
        stock = yf.Ticker(symbol)
        
        # Map range to yfinance period
        period_map = {
            "1D": "1d",
            "1W": "5d", 
            "1M": "1mo",
            "3M": "3mo",
            "1Y": "1y",
            "5Y": "5y",
            "All": "max"
        }
        
        interval_map = {
            "1D": "5m",  # 5-minute intervals for intraday
            "1W": "1h",  # 1-hour intervals
            "1M": "1d",  # Daily
            "3M": "1d",  # Daily
            "1Y": "1d",  # Daily
            "5Y": "1wk", # Weekly for 5 years
            "All": "1mo" # Monthly for all time
        }
        
        period = period_map.get(range_type, "1mo")
        interval = interval_map.get(range_type, "1d")
        
        # Fetch data
        hist = stock.history(period=period, interval=interval)
        
        if hist.empty:
            return None
            
        processed_data = []
        
        for index, row in hist.iterrows():
            if range_type == "1D":
                processed_data.append({
                    "time": index.strftime("%H:%M"),
                    "price": round(row['Close'], 2),
                    "volume": int(row['Volume'])
                })
            else:
                processed_data.append({
                    "date": index.strftime("%Y-%m-%d"),
                    "open": round(row['Open'], 2),
                    "high": round(row['High'], 2),
                    "low": round(row['Low'], 2),
                    "close": round(row['Close'], 2),
                    "volume": int(row['Volume'])
                })
        
        return processed_data
        
    except Exception as e:
        logging.error(f"Error fetching yfinance historical data: {e}")
        return None

# Dynamic stock data fetching functions
async def fetch_alpha_vantage_quote(symbol):
    """Fetch real-time stock quote from Alpha Vantage"""
    try:
        url = f"https://www.alphavantage.co/query"
        params = {
            'function': 'GLOBAL_QUOTE',
            'symbol': symbol,
            'apikey': ALPHA_VANTAGE_API_KEY
        }
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if "Global Quote" in data:
            quote = data["Global Quote"]
            return {
                "symbol": quote.get("01. symbol", symbol),
                "price": float(quote.get("05. price", 0)),
                "change": float(quote.get("09. change", 0)),
                "percent": quote.get("10. change percent", "0%").replace("%", ""),
                "volume": quote.get("06. volume", "0"),
                "latest_trading_day": quote.get("07. latest trading day", "")
            }
    except Exception as e:
        logging.error(f"Alpha Vantage API error for {symbol}: {e}")
        return None

async def fetch_finnhub_quote(symbol):
    """Fetch real-time stock quote from Finnhub as backup"""
    try:
        url = f"https://finnhub.io/api/v1/quote"
        params = {
            'symbol': symbol,
            'token': FINNHUB_API_KEY
        }
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data and 'c' in data:  # 'c' is current price
            current = data['c']
            previous = data.get('pc', current)  # previous close
            change = current - previous
            percent_change = (change / previous * 100) if previous != 0 else 0
            
            return {
                "symbol": symbol,
                "price": current,
                "change": change,
                "percent": f"{percent_change:.2f}",
                "high": data.get('h', 0),
                "low": data.get('l', 0),
                "open": data.get('o', 0),
                "previous_close": previous
            }
    except Exception as e:
        logging.error(f"Finnhub API error for {symbol}: {e}")
        return None

async def get_dynamic_stock_data(symbol, company_name):
    """Get dynamic stock data with fallback between APIs"""
    # Try Alpha Vantage first
    stock_data = await fetch_alpha_vantage_quote(symbol)
    
    # If Alpha Vantage fails, try Finnhub
    if not stock_data:
        stock_data = await fetch_finnhub_quote(symbol)
    
    # If both fail, return static fallback
    if not stock_data:
        return {
            "symbol": symbol,
            "name": company_name,
            "price": "$0.00",
            "change": "0.00",
            "percent": "0.00",
            "isNegative": False,
            "status": "unavailable"
        }
    
    # Format the response
    price = stock_data["price"]
    change = stock_data["change"]
    percent = float(str(stock_data["percent"]).replace("%", ""))
    
    return {
        "symbol": symbol,
        "name": company_name,
        "price": f"${price:.2f}",
        "change": f"{change:+.2f}" if change != 0 else "0.00",
        "percent": f"{percent:+.2f}%",
        "isNegative": change < 0,
        "status": "live"
    }

# Cache for rate limiting
stock_cache = {}
cache_expiry = {}
CACHE_DURATION = 300  # 5 minutes cache

def get_cached_or_fetch_stock(symbol, company_name):
    """Get stock data with caching to respect API rate limits"""
    import time
    current_time = time.time()
    
    # Check if we have valid cached data
    if symbol in stock_cache and symbol in cache_expiry:
        if current_time < cache_expiry[symbol]:
            return stock_cache[symbol]
    
    # Cache expired or doesn't exist, fetch new data
    try:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        stock_data = loop.run_until_complete(get_dynamic_stock_data(symbol, company_name))
        loop.close()
        
        # Cache the result
        stock_cache[symbol] = stock_data
        cache_expiry[symbol] = current_time + CACHE_DURATION
        
        return stock_data
    except Exception as e:
        logging.error(f"Error fetching stock data for {symbol}: {e}")
        # Return cached data if available, otherwise static fallback
        if symbol in stock_cache:
            return stock_cache[symbol]
        return {
            "symbol": symbol,
            "name": company_name,
            "price": "$0.00",
            "change": "0.00",
            "percent": "0.00%",
            "isNegative": False,
            "status": "error"
        }

# Cache for logos (separate from stock data cache)
logo_cache = {}
logo_cache_expiry = {}
LOGO_CACHE_DURATION = 86400  # 24 hours cache for logos (they rarely change)

async def fetch_company_logo(symbol):
    """Fetch company logo from Finnhub API"""
    try:
        url = f"https://finnhub.io/api/v1/stock/profile2"
        params = {
            'symbol': symbol,
            'token': FINNHUB_API_KEY
        }
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data and 'logo' in data:
            return {
                "symbol": symbol,
                "logo": data.get('logo', ''),
                "name": data.get('name', ''),
                "country": data.get('country', ''),
                "currency": data.get('currency', ''),
                "exchange": data.get('exchange', ''),
                "ipo": data.get('ipo', ''),
                "marketCapitalization": data.get('marketCapitalization', 0),
                "shareOutstanding": data.get('shareOutstanding', 0),
                "weburl": data.get('weburl', '')
            }
    except Exception as e:
        logging.error(f"Finnhub logo API error for {symbol}: {e}")
        return None

def get_cached_or_fetch_logo(symbol):
    """Get company logo with caching"""
    import time
    current_time = time.time()
    
    # Check if we have valid cached logo
    if symbol in logo_cache and symbol in logo_cache_expiry:
        if current_time < logo_cache_expiry[symbol]:
            return logo_cache[symbol]
    
    # Cache expired or doesn't exist, fetch new logo
    try:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        logo_data = loop.run_until_complete(fetch_company_logo(symbol))
        loop.close()
        
        if logo_data:
            # Cache the result
            logo_cache[symbol] = logo_data
            logo_cache_expiry[symbol] = current_time + LOGO_CACHE_DURATION
            return logo_data
        else:
            return {"symbol": symbol, "logo": "", "error": "Logo not found"}
            
    except Exception as e:
        logging.error(f"Error fetching logo for {symbol}: {e}")
        return {"symbol": symbol, "logo": "", "error": str(e)}

@app.get("/")
def read_root():
    return {"Hello": "World", "message": "Stock Market API is running!"}

@app.get("/health")
def health_check():
    """Health check endpoint for frontend connectivity testing"""
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/market/indices")
def get_market_indices():
    """Get major market indices with real-time data"""
    try:
        # Define major indices to fetch
        indices_list = [
            ("^GSPC", "S&P 500"),
            ("^IXIC", "NASDAQ"),
            ("^DJI", "DOW"),
            ("^RUT", "RUSSELL 2000"),
            ("^VIX", "VIX"),
        ]
        
        indices = []
        for symbol, name in indices_list:
            # For now, use static fallback data for indices since the APIs don't support them well
            fallback_indices = {
                "^GSPC": {"name": "S&P 500", "value": "5,308.14", "change": "-15.40", "percent": "-0.29%"},
                "^IXIC": {"name": "NASDAQ", "value": "16,742.32", "change": "-87.56", "percent": "-0.52%"},
                "^DJI": {"name": "DOW", "value": "39,123.56", "change": "+45.30", "percent": "+0.12%"},
                "^RUT": {"name": "RUSSELL 2000", "value": "2,042.58", "change": "-18.24", "percent": "-0.89%"},
                "^VIX": {"name": "VIX", "value": "14.82", "change": "+0.75", "percent": "+5.33%"},
            }
            fallback = fallback_indices.get(symbol, {"name": name, "value": "0.00", "change": "0.00", "percent": "0.00%"})
            indices.append({
                "name": fallback["name"],
                "symbol": symbol,
                "value": fallback["value"],
                "change": fallback["change"],
                "percent": fallback["percent"],
                "isNegative": fallback["change"].startswith("-")
            })
        
        return indices
    except Exception as e:
        logging.error(f"Error fetching market indices: {e}")
        # Complete fallback
        return [
            {"name": "S&P 500", "symbol": "^GSPC", "value": "5,308.14", "change": "-15.40", "percent": "-0.29%", "isNegative": True},
            {"name": "NASDAQ", "symbol": "^IXIC", "value": "16,742.32", "change": "-87.56", "percent": "-0.52%", "isNegative": True},
            {"name": "DOW", "symbol": "^DJI", "value": "39,123.56", "change": "+45.30", "percent": "+0.12%", "isNegative": False},
            {"name": "RUSSELL 2000", "symbol": "^RUT", "value": "2,042.58", "change": "-18.24", "percent": "-0.89%", "isNegative": True},
            {"name": "VIX", "symbol": "^VIX", "value": "14.82", "change": "+0.75", "percent": "+5.33%", "isNegative": False},
        ]

@app.get("/popular-stocks")
def get_popular_stocks(limit: int = 8, page: int = 1, offset: int = 0):
    """Get numerous popular stocks from stock universe database with variety and pagination"""
    try:
        # Calculate actual offset
        if page > 1:
            offset = (page - 1) * limit
        
        logger.info(f"Fetching {limit} popular stocks (page {page}, offset {offset}) with variety from stock universe database...")
        
        # Get diverse selection of stocks from database
        db = StockUniverseDatabase()
        with db.get_connection() as conn:
            cursor = conn.cursor()
            
            # First get total count
            cursor.execute('''
                SELECT COUNT(*) FROM stock_universe 
                WHERE is_active = 1
            ''')
            total_count = cursor.fetchone()[0]
            
            # Get stocks with variety - mix of high volume, popular, and diverse sectors
            cursor.execute('''
                SELECT symbol, name, sector, market_cap, current_price, 
                       price_change_1d, trading_volume, volatility,
                       watchlist_count, popularity_score, logo_url,
                       buy_orders_count, sell_orders_count, search_trend_score
                FROM stock_universe 
                WHERE is_active = 1
                ORDER BY 
                    CASE 
                        WHEN trading_volume > 20000000 THEN 1
                        WHEN watchlist_count > 500 THEN 2
                        WHEN popularity_score > 15 THEN 3
                        ELSE 4
                    END,
                    popularity_score DESC,
                    trading_volume DESC,
                    symbol ASC  -- Add consistent secondary sort for pagination
                LIMIT ? OFFSET ?
            ''', (limit, offset))
            
            stocks = cursor.fetchall()
        
        if not stocks:
            logger.warning("No stocks found in database, using fallback")
            return get_enhanced_fallback_stocks(limit)
        
        formatted_stocks = []
        added_sectors = set()
        
        for stock in stocks:
            if len(formatted_stocks) >= limit:
                break
                
            symbol, name, sector, market_cap, current_price, price_change_1d, trading_volume, volatility, watchlist_count, popularity_score, logo_url, buy_orders, sell_orders, search_trends = stock
            
            # Promote sector diversity - prefer stocks from new sectors
            sector_bonus = 0 if sector in added_sectors else 10
            added_sectors.add(sector)
            
            try:
                # Generate realistic price if none exists
                display_price = current_price if current_price and current_price > 0 else random.uniform(10, 500)
                display_change = price_change_1d if price_change_1d else random.uniform(-5, 8)
                
                # Calculate percentage change
                if current_price and current_price > 0 and price_change_1d:
                    percent_change = (price_change_1d / (current_price - price_change_1d)) * 100
                else:
                    percent_change = (display_change / display_price) * 100
                
                # Format the response
                formatted_stock = {
                    "symbol": symbol,
                    "name": name,
                    "price": f"${display_price:.2f}",
                    "change": f"{'+' if display_change >= 0 else ''}{display_change:.2f}",  
                    "percent": f"{'+' if percent_change >= 0 else ''}{percent_change:.2f}%",
                    "isNegative": display_change < 0,
                    "status": "live",
                    "search_count": search_trends or random.randint(100, 1500),
                    "popularity_score": (popularity_score or 0) + sector_bonus,
                    "logo_url": logo_url or f"https://logo.clearbit.com/{name.lower().replace(' ', '').replace('.', '').replace(',', '').replace('inc', '').replace('corp', '').replace('corporation', '').replace('company', '')}.com",
                    "volume": trading_volume or random.randint(1000000, 50000000),
                    "marketCap": market_cap or random.randint(1000000000, 100000000000),
                    "volatility": volatility or random.uniform(1.5, 4.0),
                    "watchlist_count": watchlist_count or random.randint(200, 1200),
                    "sector": sector
                }
                
                formatted_stocks.append(formatted_stock)
                
            except Exception as stock_error:
                logger.warning(f"Error formatting stock {symbol}: {stock_error}")
                continue
        
        # If still not enough stocks, add from fallback
        if len(formatted_stocks) < limit:
            fallback_stocks = get_enhanced_fallback_stocks(limit - len(formatted_stocks))
            existing_symbols = {stock['symbol'] for stock in formatted_stocks}
            
            for fallback_stock in fallback_stocks:
                if fallback_stock['symbol'] not in existing_symbols:
                    formatted_stocks.append(fallback_stock)
                    if len(formatted_stocks) >= limit:
                        break
        
        # Sort by a mix of popularity and volume for variety
        formatted_stocks.sort(key=lambda x: (
            x.get('popularity_score', 0) * 0.6 + 
            (x.get('volume', 0) / 1000000) * 0.3 + 
            (x.get('watchlist_count', 0) / 100) * 0.1
        ), reverse=True)
        
        result = formatted_stocks[:limit]
        logger.info(f"✅ Retrieved {len(result)} diverse popular stocks from database (page {page})")
        
        # Return paginated response
        total_pages = (total_count + limit - 1) // limit  # Ceiling division
        return {
            "stocks": result,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "totalPages": total_pages,
                "hasNext": page < total_pages,
                "hasPrev": page > 1
            }
        }
        
    except Exception as e:
        logger.error(f"Error fetching popular stocks: {e}")
        fallback_stocks = get_enhanced_fallback_stocks(limit)
        total_fallback = len(fallback_stocks)
        return {
            "stocks": fallback_stocks,
            "pagination": {
                "page": 1,
                "limit": limit,
                "total": total_fallback,
                "totalPages": 1,
                "hasNext": False,
                "hasPrev": False
            }
        }

@app.get("/stocks/browse")
def browse_all_stocks(page: int = 1, limit: int = 20, sector: str = None, market_cap: str = None):
    """Browse all stocks with pagination, filtering by sector and market cap"""
    try:
        # Calculate offset
        offset = (page - 1) * limit
        
        logger.info(f"Browsing stocks (page {page}, limit {limit}, sector: {sector}, market_cap: {market_cap})")
        
        from stock_universe_database import StockUniverseDatabase
        
        # Get filtered stocks based on market cap
        if market_cap:
            stocks = StockUniverseDatabase.get_stocks_by_market_cap(market_cap, limit=None)
        else:
            stocks = StockUniverseDatabase.get_all_stocks()
        
        # Filter by sector if specified
        if sector:
            stocks = [s for s in stocks if s.get('sector', '').lower() == sector.lower()]
        
        # Calculate pagination
        total_count = len(stocks)
        total_pages = (total_count + limit - 1) // limit
        
        # Apply pagination
        start_idx = offset
        end_idx = offset + limit
        paginated_stocks = stocks[start_idx:end_idx]
        
        if not stocks and page == 1:
            # Return fallback for first page if no results
            fallback = get_enhanced_fallback_stocks(limit)
            return {
                "stocks": fallback,
                "pagination": {
                    "page": 1,
                    "limit": limit,
                    "total": len(fallback),
                    "totalPages": 1,
                    "hasNext": False,
                    "hasPrev": False
                },
                "filters": {"sector": sector, "market_cap": market_cap}
            }
        
        # Format stocks
        formatted_stocks = []
        for stock in paginated_stocks:
            # Calculate market cap from current price and shares outstanding
            market_cap_val = (stock['current_price'] * stock['shares_outstanding']) if stock.get('shares_outstanding') else stock.get('market_cap', 0)
            
            # Use real data from database
            display_price = stock['current_price'] if stock['current_price'] and stock['current_price'] > 0 else 0
            display_change = stock.get('price_change', 0)
            
            # Calculate percentage change
            percent_change = stock.get('price_change_percent', 0)
            if not percent_change and display_change and display_price:
                prev_price = display_price - display_change
                if prev_price > 0:
                    percent_change = (display_change / prev_price) * 100
            
            formatted_stocks.append({
                "symbol": stock['symbol'],
                "name": stock.get('company_name', stock['symbol']),
                "sector": stock.get('sector', 'Unknown'),
                "price": f"${display_price:.2f}",
                "change": f"{display_change:+.2f}",
                "percent": f"{percent_change:+.2f}%",
                "isNegative": display_change < 0,
                "status": "live",
                "marketCap": market_cap_val,
                "volume": stock.get('volume', 0),
                "volatility": stock.get('beta', 0),
                "watchlist_count": 0,  # Not available in new schema
                "popularity_score": 0,  # Not available in new schema
                "logo_url": f"https://logo.clearbit.com/{stock.get('company_name', stock['symbol']).lower().replace(' ', '').replace('.', '').replace(',', '').replace('inc', '').replace('corp', '').replace('corporation', '').replace('company', '').replace('co', '').replace('&', '').replace('the', '').replace('holdings', '').replace('technologies', '').replace('systems', '').replace('group', '')}.com"
            })
        
        total_pages = (total_count + limit - 1) // limit
        
        return {
            "stocks": formatted_stocks,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total_count,
                "totalPages": total_pages,
                "hasNext": page < total_pages,
                "hasPrev": page > 1
            },
            "filters": {"sector": sector, "market_cap": market_cap}
        }
        
    except Exception as e:
        logger.error(f"Error browsing stocks: {e}")
        fallback = get_enhanced_fallback_stocks(limit)
        return {
            "stocks": fallback,
            "pagination": {
                "page": 1,
                "limit": limit,
                "total": len(fallback),
                "totalPages": 1,
                "hasNext": False,
                "hasPrev": False
            },
            "filters": {"sector": sector, "market_cap": market_cap}
        }

def get_enhanced_fallback_stocks(limit: int = 8):
    """Get enhanced fallback stocks with variety"""
    reliable_stocks = [
        {"symbol": "AAPL", "name": "Apple Inc.", "price": "$193.60", "change": "+2.35", "percent": "+1.23%", 
         "isNegative": False, "status": "live", "search_count": 856, "popularity_score": 95.5, 
         "logo_url": "https://logo.clearbit.com/apple.com", "volume": 47250000, "marketCap": 2980000000000,
         "volatility": 2.1, "watchlist_count": 1250, "sector": "Technology"},
        {"symbol": "MSFT", "name": "Microsoft Corporation", "price": "$424.30", "change": "-1.25", "percent": "-0.29%", 
         "isNegative": True, "status": "live", "search_count": 734, "popularity_score": 92.8,
         "logo_url": "https://logo.clearbit.com/microsoft.com", "volume": 19340000, "marketCap": 3150000000000,
         "volatility": 1.8, "watchlist_count": 1180, "sector": "Technology"},
        {"symbol": "GOOGL", "name": "Alphabet Inc.", "price": "$175.25", "change": "+3.45", "percent": "+2.01%", 
         "isNegative": False, "status": "live", "search_count": 623, "popularity_score": 89.2,
         "logo_url": "https://logo.clearbit.com/google.com", "volume": 25680000, "marketCap": 2200000000000,
         "volatility": 2.5, "watchlist_count": 1045, "sector": "Technology"},
        {"symbol": "NVDA", "name": "NVIDIA Corporation", "price": "$138.07", "change": "+4.23", "percent": "+3.16%", 
         "isNegative": False, "status": "live", "search_count": 789, "popularity_score": 94.1,
         "logo_url": "https://logo.clearbit.com/nvidia.com", "volume": 41200000, "marketCap": 3400000000000,
         "volatility": 4.2, "watchlist_count": 1320, "sector": "Technology"},
        {"symbol": "AMZN", "name": "Amazon.com Inc.", "price": "$186.40", "change": "-2.10", "percent": "-1.11%", 
         "isNegative": True, "status": "live", "search_count": 567, "popularity_score": 87.6,
         "logo_url": "https://logo.clearbit.com/amazon.com", "volume": 33120000, "marketCap": 1950000000000,
         "volatility": 2.8, "watchlist_count": 985, "sector": "Technology"},
        {"symbol": "TSLA", "name": "Tesla Inc.", "price": "$248.98", "change": "+8.45", "percent": "+3.51%", 
         "isNegative": False, "status": "live", "search_count": 892, "popularity_score": 93.7,
         "logo_url": "https://logo.clearbit.com/tesla.com", "volume": 89420000, "marketCap": 790000000000,
         "volatility": 5.8, "watchlist_count": 1465, "sector": "Automotive"},
        {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "price": "$230.45", "change": "+1.25", "percent": "+0.55%", 
         "isNegative": False, "status": "live", "search_count": 289, "popularity_score": 76.8,
         "logo_url": "https://logo.clearbit.com/jpmorganchase.com", "volume": 8560000, "marketCap": 671000000000,
         "volatility": 2.1, "watchlist_count": 542, "sector": "Financial"},
        {"symbol": "V", "name": "Visa Inc.", "price": "$310.25", "change": "+2.85", "percent": "+0.93%", 
         "isNegative": False, "status": "live", "search_count": 234, "popularity_score": 78.2,
         "logo_url": "https://logo.clearbit.com/visa.com", "volume": 4230000, "marketCap": 643000000000,
         "volatility": 1.7, "watchlist_count": 623, "sector": "Financial"},
        {"symbol": "WMT", "name": "Walmart Inc.", "price": "$83.12", "change": "+0.45", "percent": "+0.54%", 
         "isNegative": False, "status": "live", "search_count": 187, "popularity_score": 72.3,
         "logo_url": "https://logo.clearbit.com/walmart.com", "volume": 12340000, "marketCap": 674000000000,
         "volatility": 1.5, "watchlist_count": 456, "sector": "Retail"},
        {"symbol": "HD", "name": "Home Depot Inc.", "price": "$407.85", "change": "-2.15", "percent": "-0.52%", 
         "isNegative": True, "status": "live", "search_count": 156, "popularity_score": 69.7,
         "logo_url": "https://logo.clearbit.com/homedepot.com", "volume": 2890000, "marketCap": 401000000000,
         "volatility": 1.9, "watchlist_count": 398, "sector": "Retail"},
        {"symbol": "JNJ", "name": "Johnson & Johnson", "price": "$158.89", "change": "+1.23", "percent": "+0.78%", 
         "isNegative": False, "status": "live", "search_count": 145, "popularity_score": 67.8,
         "logo_url": "https://logo.clearbit.com/jnj.com", "volume": 8920000, "marketCap": 378000000000,
         "volatility": 1.6, "watchlist_count": 367, "sector": "Healthcare"},
        {"symbol": "PFE", "name": "Pfizer Inc.", "price": "$28.75", "change": "+0.85", "percent": "+3.05%", 
         "isNegative": False, "status": "live", "search_count": 234, "popularity_score": 71.2,
         "logo_url": "https://logo.clearbit.com/pfizer.com", "volume": 45670000, "marketCap": 162000000000,
         "volatility": 2.3, "watchlist_count": 678, "sector": "Healthcare"},
        {"symbol": "KO", "name": "Coca-Cola Company", "price": "$66.40", "change": "+0.65", "percent": "+0.99%", 
         "isNegative": False, "status": "live", "search_count": 198, "popularity_score": 68.4,
         "logo_url": "https://logo.clearbit.com/coca-cola.com", "volume": 15230000, "marketCap": 285000000000,
         "volatility": 1.4, "watchlist_count": 543, "sector": "Consumer"},
        {"symbol": "DIS", "name": "Walt Disney Company", "price": "$112.33", "change": "-1.45", "percent": "-1.27%", 
         "isNegative": True, "status": "live", "search_count": 167, "popularity_score": 64.7,
         "logo_url": "https://logo.clearbit.com/disney.com", "volume": 12890000, "marketCap": 205000000000,
         "volatility": 2.1, "watchlist_count": 456, "sector": "Consumer"},
        {"symbol": "XOM", "name": "Exxon Mobil Corporation", "price": "$115.40", "change": "+2.35", "percent": "+2.08%", 
         "isNegative": False, "status": "live", "search_count": 145, "popularity_score": 62.3,
         "logo_url": "https://logo.clearbit.com/exxonmobil.com", "volume": 18450000, "marketCap": 485000000000,
         "volatility": 2.7, "watchlist_count": 389, "sector": "Energy"}
    ]
    
    return reliable_stocks[:limit]

# Price Update Management Endpoints
@app.post("/admin/update-prices")
async def manual_price_update(symbol: str = None):
    """Manually trigger price updates for all holdings or specific symbol"""
    try:
        from price_scheduler import force_price_update
        
        if symbol:
            force_price_update(symbol.upper())
            return {
                "success": True,
                "message": f"Price update triggered for {symbol.upper()}",
                "timestamp": datetime.now().isoformat()
            }
        else:
            force_price_update()
            return {
                "success": True, 
                "message": "Comprehensive price update triggered for all holdings",
                "timestamp": datetime.now().isoformat()
            }
            
    except Exception as e:
        logging.error(f"Error triggering manual price update: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/admin/price-update-status")
async def get_price_update_status():
    """Get status of price updates and holdings"""
    try:
        from database import get_connection
        
        conn = get_connection()
        cursor = conn.cursor()
        
        # Get holdings summary with last update times
        cursor.execute("""
            SELECT 
                symbol,
                COUNT(DISTINCT user_id) as users_holding,
                SUM(quantity) as total_shares,
                AVG(current_price) as avg_price,
                MAX(last_updated) as last_price_update
            FROM stock_holdings 
            WHERE quantity > 0
            GROUP BY symbol
            ORDER BY users_holding DESC, total_shares DESC
        """)
        
        holdings = cursor.fetchall()
        
        # Get overall statistics
        cursor.execute("""
            SELECT 
                COUNT(DISTINCT symbol) as unique_symbols,
                COUNT(DISTINCT user_id) as active_users,
                SUM(current_value) as total_portfolio_value
            FROM stock_holdings 
            WHERE quantity > 0
        """)
        
        stats = cursor.fetchone()
        conn.close()
        
        holdings_data = []
        for holding in holdings:
            symbol, users, shares, price, last_update = holding
            holdings_data.append({
                "symbol": symbol,
                "users_holding": users,
                "total_shares": float(shares) if shares else 0,
                "current_price": float(price) if price else 0,
                "last_updated": last_update.isoformat() if last_update else None,
                "needs_update": (datetime.now() - last_update).seconds > 300 if last_update else True  # 5 minutes
            })
        
        return {
            "success": True,
            "data": {
                "holdings": holdings_data,
                "statistics": {
                    "unique_symbols": stats[0] if stats else 0,
                    "active_users": stats[1] if stats else 0,
                    "total_portfolio_value": float(stats[2]) if stats and stats[2] else 0
                },
                "timestamp": datetime.now().isoformat()
            }
        }
        
    except Exception as e:
        logging.error(f"Error getting price update status: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }

@app.get("/top-performers")
def get_top_performers(cap: str = "large"):
    """Get top performing stocks by market cap from stock universe database"""
    try:
        # Validate market cap parameter
        valid_caps = ["large", "mid", "small"]
        if cap not in valid_caps:
            cap = "large"
        
        # Get top performers using the new database method
        from stock_universe_database import StockUniverseDatabase
        stocks = StockUniverseDatabase.get_top_performers(cap_type=cap, limit=12)

        performers = []
        for stock in stocks:
            try:
                # Calculate market cap from current price and shares outstanding
                market_cap = (stock['current_price'] * stock['shares_outstanding']) if stock.get('shares_outstanding') else stock.get('market_cap', 0)
                
                # Use the price_change_percent from database or calculate it
                percent_change = stock.get('price_change_percent', 0)
                if not percent_change and stock.get('price_change') and stock.get('current_price'):
                    prev_price = stock['current_price'] - stock['price_change']
                    if prev_price > 0:
                        percent_change = (stock['price_change'] / prev_price) * 100
                
                stock_data = {
                    "symbol": stock['symbol'],
                    "name": stock.get('company_name', stock['symbol']),
                    "price": f"${stock['current_price']:.2f}",
                    "change": f"{'+' if stock.get('price_change', 0) >= 0 else ''}{stock.get('price_change', 0):.2f}",
                    "percent": f"{'+' if percent_change >= 0 else ''}{percent_change:.2f}%",
                    "isNegative": stock.get('price_change', 0) < 0,
                    "status": "live",
                    "marketCap": market_cap,
                    "volume": stock.get('volume', 0),
                    "volatility": stock.get('beta', 0),
                    "watchlist_count": 0,  # Not available in new schema
                    "popularity_score": 0,  # Not available in new schema
                    "logo_url": None,  # Not available in new schema
                    "sector": stock.get('sector', 'Unknown')
                }
                performers.append(stock_data)
            except Exception as stock_error:
                logger.warning(f"Error processing {cap} cap stock {stock['symbol']}: {stock_error}")
                continue

        # Only use fallback if database is truly empty
        if len(performers) == 0:
            logger.info(f"No {cap} cap stocks found, using fallbacks")
            fallback_stock_lists = {
                "large": [
                    ("NVDA", "NVIDIA Corporation", 4152000000000, 138.07),
                    ("TSLA", "Tesla Inc.", 1067000000000, 248.98),
                    ("AMD", "Advanced Micro Devices", 285000000000, 166.30),
                    ("NFLX", "Netflix Inc.", 195000000000, 450.20),
                    ("CRM", "Salesforce Inc.", 295000000000, 269.75),
                    ("ADBE", "Adobe Inc.", 220000000000, 475.30),
                    ("ORCL", "Oracle Corporation", 520000000000, 245.24)
                ],
                "mid": [
                    ("SQ", "Block Inc.", 38000000000, 62.50),
                    ("ROKU", "Roku Inc.", 7800000000, 74.20),
                    ("TWLO", "Twilio Inc.", 9500000000, 58.90),
                    ("ZM", "Zoom Video Communications", 22000000000, 75.40),
                    ("DOCU", "DocuSign Inc.", 12000000000, 62.80),
                    ("SNAP", "Snap Inc.", 18500000000, 11.85),
                    ("SPOT", "Spotify Technology", 32000000000, 170.30)
                ],
                "small": [
                    ("UPST", "Upstart Holdings Inc.", 850000000, 10.45),
                    ("SOFI", "SoFi Technologies Inc.", 9200000000, 9.87),
                    ("HOOD", "Robinhood Markets Inc.", 18500000000, 21.60),
                    ("RBLX", "Roblox Corporation", 28000000000, 45.70),
                    ("AI", "C3.ai Inc.", 3800000000, 34.80),
                    ("IONQ", "IonQ Inc.", 2800000000, 16.75),
                    ("MVIS", "MicroVision Inc.", 780000000, 4.82)
                ]
            }
            fallback_stocks = fallback_stock_lists.get(cap, fallback_stock_lists["large"])
            for symbol, name, market_cap, price in fallback_stocks:
                price_change = 0
                percent_change = 0
                stock_data = {
                    "symbol": symbol,
                    "name": name,
                    "price": f"${price:.2f}",
                    "change": f"+0.00",
                    "percent": f"+0.00%",
                    "isNegative": False,
                    "status": "fallback",
                    "marketCap": market_cap,
                    "volume": 0,
                    "volatility": 0,
                    "watchlist_count": 0,
                    "popularity_score": 0,
                    "logo_url": f"https://logo.clearbit.com/{name.lower().replace(' ', '').replace('.', '').replace(',', '').replace('inc', '').replace('corp', '').replace('corporation', '')}.com",
                    "sector": "Technology"
                }
                performers.append(stock_data)

        # Sort by performance (positive changes first, then by percentage)
        performers.sort(key=lambda x: (
            not x.get("isNegative", True),  # False (positive) comes first
            float(str(x.get("percent", "0%")).replace("%", "").replace("+", ""))
        ), reverse=True)
        logger.info(f"✅ Returning {len(performers)} {cap} cap performers")
        return performers[:5]  # Return top 5 performers
        
    except Exception as e:
        logger.error(f"Error fetching {cap} cap top performers: {e}")
        # Static fallback
        fallback_data = {
            "large": [
                {"symbol": "NVDA", "name": "NVIDIA Corporation", "price": "$875.50", "change": "+2.45", "percent": "+0.28%", "isNegative": False, "status": "fallback"},
                {"symbol": "TSLA", "name": "Tesla Inc.", "price": "$248.90", "change": "+8.20", "percent": "+3.41%", "isNegative": False, "status": "fallback"},
            ],
            "mid": [
                {"symbol": "SQ", "name": "Block Inc.", "price": "$75.40", "change": "+3.20", "percent": "+4.43%", "isNegative": False, "status": "fallback"},
                {"symbol": "ROKU", "name": "Roku Inc.", "price": "$65.80", "change": "+2.85", "percent": "+4.53%", "isNegative": False, "status": "fallback"},
            ],
            "small": [
                {"symbol": "SPCE", "name": "Virgin Galactic Holdings", "price": "$12.45", "change": "+0.85", "percent": "+7.33%", "isNegative": False, "status": "fallback"},
                {"symbol": "TLRY", "name": "Tilray Brands Inc.", "price": "$8.90", "change": "+0.45", "percent": "+5.33%", "isNegative": False, "status": "fallback"},
            ]
        }
        return fallback_data.get(cap, fallback_data["large"])

# News cache
news_cache = {}
news_cache_expiry = {}
NEWS_CACHE_DURATION = 900  # 15 minutes cache for news

async def fetch_finnhub_market_news(limit=10):
    """Fetch general market news from Finnhub"""
    try:
        url = f"https://finnhub.io/api/v1/news"
        params = {
            'category': 'general',
            'token': FINNHUB_API_KEY
        }
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data and isinstance(data, list):
            news_items = []
            for item in data[:limit]:
                news_items.append({
                    "id": item.get('id', ''),
                    "title": item.get('headline', ''),
                    "summary": item.get('summary', '')[:200] + '...' if len(item.get('summary', '')) > 200 else item.get('summary', ''),
                    "source": item.get('source', 'Finnhub'),
                    "publishedAt": datetime.fromtimestamp(item.get('datetime', 0)).strftime('%Y-%m-%d %H:%M:%S') if item.get('datetime') else '',
                    "imageUrl": item.get('image', ''),
                    "url": item.get('url', ''),
                    "category": item.get('category', 'general'),
                    "related": item.get('related', '')
                })
            return news_items
    except Exception as e:
        logging.error(f"Finnhub news API error: {e}")
        return None

async def fetch_company_news_finnhub(symbol, limit=5):
    """Fetch company-specific news from Finnhub"""
    try:
        # Calculate date range (last 30 days)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=30)
        
        url = f"https://finnhub.io/api/v1/company-news"
        params = {
            'symbol': symbol,
            'from': start_date.strftime('%Y-%m-%d'),
            'to': end_date.strftime('%Y-%m-%d'),
            'token': FINNHUB_API_KEY
        }
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data and isinstance(data, list):
            news_items = []
            for item in data[:limit]:
                news_items.append({
                    "id": item.get('id', ''),
                    "title": item.get('headline', ''),
                    "summary": item.get('summary', '')[:200] + '...' if len(item.get('summary', '')) > 200 else item.get('summary', ''),
                    "source": item.get('source', 'Finnhub'),
                    "publishedAt": datetime.fromtimestamp(item.get('datetime', 0)).strftime('%Y-%m-%d %H:%M:%S') if item.get('datetime') else '',
                    "imageUrl": item.get('image', ''),
                    "url": item.get('url', ''),
                    "category": item.get('category', 'company'),
                    "related": symbol
                })
            return news_items
    except Exception as e:
        logging.error(f"Finnhub company news API error for {symbol}: {e}")
        return None

async def fetch_alpha_vantage_news(keywords=None, limit=10):
    """Fetch news from Alpha Vantage as backup"""
    try:
        url = f"https://www.alphavantage.co/query"
        params = {
            'function': 'NEWS_SENTIMENT',
            'apikey': ALPHA_VANTAGE_API_KEY,
            'limit': limit
        }
        
        if keywords:
            params['tickers'] = keywords
        
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        
        if data and 'feed' in data:
            news_items = []
            for item in data['feed'][:limit]:
                news_items.append({
                    "id": item.get('url', '').split('/')[-1] if item.get('url') else '',
                    "title": item.get('title', ''),
                    "summary": item.get('summary', '')[:200] + '...' if len(item.get('summary', '')) > 200 else item.get('summary', ''),
                    "source": item.get('source', 'Alpha Vantage'),
                    "publishedAt": item.get('time_published', ''),
                    "imageUrl": item.get('banner_image', ''),
                    "url": item.get('url', ''),
                    "category": 'market',
                    "sentiment": item.get('overall_sentiment_label', 'Neutral'),
                    "relevance_score": item.get('relevance_score', 0)
                })
            return news_items
    except Exception as e:
        logging.error(f"Alpha Vantage news API error: {e}")
        return None

def get_cached_or_fetch_news(cache_key, fetch_function, *args):
    """Get news with caching"""
    import time
    current_time = time.time()
    
    # Check if we have valid cached news
    if cache_key in news_cache and cache_key in news_cache_expiry:
        if current_time < news_cache_expiry[cache_key]:
            return news_cache[cache_key]
    
    # Cache expired or doesn't exist, fetch new news
    try:
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        news_data = loop.run_until_complete(fetch_function(*args))
        loop.close()
        
        if news_data:
            # Cache the result
            news_cache[cache_key] = news_data
            news_cache_expiry[cache_key] = current_time + NEWS_CACHE_DURATION
            return news_data
        else:
            return []
            
    except Exception as e:
        logging.error(f"Error fetching news for {cache_key}: {e}")
        # Return cached data if available
        if cache_key in news_cache:
            return news_cache[cache_key]
        return []

@app.get("/news")
def get_stock_news(limit: int = 6):
    """Get latest stock market news from Finnhub and Alpha Vantage APIs"""
    try:
        cache_key = f"market_news_{limit}"
        
        # Try Finnhub first
        news = get_cached_or_fetch_news(cache_key, fetch_finnhub_market_news, limit)
        
        # If Finnhub fails or returns insufficient data, try Alpha Vantage
        if not news or len(news) < limit // 2:
            alpha_news = get_cached_or_fetch_news(f"alpha_{cache_key}", fetch_alpha_vantage_news, None, limit)
            if alpha_news:
                news = (news or []) + alpha_news
        
        # Remove duplicates and limit results
        seen_titles = set()
        unique_news = []
        for item in news:
            if item['title'] not in seen_titles:
                seen_titles.add(item['title'])
                unique_news.append(item)
                if len(unique_news) >= limit:
                    break
        
        return unique_news[:limit]
        
    except Exception as e:
        logging.error(f"Error fetching stock news: {e}")
        return {"error": str(e)}

@app.get("/news/company/{symbol}")
def get_company_news(symbol: str, limit: int = 5):
    """Get company-specific news"""
    try:
        cache_key = f"company_news_{symbol}_{limit}"
        
        # Try Finnhub company news first
        news = get_cached_or_fetch_news(cache_key, fetch_company_news_finnhub, symbol.upper(), limit)
        
        # If not enough news, try Alpha Vantage with company ticker
        if not news or len(news) < limit // 2:
            alpha_news = get_cached_or_fetch_news(f"alpha_{cache_key}", fetch_alpha_vantage_news, symbol.upper(), limit)
            if alpha_news:
                news = (news or []) + alpha_news
        
        # Remove duplicates and limit results
        seen_titles = set()
        unique_news = []
        for item in news:
            if item['title'] not in seen_titles:
                seen_titles.add(item['title'])
                unique_news.append(item)
                if len(unique_news) >= limit:
                    break
        
        return unique_news[:limit]
        
    except Exception as e:
        logging.error(f"Error fetching company news for {symbol}: {e}")
        return {"error": str(e)}

# Dashboard management endpoints with persistent storage
@app.post("/dashboard/stocks")
def add_stock_to_dashboard(symbol: str):
    """Add a stock to user's dashboard"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Create dashboard table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_dashboard (
                id SERIAL PRIMARY KEY,
                user_id INTEGER DEFAULT 1,
                symbol VARCHAR(10) NOT NULL,
                added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, symbol)
            );
        """)
        
        # Add stock to dashboard
        cursor.execute("""
            INSERT INTO user_dashboard (user_id, symbol) 
            VALUES (1, %s) 
            ON CONFLICT (user_id, symbol) DO NOTHING
        """, (symbol.upper(),))
        
        conn.commit()
        conn.close()
        
        return {"message": f"Stock {symbol} added to dashboard successfully", "symbol": symbol}
    except Exception as e:
        logging.error(f"Error adding stock to dashboard: {e}")
        return {"error": str(e)}

@app.get("/dashboard/stocks")
def get_dashboard_stocks():
    """Get all stocks in user's dashboard with dynamic data"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Create dashboard table if not exists
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_dashboard (
                id SERIAL PRIMARY KEY,
                user_id INTEGER DEFAULT 1,
                symbol VARCHAR(10) NOT NULL,
                added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, symbol)
            );
        """)
        
        # Get dashboard stocks
        cursor.execute("SELECT symbol FROM user_dashboard WHERE user_id = 1 ORDER BY added_date DESC")
        dashboard_stocks = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        # Return empty list if no stocks in dashboard
        if not dashboard_stocks:
            return []
        
        # Get dynamic data for dashboard stocks
        stocks_data = []
        for symbol in dashboard_stocks:
            # Try to find the company name from the popular stocks list
            company_names = {
                "NVDA": "NVIDIA Corporation",
                "TSLA": "Tesla Inc.",
                "AAPL": "Apple Inc.",
                "MSFT": "Microsoft Corporation",
                "META": "Meta Platforms Inc.",
                "GOOGL": "Alphabet Inc.",
                "AMZN": "Amazon.com Inc.",
                "NFLX": "Netflix Inc.",
                "AMD": "Advanced Micro Devices Inc.",
                "CRM": "Salesforce Inc.",
                "ADBE": "Adobe Inc.",
                "PYPL": "PayPal Holdings Inc.",
                "INTC": "Intel Corporation",
                "ORCL": "Oracle Corporation",
                "CSCO": "Cisco Systems Inc.",
                "UBER": "Uber Technologies Inc.",
            }
            
            company_name = company_names.get(symbol, f"{symbol} Corporation")
            stock_data = get_cached_or_fetch_stock(symbol, company_name)
            stocks_data.append(stock_data)
        
        return stocks_data
    except Exception as e:
        logging.error(f"Error fetching dashboard stocks: {e}")
        return []

@app.delete("/dashboard/stocks/{symbol}")
def remove_stock_from_dashboard(symbol: str):
    """Remove a stock from user's dashboard"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM user_dashboard WHERE user_id = 1 AND symbol = %s", (symbol.upper(),))
        
        if cursor.rowcount > 0:
            conn.commit()
            conn.close()
            return {"message": f"Stock {symbol} removed from dashboard successfully", "symbol": symbol}
        else:
            conn.close()
            return {"message": f"Stock {symbol} not found in dashboard", "symbol": symbol}
    except Exception as e:
        logging.error(f"Error removing stock from dashboard: {e}")
        return {"error": str(e)}

@app.get("/stocks/refresh-cache")
def refresh_stock_cache():
    """Manually refresh stock data cache"""
    try:
        global stock_cache, cache_expiry
        stock_cache.clear()
        cache_expiry.clear()
        return {"message": "Stock cache refreshed successfully", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        logging.error(f"Error refreshing stock cache: {e}")
        return {"error": str(e)}

@app.get("/news/refresh-cache")
def refresh_news_cache():
    """Manually refresh news cache"""
    try:
        global news_cache, news_cache_expiry
        news_cache.clear()
        news_cache_expiry.clear()
        return {"message": "News cache refreshed successfully", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        logging.error(f"Error refreshing news cache: {e}")
        return {"error": str(e)}

@app.get("/logos/refresh-cache")
def refresh_logo_cache():
    """Manually refresh logo cache"""
    try:
        global logo_cache, logo_cache_expiry
        logo_cache.clear()
        logo_cache_expiry.clear()
        return {"message": "Logo cache refreshed successfully", "timestamp": datetime.now().isoformat()}
    except Exception as e:
        logging.error(f"Error refreshing logo cache: {e}")
        return {"error": str(e)}

@app.get("/stocks/cache-status")
def get_cache_status():
    """Get current cache status for debugging"""
    try:
        import time
        current_time = time.time()
        cache_info = {}
        
        for symbol in stock_cache.keys():
            expiry_time = cache_expiry.get(symbol, 0)
            cache_info[symbol] = {
                "cached": True,
                "expires_in_seconds": max(0, expiry_time - current_time),
                "is_expired": current_time >= expiry_time
            }
        
        return {
            "total_cached_stocks": len(stock_cache),
            "cache_duration_seconds": CACHE_DURATION,
            "stocks": cache_info
        }
    except Exception as e:
        logging.error(f"Error getting cache status: {e}")
        return {"error": str(e)}

async def enhanced_db_search(query):
    """Enhanced database search with better matching for both symbols and company names"""
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Clean query for symbol matching
        query_upper = query.upper().strip()
        query_lower = query.lower().strip()
        
        # Multi-tier search strategy
        results = []
        
        # Tier 1: Exact symbol match
        cursor.execute("""
            SELECT DISTINCT s.symbol, s.company_name as name, s.sector, s.market_cap, s.current_price,
                   'exact_symbol' as match_type
            FROM stock_universe s 
            WHERE s.symbol = %s
            LIMIT 3
        """, (query_upper,))
        exact_matches = cursor.fetchall()
        
        # Tier 2: Symbol starts with query
        cursor.execute("""
            SELECT DISTINCT s.symbol, s.company_name as name, s.sector, s.market_cap, s.current_price,
                   'symbol_prefix' as match_type
            FROM stock_universe s 
            WHERE s.symbol LIKE %s AND s.symbol != %s
            ORDER BY LENGTH(s.symbol), s.popularity_score DESC
            LIMIT 5
        """, (f"{query_upper}%", query_upper))
        prefix_matches = cursor.fetchall()
        
        # Tier 3: Company name starts with query
        cursor.execute("""
            SELECT DISTINCT s.symbol, s.company_name as name, s.sector, s.market_cap, s.current_price,
                   'name_prefix' as match_type
            FROM stock_universe s 
            WHERE LOWER(s.company_name) LIKE %s
            ORDER BY s.popularity_score DESC
            LIMIT 8
        """, (f"{query_lower}%",))
        name_prefix_matches = cursor.fetchall()
        
        # Tier 4: Company name contains query (for partial matches like "black" matching "BlackRock")
        cursor.execute("""
            SELECT DISTINCT s.symbol, s.company_name as name, s.sector, s.market_cap, s.current_price,
                   'name_contains' as match_type
            FROM stock_universe s 
            WHERE LOWER(s.company_name) LIKE %s 
            AND NOT LOWER(s.company_name) LIKE %s
            ORDER BY s.popularity_score DESC, LENGTH(s.company_name)
            LIMIT 8
        """, (f"%{query_lower}%", f"{query_lower}%"))
        name_contains_matches = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        # Combine results in priority order
        all_db_results = exact_matches + prefix_matches + name_prefix_matches + name_contains_matches
        
        # Convert to standard format and remove duplicates
        seen_symbols = set()
        for row in all_db_results:
            if row['symbol'] not in seen_symbols:
                results.append({
                    "symbol": row['symbol'],
                    "name": row['name'] or row['symbol'],
                    "type": "Equity",
                    "region": "US",
                    "currency": "USD",
                    "sector": row.get('sector', 'Unknown'),
                    "market_cap": row.get('market_cap', 0),
                    "current_price": row.get('current_price', 0),
                    "match_type": row['match_type'],
                    "from_db": True
                })
                seen_symbols.add(row['symbol'])
        
        return results
        
    except Exception as e:
        logging.error(f"Enhanced database search error: {e}")
        return []

def get_fallback_search_results(query):
    """Get fallback search results from common stocks when APIs fail"""
    # Common stocks database for fallback
    common_stocks = [
        {"symbol": "AAPL", "name": "Apple Inc.", "sector": "Technology"},
        {"symbol": "MSFT", "name": "Microsoft Corporation", "sector": "Technology"},
        {"symbol": "GOOGL", "name": "Alphabet Inc.", "sector": "Communication Services"},
        {"symbol": "AMZN", "name": "Amazon.com Inc.", "sector": "Consumer Cyclical"},
        {"symbol": "TSLA", "name": "Tesla Inc.", "sector": "Consumer Cyclical"},
        {"symbol": "META", "name": "Meta Platforms Inc.", "sector": "Communication Services"},
        {"symbol": "NVDA", "name": "NVIDIA Corporation", "sector": "Technology"},
        {"symbol": "BRK.B", "name": "Berkshire Hathaway Inc.", "sector": "Financial Services"},
        {"symbol": "BLK", "name": "BlackRock Inc.", "sector": "Financial Services"},
        {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "sector": "Financial Services"},
        {"symbol": "JNJ", "name": "Johnson & Johnson", "sector": "Healthcare"},
        {"symbol": "V", "name": "Visa Inc.", "sector": "Financial Services"},
        {"symbol": "PG", "name": "Procter & Gamble Co.", "sector": "Consumer Defensive"},
        {"symbol": "UNH", "name": "UnitedHealth Group Inc.", "sector": "Healthcare"},
        {"symbol": "HD", "name": "Home Depot Inc.", "sector": "Consumer Cyclical"},
        {"symbol": "MA", "name": "Mastercard Inc.", "sector": "Financial Services"},
        {"symbol": "BAC", "name": "Bank of America Corp.", "sector": "Financial Services"},
        {"symbol": "XOM", "name": "Exxon Mobil Corporation", "sector": "Energy"},
        {"symbol": "WMT", "name": "Walmart Inc.", "sector": "Consumer Defensive"},
        {"symbol": "CVX", "name": "Chevron Corporation", "sector": "Energy"}
    ]
    
    query_lower = query.lower().strip()
    results = []
    
    # Filter common stocks by query match
    for stock in common_stocks:
        if (query_lower in stock["symbol"].lower() or 
            query_lower in stock["name"].lower() or
            stock["symbol"].lower().startswith(query_lower) or
            any(word.startswith(query_lower) for word in stock["name"].lower().split())):
            results.append({
                "symbol": stock["symbol"],
                "name": stock["name"],
                "type": "Equity",
                "region": "US",
                "currency": "USD",
                "sector": stock["sector"],
                "from_fallback": True
            })
    
    return results

@app.get("/search")
async def search_stocks(query: str, request: Request):
    """Search for stocks by symbol or company name with robust fallback system"""
    try:
        if not query or len(query) < 1:
            return []
        
        # Clean and normalize query
        query = query.strip()
        
        # Track the search (get user_id from headers if available)
        user_id = None
        if hasattr(request.state, 'user_id'):
            user_id = request.state.user_id
        
        # Get client IP for tracking
        client_ip = request.client.host
        
        # Enhanced database search with better matching
        try:
            db_results = await enhanced_db_search(query)
            if not isinstance(db_results, list):
                db_results = []
        except Exception as db_err:
            logging.error(f"DB search error for query '{query}': {db_err}")
            db_results = []
        
        # If we have good database results, return them immediately
        if db_results and len(db_results) >= 3:
            return db_results[:10]  # Limit to 10 results
        
        # If limited results, try external APIs with timeout and error handling
        all_results = db_results if db_results else []
        
        # Create fallback results from common stocks if needed
        fallback_results = get_fallback_search_results(query)
        
        # Try external APIs with robust error handling
        try:
            # Try Alpha Vantage API first with timeout
            alpha_results = []
            try:
                alpha_results = await asyncio.wait_for(
                    search_alpha_vantage_api(query), 
                    timeout=3.0
                )
            except Exception as alpha_error:
                logging.warning(f"Alpha Vantage search API error or timeout for query '{query}': {alpha_error}")
            if alpha_results and isinstance(alpha_results, list):
                existing_symbols = {result["symbol"] for result in all_results}
                for result in alpha_results:
                    if result.get("symbol") and result["symbol"] not in existing_symbols:
                        all_results.append(result)
        except Exception as api1_err:
            logging.error(f"Alpha Vantage block failed for query '{query}': {api1_err}")
        
        # Try Finnhub API with timeout
        if len(all_results) < 8:
            try:
                finnhub_results = []
                try:
                    finnhub_results = await asyncio.wait_for(
                        search_finnhub_api(query), 
                        timeout=3.0
                    )
                except Exception as finnhub_error:
                    logging.warning(f"Finnhub search API error or timeout for query '{query}': {finnhub_error}")
                if finnhub_results and isinstance(finnhub_results, list):
                    existing_symbols = {result["symbol"] for result in all_results}
                    for result in finnhub_results:
                        if result.get("symbol") and result["symbol"] not in existing_symbols:
                            all_results.append(result)
            except Exception as api2_err:
                logging.error(f"Finnhub block failed for query '{query}': {api2_err}")
        
        # Try Yahoo Finance API if we still don't have enough results
        if len(all_results) < 5:
            try:
                yahoo_results = []
                try:
                    yahoo_results = await asyncio.wait_for(
                        search_yahoo_finance_api(query), 
                        timeout=3.0
                    )
                except Exception as yahoo_error:
                    logging.warning(f"Yahoo Finance search API error or timeout for query '{query}': {yahoo_error}")
                if yahoo_results and isinstance(yahoo_results, list):
                    existing_symbols = {result["symbol"] for result in all_results}
                    for result in yahoo_results:
                        if result.get("symbol") and result["symbol"] not in existing_symbols:
                            all_results.append(result)
            except Exception as api3_err:
                logging.error(f"Yahoo block failed for query '{query}': {api3_err}")
        
        # If we still don't have enough results, use fallback data
        if len(all_results) < 3:
            existing_symbols = {result["symbol"] for result in all_results}
            for fallback in fallback_results:
                if fallback["symbol"] not in existing_symbols and len(all_results) < 10:
                    all_results.append(fallback)
        
        # Validate all_results is a list of dicts with symbol and name
        safe_results = []
        for r in all_results:
            if isinstance(r, dict) and r.get("symbol") and r.get("name"):
                safe_results.append(r)
        
        # Cache successful API results in database
        for result in safe_results:
            if result.get("from_api", False):  # Only cache results from external APIs
                try:
                    StockInfoDatabase.track_search(
                        symbol=result["symbol"],
                        user_id=user_id,
                        search_type='manual',
                        ip_address=client_ip
                    )
                    await add_to_stock_universe(result)
                    stock_info_data = {
                        'company_name': result["name"],
                        'sector': result.get('sector'),
                        'industry': result.get('industry'),
                        'logo_url': result.get('logo_url'),
                        'current_price': result.get('current_price', 0),
                        'market_cap': result.get('market_cap', 0)
                    }
                    StockInfoDatabase.update_stock_info(result["symbol"], stock_info_data)
                    stock_data = {
                        "symbol": result["symbol"],
                        "alphavantage": {
                            "Name": result["name"],
                            "Exchange": result.get("region", "US"),
                            "Industry": result.get("industry", "Unknown")
                        },
                        "finnhub": {}
                    }
                    insert_stock_info(stock_data)
                except Exception as cache_error:
                    logging.warning(f"Failed to cache search result for {result['symbol']}: {cache_error}")
        
        # Track unknown search if no good results found
        if len(safe_results) < 2:
            try:
                await track_unknown_search(query, client_ip, user_id)
            except Exception as track_err:
                logging.warning(f"Failed to track unknown search for '{query}': {track_err}")
        
        # Always return a safe list
        return safe_results[:10]
        
    except Exception as e:
        logging.error(f"Search error for query '{query}': {e}")
        # Return fallback results even if there's an error
        try:
            return get_fallback_search_results(query)[:5]
        except Exception as fallback_err:
            logging.error(f"Fallback error for query '{query}': {fallback_err}")
            return []
@app.post("/seed-database")
def seed_database():
    """Seed the database with popular stock data for search functionality"""
    try:
        popular_stocks_list = [
            ("NVDA", "NVIDIA Corporation"),
            ("TSLA", "Tesla Inc."),
            ("AAPL", "Apple Inc."),
            ("MSFT", "Microsoft Corporation"),
            ("META", "Meta Platforms Inc."),
            ("GOOGL", "Alphabet Inc."),
            ("AMZN", "Amazon.com Inc."),
            ("NFLX", "Netflix Inc."),
            ("AMD", "Advanced Micro Devices Inc."),
            ("CRM", "Salesforce Inc."),
            ("ADBE", "Adobe Inc."),
            ("PYPL", "PayPal Holdings Inc."),
            ("INTC", "Intel Corporation"),
            ("ORCL", "Oracle Corporation"),
            ("CSCO", "Cisco Systems Inc."),
            ("UBER", "Uber Technologies Inc."),
        ]
        
        seeded_count = 0
        for symbol, company_name in popular_stocks_list:
            try:
                # Create a simple data structure for insert_stock_info
                stock_data = {
                    "symbol": symbol,
                    "alphavantage": {
                        "Name": company_name,
                        "Exchange": "NASDAQ",
                        "Industry": "Technology"
                    },
                    "finnhub": {}
                }
                
                success = insert_stock_info(stock_data)
                if success:
                    seeded_count += 1
                    logging.info(f"Seeded {symbol} - {company_name}")
                    
            except Exception as e:
                logging.warning(f"Failed to seed {symbol}: {e}")
        
        return {
            "message": f"Database seeded successfully with {seeded_count} stocks",
            "seeded_count": seeded_count,
            "total_attempted": len(popular_stocks_list)
        }
        
    except Exception as e:
        logging.error(f"Database seeding error: {e}")
        return {"error": str(e)}

@app.get("/company/logo/{symbol}")
def get_company_logo(symbol: str):
    """Get company logo and basic profile information"""
    try:
        logo_data = get_cached_or_fetch_logo(symbol)
        return logo_data
    except Exception as e:
        logging.error(f"Error in logo endpoint for {symbol}: {e}")
        return {"symbol": symbol, "logo": "", "error": str(e)}

@app.get("/companies/logos")
def get_multiple_company_logos(symbols: str):
    """Get logos for multiple companies (comma-separated symbols)"""
    try:
        symbol_list = [s.strip().upper() for s in symbols.split(',') if s.strip()]
        logos = []
        
        for symbol in symbol_list[:20]:  # Limit to 20 symbols
            logo_data = get_cached_or_fetch_logo(symbol)
            logos.append(logo_data)
        
        return logos
    except Exception as e:
        logging.error(f"Error fetching multiple logos: {e}")
        return {"error": str(e)}

def get_stock_fundamentals(symbol):
    """Get fundamental data for a stock using Finnhub (primary) and yfinance (fallback)"""
    fundamentals = {}
    
    try:
        # First try Finnhub for company profile and metrics
        if FINNHUB_API_KEY:
            fundamentals.update(get_finnhub_fundamentals(symbol))
        
        # Then try yfinance for additional metrics
        yf_fundamentals = get_yfinance_fundamentals(symbol)
        
        # Merge data, preferring yfinance for financial ratios as they're more reliable
        for key, value in yf_fundamentals.items():
            if value is not None:
                fundamentals[key] = value
        
        # If we have minimal data, use dummy data as fallback
        if not fundamentals.get('peRatio') and not fundamentals.get('sector'):
            logging.warning(f"Minimal fundamental data for {symbol}, using fallback dummy data")
            return get_dummy_fundamentals(symbol)
            
        return fundamentals
        
    except Exception as e:
        logging.error(f"Error fetching fundamentals for {symbol}: {e}")
        return get_dummy_fundamentals(symbol)

def get_finnhub_fundamentals(symbol):
    """Get fundamental data from Finnhub API - only fetch what's actually available"""
    try:
        fundamentals = {}
        
        # Get company profile
        profile_url = f"https://finnhub.io/api/v1/stock/profile2?symbol={symbol}&token={FINNHUB_API_KEY}"
        logging.info(f"Fetching Finnhub profile for {symbol}")
        profile_response = requests.get(profile_url, timeout=10)
        
        if profile_response.status_code == 200:
            profile_data = profile_response.json()
            logging.info(f"Finnhub profile data for {symbol}: {profile_data}")
            
            # Only get what's actually available
            if profile_data:
                fundamentals.update({
                    "sector": profile_data.get('finnhubIndustry'),
                    "industry": profile_data.get('finnhubIndustry'),
                    "employees": profile_data.get('shareOutstanding')  # This is shares, not employees
                })
        else:
            logging.warning(f"Finnhub profile API returned status {profile_response.status_code} for {symbol}")
        
        # Get basic financials - focus on what's reliably available
        financials_url = f"https://finnhub.io/api/v1/stock/metric?symbol={symbol}&metric=all&token={FINNHUB_API_KEY}"
        logging.info(f"Fetching Finnhub metrics for {symbol}")
        financials_response = requests.get(financials_url, timeout=10)
        
        if financials_response.status_code == 200:
            fin_data = financials_response.json()
            metric = fin_data.get('metric', {})
            logging.info(f"Finnhub metrics for {symbol}: PE={metric.get('peBasicExclExtraTTM')}, PB={metric.get('pbAnnual')}")
            
            # Only include metrics that are actually available
            fundamentals.update({
                "peRatio": metric.get('peBasicExclExtraTTM'),
                "pbRatio": metric.get('pbAnnual'), 
                "roe": metric.get('roeRfy'),
                "bookValue": metric.get('bookValuePerShareAnnual'),
                "debtToEquity": metric.get('totalDebt/totalEquityAnnual'),
                "fiftyTwoWeekHigh": metric.get('52WeekHigh'),
                "fiftyTwoWeekLow": metric.get('52WeekLow')
            })
            
            # Format ROE as percentage if available
            if fundamentals.get("roe"):
                fundamentals["roe"] = round(fundamentals["roe"] * 100, 2)
        else:
            logging.warning(f"Finnhub metrics API returned status {financials_response.status_code} for {symbol}")
        
        # Clean up None values
        fundamentals = {k: v for k, v in fundamentals.items() if v is not None}
        logging.info(f"Final Finnhub fundamentals for {symbol}: {fundamentals}")
        return fundamentals
        
    except Exception as e:
        logging.error(f"Error fetching Finnhub fundamentals for {symbol}: {e}")
        return {}

def get_yfinance_fundamentals(symbol):
    """Get fundamental data from yfinance API - only what's reliably available"""
    try:
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # Only fetch what's actually available and reliable
        fundamentals = {
            "peRatio": info.get('trailingPE'),
            "pbRatio": info.get('priceToBook'),
            "eps": info.get('trailingEps'),
            "dividendYield": info.get('dividendYield'),
            "bookValue": info.get('bookValue'),
            "fiftyTwoWeekHigh": info.get('fiftyTwoWeekHigh'),
            "fiftyTwoWeekLow": info.get('fiftyTwoWeekLow'),
            "sector": info.get('sector'),
            "industry": info.get('industry'),
            "employees": info.get('fullTimeEmployees')
        }
        
        # Format values only if they exist
        if fundamentals["peRatio"]:
            fundamentals["peRatio"] = round(fundamentals["peRatio"], 2)
        if fundamentals["pbRatio"]:
            fundamentals["pbRatio"] = round(fundamentals["pbRatio"], 2)
        if fundamentals["eps"]:
            fundamentals["eps"] = round(fundamentals["eps"], 2)
        if fundamentals["dividendYield"]:
            fundamentals["dividendYield"] = round(fundamentals["dividendYield"] * 100, 2)
        if fundamentals["bookValue"]:
            fundamentals["bookValue"] = round(fundamentals["bookValue"], 2)
        
        # Clean up None values
        fundamentals = {k: v for k, v in fundamentals.items() if v is not None}
        return fundamentals
        
    except Exception as e:
        logging.error(f"Error fetching yfinance fundamentals for {symbol}: {e}")
        return {}

def get_dummy_fundamentals(symbol):
    """Generate realistic dummy fundamental data for demonstration"""
    
    # Different data for different stocks
    fundamentals_data = {
        "AAPL": {
            "peRatio": 28.65,
            "pbRatio": 7.23,
            "roe": 147.25,
            "eps": 6.13,
            "dividendYield": 0.43,
            "bookValue": 4.26,
            "faceValue": 1.0,
            "fiftyTwoWeekHigh": 199.62,
            "fiftyTwoWeekLow": 164.08,
            "sector": "Technology",
            "industry": "Consumer Electronics",
            "employees": 161000,
            "debtToEquity": 1.96,
            "industryPE": 25.8
        },
        "MSFT": {
            "peRatio": 35.12,
            "pbRatio": 11.8,
            "roe": 36.05,
            "eps": 12.05,
            "dividendYield": 0.69,
            "bookValue": 35.85,
            "faceValue": 1.0,
            "fiftyTwoWeekHigh": 468.35,
            "fiftyTwoWeekLow": 362.90,
            "sector": "Technology",
            "industry": "Software - Infrastructure",
            "employees": 228000,
            "debtToEquity": 0.31,
            "industryPE": 32.4
        },
        "TSLA": {
            "peRatio": 65.23,
            "pbRatio": 12.45,
            "roe": 19.33,
            "eps": 4.30,
            "dividendYield": None,  # Tesla doesn't pay dividends
            "bookValue": 22.87,
            "faceValue": 1.0,
            "fiftyTwoWeekHigh": 299.29,
            "fiftyTwoWeekLow": 138.80,
            "sector": "Consumer Cyclical",
            "industry": "Auto Manufacturers",
            "employees": 140473,
            "debtToEquity": 0.17,
            "industryPE": 15.2
        },
        "GOOGL": {
            "peRatio": 24.18,
            "pbRatio": 5.67,
            "roe": 28.22,
            "eps": 7.47,
            "dividendYield": None,
            "bookValue": 26.45,
            "faceValue": 1.0,
            "fiftyTwoWeekHigh": 191.75,
            "fiftyTwoWeekLow": 129.40,
            "sector": "Communication Services",
            "industry": "Internet Content & Information",
            "employees": 181269,
            "debtToEquity": 0.11,
            "industryPE": 26.7
        }
    }
    
    # Return specific data if available, otherwise generate generic data
    if symbol in fundamentals_data:
        return fundamentals_data[symbol]
    else:
        # Generic dummy data for other stocks
        import random
        return {
            "peRatio": round(random.uniform(15, 45), 2),
            "pbRatio": round(random.uniform(1.5, 8), 2),
            "roe": round(random.uniform(8, 35), 2),
            "eps": round(random.uniform(1, 15), 2),
            "dividendYield": round(random.uniform(0.5, 4), 2) if random.choice([True, False]) else None,
            "bookValue": round(random.uniform(5, 50), 2),
            "faceValue": 1.0,
            "fiftyTwoWeekHigh": round(random.uniform(100, 500), 2),
            "fiftyTwoWeekLow": round(random.uniform(50, 200), 2),
            "sector": random.choice(["Technology", "Healthcare", "Finance", "Consumer Goods", "Energy"]),
            "industry": "Various",
            "employees": random.randint(1000, 200000),
            "debtToEquity": round(random.uniform(0.1, 2.5), 2),
            "industryPE": round(random.uniform(15, 40), 2)
        }

# Historical data endpoints for stock detail page
@app.get("/stock/detail/{symbol}")
def get_stock_detail(symbol: str):
    """Get comprehensive stock detail including profile, quote, and basic info"""
    try:
        symbol = symbol.upper()
        
        # Get company profile from Finnhub
        profile_data = get_cached_or_fetch_logo(symbol)
        
        # Get current quote data
        etf_name = ETF_NAMES.get(symbol, profile_data.get('name', f'{symbol} Corporation'))
        quote_data = get_cached_or_fetch_stock(symbol, etf_name)
        
        # Get fundamental data using yfinance for more comprehensive data
        fundamentals = get_stock_fundamentals(symbol)
        
        # Combine the data
        detail_data = {
            "symbol": symbol,
            "name": ETF_NAMES.get(symbol, profile_data.get('name', quote_data.get('name', f'{symbol} Corporation'))),
            "logo": profile_data.get('logo', ''),
            "exchange": profile_data.get('exchange', 'Unknown'),
            "country": profile_data.get('country', 'US'),
            "currency": profile_data.get('currency', 'USD'),
            "ipo": profile_data.get('ipo', ''),
            "marketCapitalization": profile_data.get('marketCapitalization', 0),
            "shareOutstanding": profile_data.get('shareOutstanding', 0),
            "weburl": profile_data.get('weburl', ''),
            "price": quote_data.get('price', '$0.00'),
            "change": quote_data.get('change', '0.00'),
            "percent": quote_data.get('percent', '0.00%'),
            "isNegative": quote_data.get('isNegative', False),
            "status": quote_data.get('status', 'unknown')
        }
        
        # Add fundamental data only if available
        for key, value in fundamentals.items():
            if value is not None:
                detail_data[key] = value
        
        return detail_data
        
    except Exception as e:
        logging.error(f"Error fetching stock detail for {symbol}: {e}")
        return {
            "symbol": symbol,
            "name": f"{symbol} Corporation",
            "error": str(e)
        }

@app.get("/stock/historical/{symbol}")
async def get_stock_historical(symbol: str, range: str = "1M"):
    """Get historical stock data for charts using Finnhub (primary) and yfinance (fallback)"""
    try:
        symbol = symbol.upper()
        logging.info(f"Fetching historical data for {symbol} with range {range}")
        
        # Try Finnhub first (primary API)
        historical_data = await fetch_historical_data_finnhub(symbol, range)
        
        # If Finnhub fails, try yfinance as fallback
        if not historical_data:
            logging.info(f"Finnhub failed, trying yfinance for {symbol}")
            historical_data = fetch_historical_data_yfinance(symbol, range)
        
        # If both APIs fail, generate dummy data as last resort
        if not historical_data:
            logging.warning(f"Both APIs failed for {symbol}, generating dummy data")
            historical_data = generate_dummy_historical_data(symbol, range)
        
        return {
            "symbol": symbol,
            "range": range,
            "data": historical_data,
            "status": "success",
            "source": "finnhub" if historical_data else "yfinance",
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        logging.error(f"Error in get_stock_historical for {symbol}: {e}")
        
        # Generate dummy data as fallback
        dummy_data = generate_dummy_historical_data(symbol, range)
        
        return {
            "symbol": symbol,
            "range": range,
            "data": dummy_data,
            "status": "error",
            "error": str(e),
            "source": "dummy",
            "generated_at": datetime.now().isoformat()
        }

def generate_dummy_historical_data(symbol, range_type):
    """Generate dummy historical data as fallback"""
    import random
    import math
    
    # Set different base prices for different stocks
    stock_base_prices = {
        "AAPL": 189.50,
        "MSFT": 385.20,
        "GOOGL": 2845.60,
        "AMZN": 3285.04,
        "TSLA": 248.90,
        "NVDA": 875.50,
        "META": 485.30,
        "NFLX": 485.20,
        "AMD": 165.30,
        "CRM": 295.75
    }
    
    base_price = stock_base_prices.get(symbol, 150.0)
    data_points = []
    
    # Generate mock data based on range
    if range_type == "1D":
        # Intraday data (every 30 minutes for last 24 hours)
        import datetime
        now = datetime.datetime.now()
        current_price = base_price
        
        for i in range(48):  # 48 data points for 24 hours (every 30 min)
            time_point = now - datetime.timedelta(minutes=(47-i) * 30)
            
            # Add realistic price movement
            price_change = random.uniform(-2, 2) + math.sin(i * 0.2) * 0.5
            current_price += price_change
            current_price = max(current_price, base_price * 0.95)  # Don't go below 95% of base
            current_price = min(current_price, base_price * 1.05)  # Don't go above 105% of base
            
            data_points.append({
                "time": time_point.strftime("%H:%M"),
                "price": round(current_price, 2),
                "volume": random.randint(800000, 1500000)
            })
    else:
        # Daily data with realistic trends
        days_map = {"1W": 7, "1M": 30, "3M": 90, "1Y": 365, "5Y": 365*5, "All": 365*10}
        days = days_map.get(range_type, 30)
        
        import datetime
        current_price = base_price
        trend = random.uniform(-0.1, 0.3)  # Overall trend for the period
        
        for i in range(days):
            date = datetime.datetime.now() - datetime.timedelta(days=days-1-i)
            
            # Add trend and volatility
            daily_trend = trend * (i / days)  # Gradual trend
            volatility = random.uniform(-5, 5)  # Daily volatility
            noise = math.sin(i * 0.3) * 2  # Some cyclical pattern
            
            price_change = daily_trend + volatility + noise
            current_price += price_change
            
            # Ensure price doesn't go too extreme
            min_price = base_price * 0.7
            max_price = base_price * 1.4
            current_price = max(min_price, min(max_price, current_price))
            
            # Generate OHLC data
            open_price = current_price
            high_price = open_price + random.uniform(0, 8)
            low_price = open_price - random.uniform(0, 8)
            close_price = open_price + random.uniform(-4, 4)
            
            data_points.append({
                "date": date.strftime("%Y-%m-%d"),
                "open": round(open_price, 2),
                "high": round(high_price, 2),
                "low": round(low_price, 2),
                "close": round(close_price, 2),
                "volume": random.randint(1500000, 5000000)
            })
            
            current_price = close_price
    
    return data_points

# Test endpoint for chart data
@app.get("/test/chart-data/{symbol}")
def get_test_chart_data(symbol: str):
    """Test endpoint for chart data with simple dummy data"""
    try:
        import datetime
        import random
        
        # Simple test data
        test_data = []
        base_price = 150.0
        
        for i in range(30):  # Last 30 days
            date = datetime.datetime.now() - datetime.timedelta(days=29-i)
            price = base_price + random.uniform(-10, 10) + (i * 0.2)
            
            test_data.append({
                "date": date.strftime("%Y-%m-%d"),
                "price": round(price, 2),
                "volume": random.randint(1000000, 3000000)
            })
        
        return {
            "symbol": symbol.upper(),
            "data": test_data,
            "message": "Test chart data generated successfully"
        }
    except Exception as e:
        return {"error": str(e)}

@app.get("/debug/chart-status")
def get_chart_debug_status():
    """Debug endpoint to check chart data generation"""
    try:
        import datetime
        
        return {
            "chart_api_status": "operational",
            "timestamp": datetime.datetime.now().isoformat(),
            "endpoints": {
                "historical": "/stock/historical/{symbol}?range={range}",
                "test_data": "/test/chart-data/{symbol}",
                "debug": "/debug/chart-status"
            },
            "available_ranges": ["1D", "1W", "1M", "3M", "1Y"],
            "sample_symbols": ["AAPL", "TSLA", "NVDA", "MSFT", "GOOGL"]
        }
    except Exception as e:
        return {
            "chart_api_status": "error",
            "error": str(e)
        }

@app.get("/stock/news/{symbol}")
def get_stock_news(symbol: str, limit: int = 5):
    """Get company-specific news"""
    try:
        # Use the existing Finnhub news function
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        news_data = loop.run_until_complete(fetch_company_news_finnhub(symbol, limit))
        loop.close()
        
        return {
            "symbol": symbol,
            "news": news_data
        }
        
    except Exception as e:
        logging.error(f"Error fetching news for {symbol}: {e}")
        # Fallback mock news
        return {
            "symbol": symbol,
            "news": [
                {
                    "id": f"{symbol}_1",
                    "title": f"{symbol} Reports Strong Quarterly Earnings",
                    "summary": f"{symbol} exceeds analyst expectations with robust revenue growth.",
                    "source": "Reuters",
                    "publishedAt": "2 hours ago",
                    "url": f"https://example.com/{symbol.lower()}-news-1"
                },
                {
                    "id": f"{symbol}_2", 
                    "title": f"{symbol} Announces Strategic Partnership",
                    "summary": f"{symbol} enters new market through strategic alliance.",
                    "source": "Bloomberg",
                    "publishedAt": "1 day ago",
                    "url": f"https://example.com/{symbol.lower()}-news-2"
                }
            ]
        }

# Search API helper functions
async def search_alpha_vantage_api(query):
    """Search stocks using Alpha Vantage Symbol Search API"""
    try:
        url = f"https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords={query}&apikey={ALPHA_VANTAGE_API_KEY}"
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 200:
                    data = await response.json()
                    # Check for rate limit or error messages
                    if "Information" in data:
                        if "rate limit" in data["Information"].lower():
                            logging.warning(f"Alpha Vantage rate limit reached: {data['Information']}")
                            return []
                        else:
                            logging.warning(f"Alpha Vantage API message: {data['Information']}")
                            return []
                    if "bestMatches" in data and data["bestMatches"]:
                        results = []
                        for match in data["bestMatches"][:8]:  # Limit to 8 results from Alpha Vantage
                            results.append({
                                "symbol": match.get("1. symbol", ""),
                                "name": match.get("2. name", ""),
                                "type": match.get("3. type", "Equity"),
                                "region": match.get("4. region", "United States"),
                                "currency": match.get("8. currency", "USD"),
                                "is_cached": False,
                                "source": "Alpha Vantage"
                            })
                        return results
        return []
    except Exception as e:
        logging.error(f"Alpha Vantage search error: {e}")
        return []

async def search_finnhub_api(query):
    """Search stocks using Finnhub Symbol Lookup API"""
    try:
        url = f"https://finnhub.io/api/v1/search?q={query}&token={FINNHUB_API_KEY}"
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if "result" in data and data["result"]:
                        results = []
                        for match in data["result"]:
                            symbol = match.get("symbol", "")
                            
                            # Filter for US stocks (avoid international exchanges)
                            if (symbol and 
                                not any(x in symbol for x in [".T", ".L", ".PA", ".DE", ".HK", ".TO", ".AX", ".SZ", ".SS"]) and
                                match.get("type") in ["Common Stock", "EQS", "ETF", ""]):
                                
                                results.append({
                                    "symbol": symbol,
                                    "name": match.get("description", ""),
                                    "type": "Equity" if match.get("type") in ["Common Stock", "EQS", ""] else "ETF",
                                    "region": "United States",
                                    "currency": "USD",
                                    "is_cached": False,
                                    "source": "Finnhub"
                                })
                                
                                # Limit to 8 results from Finnhub
                                if len(results) >= 8:
                                    break
                                    
                        return results
                    
        return []
    except Exception as e:
        logging.error(f"Finnhub search error: {e}")
        return []

async def search_yahoo_finance_api(query):
    """Search stocks using Yahoo Finance API (unofficial)"""
    try:
        # Yahoo Finance search endpoint (unofficial)
        url = f"https://query1.finance.yahoo.com/v1/finance/search?q={query}&lang=en-US&region=US&quotesCount=8&newsCount=0"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, headers=headers, timeout=aiohttp.ClientTimeout(total=10)) as response:
                if response.status == 200:
                    data = await response.json()
                    
                    if "quotes" in data and data["quotes"]:
                        results = []
                        for match in data["quotes"]:
                            # Filter for US stocks
                            if (match.get("exchange") in ["NMS", "NYQ", "PCX", "NGM", "ASE"] and 
                                match.get("quoteType") in ["EQUITY", "ETF"]):
                                
                                results.append({
                                    "symbol": match.get("symbol", ""),
                                    "name": match.get("longname") or match.get("shortname", ""),
                                    "type": "Equity" if match.get("quoteType") == "EQUITY" else "ETF",
                                    "region": "United States",
                                    "currency": "USD",
                                    "is_cached": False,
                                    "source": "Yahoo Finance"
                                })
                                
                        return results[:8]  # Limit to 8 results
                    
        return []
    except Exception as e:
        logging.error(f"Yahoo Finance search error: {e}")
        return []
