"""
Stock Universe Database Management
Handles the dynamic stock universe with automatic updates
ACID-Compliant Database Operations
"""
import logging
import os
import sqlite3
import threading
import requests
import yfinance as yf
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from pathlib import Path
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class StockUniverseDatabase:
    """Database management for dynamic stock universe with ACID compliance"""
    
    DB_PATH = Path(__file__).parent / "stock_universe.db"
    
    # Thread lock for database operations
    _lock = threading.Lock()
    
    # API credentials from environment
    FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY")
    ALPHA_VANTAGE_API_KEY = os.getenv("ALPHA_VANTAGE_API_KEY")
    
    @staticmethod
    def classify_market_cap(price: float, shares_out: float) -> str:
        """
        Classify a stock as 'Large Cap', 'Mid Cap', or 'Small Cap' based on market cap arithmetic:
        - Large Cap: M > 10B
        - Mid Cap: 2B ≤ M ≤ 10B
        - Small Cap: 300M ≤ M < 2B
        Where M = price × shares_out
        """
        if not price or not shares_out or price <= 0 or shares_out <= 0:
            return 'Unknown'
        market_cap = price * shares_out
        if market_cap > 10_000_000_000:
            return 'Large Cap'
        elif 2_000_000_000 <= market_cap <= 10_000_000_000:
            return 'Mid Cap'
        elif 300_000_000 <= market_cap < 2_000_000_000:
            return 'Small Cap'
        else:
            return 'Unknown'
    
    @staticmethod
    def get_realtime_price_and_volume(symbol: str):
        """Try Finnhub, then Alpha Vantage, then Yahoo Finance for price/volume."""
        import time
        
        # Finnhub
        try:
            if StockUniverseDatabase.FINNHUB_API_KEY:
                url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={StockUniverseDatabase.FINNHUB_API_KEY}"
                r = requests.get(url, timeout=10)
                if r.status_code == 200:
                    data = r.json()
                    price = data.get('c')
                    volume = data.get('v')
                    if price and price > 0:
                        return float(price), float(volume) if volume else 0
        except Exception as e:
            logger.debug(f"Finnhub failed for {symbol}: {e}")
        
        # Alpha Vantage
        try:
            if StockUniverseDatabase.ALPHA_VANTAGE_API_KEY:
                url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={StockUniverseDatabase.ALPHA_VANTAGE_API_KEY}"
                r = requests.get(url, timeout=15)
                if r.status_code == 200:
                    data = r.json().get('Global Quote', {})
                    price = data.get('05. price')
                    volume = data.get('06. volume')
                    if price and float(price) > 0:
                        return float(price), float(volume) if volume else 0
        except Exception as e:
            logger.debug(f"Alpha Vantage failed for {symbol}: {e}")
        
        # Yahoo Finance
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            price = info.get('regularMarketPrice')
            volume = info.get('regularMarketVolume')
            if price and price > 0:
                return float(price), float(volume) if volume else 0
        except Exception as e:
            logger.debug(f"Yahoo Finance failed for {symbol}: {e}")
        
        return 0, 0
    
    @staticmethod
    @contextmanager
    def get_connection():
        """Thread-safe database connection context manager"""
        with StockUniverseDatabase._lock:
            conn = sqlite3.connect(str(StockUniverseDatabase.DB_PATH))
            conn.row_factory = sqlite3.Row
            try:
                yield conn
            finally:
                conn.close()
    
    @staticmethod
    def initialize_database():
        """Initialize the database with required tables"""
        with StockUniverseDatabase.get_connection() as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS stocks (
                    symbol TEXT PRIMARY KEY,
                    company_name TEXT,
                    exchange TEXT,
                    sector TEXT,
                    industry TEXT,
                    market_cap REAL,
                    shares_outstanding REAL,
                    current_price REAL,
                    volume REAL,
                    price_change REAL,
                    price_change_percent REAL,
                    pe_ratio REAL,
                    dividend_yield REAL,
                    fifty_two_week_high REAL,
                    fifty_two_week_low REAL,
                    beta REAL,
                    last_updated TEXT,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP
                )
            """)
            conn.commit()
            logger.info("Stock universe database initialized")
    
    @staticmethod
    def add_or_update_stock(stock_data: Dict):
        """Add or update a stock with ACID compliance"""
        required_fields = ['symbol', 'current_price', 'volume']
        
        # Validate required fields
        for field in required_fields:
            if field not in stock_data or not stock_data[field]:
                logger.warning(f"Skipping stock {stock_data.get('symbol', 'Unknown')} - missing {field}")
                return False
        
        # Ensure price and volume are positive
        if stock_data['current_price'] <= 0 or stock_data['volume'] < 0:
            logger.warning(f"Skipping stock {stock_data['symbol']} - invalid price or volume")
            return False
        
        try:
            with StockUniverseDatabase.get_connection() as conn:
                # Calculate market cap if we have shares outstanding
                if stock_data.get('shares_outstanding') and stock_data['shares_outstanding'] > 0:
                    stock_data['market_cap'] = stock_data['current_price'] * stock_data['shares_outstanding']
                
                stock_data['last_updated'] = datetime.now().isoformat()
                
                # Insert or update
                conn.execute("""
                    INSERT OR REPLACE INTO stocks (
                        symbol, company_name, exchange, sector, industry,
                        market_cap, shares_outstanding, current_price, volume,
                        price_change, price_change_percent, pe_ratio, dividend_yield,
                        fifty_two_week_high, fifty_two_week_low, beta, last_updated
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    stock_data.get('symbol'),
                    stock_data.get('company_name'),
                    stock_data.get('exchange'),
                    stock_data.get('sector'),
                    stock_data.get('industry'),
                    stock_data.get('market_cap'),
                    stock_data.get('shares_outstanding'),
                    stock_data.get('current_price'),
                    stock_data.get('volume'),
                    stock_data.get('price_change'),
                    stock_data.get('price_change_percent'),
                    stock_data.get('pe_ratio'),
                    stock_data.get('dividend_yield'),
                    stock_data.get('fifty_two_week_high'),
                    stock_data.get('fifty_two_week_low'),
                    stock_data.get('beta'),
                    stock_data.get('last_updated')
                ))
                conn.commit()
                logger.debug(f"Added/updated stock: {stock_data['symbol']}")
                return True
        except Exception as e:
            logger.error(f"Error adding/updating stock {stock_data.get('symbol', 'Unknown')}: {e}")
            return False
    
    @staticmethod
    def get_all_stocks(limit: int = None, offset: int = 0) -> List[Dict]:
        """Get all stocks from database with optional pagination"""
        try:
            with StockUniverseDatabase.get_connection() as conn:
                query = "SELECT * FROM stocks ORDER BY market_cap DESC"
                if limit:
                    query += f" LIMIT {limit} OFFSET {offset}"
                
                cursor = conn.execute(query)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Error fetching stocks: {e}")
            return []
    
    @staticmethod
    def get_stocks_by_market_cap(cap_type: str, limit: int = None) -> List[Dict]:
        """Get stocks filtered by market cap category"""
        try:
            with StockUniverseDatabase.get_connection() as conn:
                # Define market cap ranges based on arithmetic classification
                if cap_type.lower() == 'large':
                    query = """
                        SELECT * FROM stocks 
                        WHERE current_price > 0 AND shares_outstanding > 0 
                        AND (current_price * shares_outstanding) > 10000000000
                        ORDER BY (current_price * shares_outstanding) DESC
                    """
                elif cap_type.lower() == 'mid':
                    query = """
                        SELECT * FROM stocks 
                        WHERE current_price > 0 AND shares_outstanding > 0 
                        AND (current_price * shares_outstanding) BETWEEN 2000000000 AND 10000000000
                        ORDER BY (current_price * shares_outstanding) DESC
                    """
                elif cap_type.lower() == 'small':
                    query = """
                        SELECT * FROM stocks 
                        WHERE current_price > 0 AND shares_outstanding > 0 
                        AND (current_price * shares_outstanding) BETWEEN 300000000 AND 1999999999
                        ORDER BY (current_price * shares_outstanding) DESC
                    """
                else:
                    return []
                
                if limit:
                    query += f" LIMIT {limit}"
                
                cursor = conn.execute(query)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Error fetching {cap_type} cap stocks: {e}")
            return []
    
    @staticmethod
    def get_top_performers(cap_type: str = None, limit: int = 10) -> List[Dict]:
        """Get top performing stocks by price change percentage"""
        try:
            with StockUniverseDatabase.get_connection() as conn:
                base_query = """
                    SELECT * FROM stocks 
                    WHERE current_price > 0 AND price_change_percent IS NOT NULL 
                    AND shares_outstanding > 0
                """
                
                # Add market cap filter if specified
                if cap_type and cap_type.lower() == 'large':
                    base_query += " AND (current_price * shares_outstanding) > 10000000000"
                elif cap_type and cap_type.lower() == 'mid':
                    base_query += " AND (current_price * shares_outstanding) BETWEEN 2000000000 AND 10000000000"
                elif cap_type and cap_type.lower() == 'small':
                    base_query += " AND (current_price * shares_outstanding) BETWEEN 300000000 AND 1999999999"
                
                base_query += " ORDER BY price_change_percent DESC"
                
                if limit:
                    base_query += f" LIMIT {limit}"
                
                cursor = conn.execute(base_query)
                return [dict(row) for row in cursor.fetchall()]
        except Exception as e:
            logger.error(f"Error fetching top performers: {e}")
            return []
    
    @staticmethod
    def update_stock_prices():
        """Update prices for all stocks in the database"""
        try:
            with StockUniverseDatabase.get_connection() as conn:
                # Get all symbols
                cursor = conn.execute("SELECT symbol FROM stocks")
                symbols = [row[0] for row in cursor.fetchall()]
                
                updated_count = 0
                for symbol in symbols:
                    try:
                        price, volume = StockUniverseDatabase.get_realtime_price_and_volume(symbol)
                        if price > 0:
                            # Get previous price to calculate change
                            prev_cursor = conn.execute("SELECT current_price FROM stocks WHERE symbol = ?", (symbol,))
                            prev_row = prev_cursor.fetchone()
                            prev_price = prev_row[0] if prev_row else price
                            
                            price_change = price - prev_price
                            price_change_percent = (price_change / prev_price * 100) if prev_price > 0 else 0
                            
                            # Update with new price data
                            conn.execute("""
                                UPDATE stocks 
                                SET current_price = ?, volume = ?, price_change = ?, 
                                    price_change_percent = ?, last_updated = ?
                                WHERE symbol = ?
                            """, (price, volume, price_change, price_change_percent, 
                                 datetime.now().isoformat(), symbol))
                            
                            updated_count += 1
                    except Exception as e:
                        logger.error(f"Error updating price for {symbol}: {e}")
                
                conn.commit()
                logger.info(f"Updated prices for {updated_count} stocks")
                return updated_count
        except Exception as e:
            logger.error(f"Error updating stock prices: {e}")
            return 0
    
    @staticmethod
    def fetch_stock_universe():
        """Fetch and populate the stock universe from multiple sources"""
        logger.info("Starting stock universe update...")
        
        # Initialize database
        StockUniverseDatabase.initialize_database()
        
        # List of popular stocks to fetch
        stock_symbols = [
            # Large Cap Technology
            'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 'CRM',
            'ORCL', 'ADBE', 'IBM', 'INTC', 'CSCO', 'AVGO', 'TXN', 'QCOM', 'AMD', 'MU',
            
            # Large Cap Financial
            'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'AXP', 'SCHW', 'USB',
            'PNC', 'TFC', 'COF', 'FIS', 'AIG', 'MET', 'PRU', 'ALL', 'TRV', 'PGR',
            
            # Large Cap Healthcare
            'JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'TMO', 'ABT', 'DHR', 'BMY', 'AMGN',
            'GILD', 'CVS', 'MDT', 'CI', 'ANTM', 'HUM', 'WBA', 'ZTS', 'SYK', 'BSX',
            
            # Large Cap Consumer
            'PG', 'KO', 'PEP', 'WMT', 'HD', 'MCD', 'DIS', 'NKE', 'SBUX', 'TGT',
            'LOW', 'COST', 'CL', 'KMB', 'GIS', 'K', 'HSY', 'CPB', 'CAG', 'SJM',
            
            # Large Cap Industrial
            'BA', 'CAT', 'GE', 'MMM', 'HON', 'UPS', 'RTX', 'LMT', 'NOC', 'GD',
            'FDX', 'UNP', 'CSX', 'NSC', 'CHRW', 'LUV', 'DAL', 'AAL', 'UAL', 'ALK',
            
            # Large Cap Energy
            'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'MPC', 'VLO', 'PSX', 'KMI', 'OKE',
            'WMB', 'EPD', 'ET', 'MPLX', 'TRGP', 'BKR', 'HAL', 'DVN', 'FANG', 'MRO',
            
            # Mid Cap Stocks
            'ROKU', 'PINS', 'SNAP', 'UBER', 'LYFT', 'ABNB', 'DOCU', 'ZM', 'WORK', 'TEAM',
            'OKTA', 'CRWD', 'ZS', 'DDOG', 'NET', 'FSLY', 'ESTC', 'SPLK', 'NOW', 'SNOW',
            'PLTR', 'RBLX', 'COIN', 'HOOD', 'SOFI', 'UPST', 'AFRM', 'SQ', 'PYPL', 'SHOP',
            
            # Small Cap Stocks  
            'SPCE', 'NKLA', 'RIDE', 'LCID', 'RIVN', 'GOEV', 'WKHS', 'HYLN', 'SOLO', 'NIU',
            'GME', 'AMC', 'BB', 'NOK', 'SNDL', 'TLRY', 'CGC', 'ACB', 'CRON', 'HEXO',
            'WISH', 'CLOV', 'CLNE', 'WOOF', 'BARK', 'PETS', 'CHWY', 'ETSY', 'EBAY', 'MELI',
            'ZI', 'PTON', 'LULU', 'NFLX', 'SPOT', 'TWTR', 'SNAP', 'PINTEREST', 'BUMBLE', 'MTCH'
        ]
        
        added_count = 0
        for symbol in stock_symbols:
            try:
                stock_data = StockUniverseDatabase._fetch_stock_data(symbol)
                if stock_data and StockUniverseDatabase.add_or_update_stock(stock_data):
                    added_count += 1
            except Exception as e:
                logger.error(f"Error processing {symbol}: {e}")
        
        logger.info(f"Stock universe update completed. Added/updated {added_count} stocks.")
        return added_count
    
    @staticmethod
    def _fetch_stock_data(symbol: str) -> Optional[Dict]:
        """Fetch comprehensive stock data from Yahoo Finance"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Get real-time price and volume
            price, volume = StockUniverseDatabase.get_realtime_price_and_volume(symbol)
            
            # Skip if no valid price data
            if price <= 0:
                logger.warning(f"No valid price data for {symbol}")
                return None
            
            # Extract key information
            stock_data = {
                'symbol': symbol,
                'company_name': info.get('longName', symbol),
                'exchange': info.get('exchange', 'Unknown'),
                'sector': info.get('sector', 'Unknown'),
                'industry': info.get('industry', 'Unknown'),
                'shares_outstanding': info.get('sharesOutstanding', 0),
                'current_price': price,
                'volume': volume,
                'pe_ratio': info.get('trailingPE'),
                'dividend_yield': info.get('dividendYield'),
                'fifty_two_week_high': info.get('fiftyTwoWeekHigh'),
                'fifty_two_week_low': info.get('fiftyTwoWeekLow'),
                'beta': info.get('beta'),
                'price_change': info.get('regularMarketChange', 0),
                'price_change_percent': info.get('regularMarketChangePercent', 0)
            }
            
            return stock_data
        except Exception as e:
            logger.error(f"Error fetching data for {symbol}: {e}")
            return None
    
    @staticmethod
    def get_database_stats():
        """Get statistics about the stock universe database"""
        try:
            with StockUniverseDatabase.get_connection() as conn:
                # Total stocks
                total_cursor = conn.execute("SELECT COUNT(*) FROM stocks WHERE current_price > 0")
                total_stocks = total_cursor.fetchone()[0]
                
                # Stocks by market cap
                large_cursor = conn.execute("""
                    SELECT COUNT(*) FROM stocks 
                    WHERE current_price > 0 AND shares_outstanding > 0 
                    AND (current_price * shares_outstanding) > 10000000000
                """)
                large_cap = large_cursor.fetchone()[0]
                
                mid_cursor = conn.execute("""
                    SELECT COUNT(*) FROM stocks 
                    WHERE current_price > 0 AND shares_outstanding > 0 
                    AND (current_price * shares_outstanding) BETWEEN 2000000000 AND 10000000000
                """)
                mid_cap = mid_cursor.fetchone()[0]
                
                small_cursor = conn.execute("""
                    SELECT COUNT(*) FROM stocks 
                    WHERE current_price > 0 AND shares_outstanding > 0 
                    AND (current_price * shares_outstanding) BETWEEN 300000000 AND 1999999999
                """)
                small_cap = small_cursor.fetchone()[0]
                
                return {
                    'total_stocks': total_stocks,
                    'large_cap': large_cap,
                    'mid_cap': mid_cap,
                    'small_cap': small_cap
                }
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {'total_stocks': 0, 'large_cap': 0, 'mid_cap': 0, 'small_cap': 0}
