"""
Stock Universe Database Management
Handles the dynamic stock universe with automatic updates
ACID-Compliant Database Operations
"""
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from pathlib import Path
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class StockUniverseDatabase:
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
"""
Stock Universe Database Management
Handles the dynamic stock universe with automatic updates
ACID-Compliant Database Operations
"""
import sqlite3
import logging
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import requests
import yfinance as yf
from pathlib import Path
import threading
from contextlib import contextmanager

logger = logging.getLogger(__name__)

class StockUniverseDatabase:
    @staticmethod
    def get_realtime_price_and_volume(symbol: str):
        """Try Finnhub, then Alpha Vantage, then Yahoo Finance for price/volume."""
        import os
        import time
        # Finnhub
        try:
            finnhub_key = os.getenv("FINNHUB_API_KEY")
            if finnhub_key:
                url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={finnhub_key}"
                r = requests.get(url, timeout=10)
                if r.status_code == 200:
                    data = r.json()
                    price = data.get('c')
                    volume = data.get('v')
                    if price and price > 0:
                        return float(price), float(volume) if volume else 0
        except Exception:
            pass
        # Alpha Vantage
        try:
            av_key = os.getenv("ALPHA_VANTAGE_API_KEY")
            if av_key:
                url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={av_key}"
                r = requests.get(url, timeout=15)
                if r.status_code == 200:
                    data = r.json().get('Global Quote', {})
                    price = data.get('05. price')
                    volume = data.get('06. volume')
                    if price and float(price) > 0:
                        return float(price), float(volume) if volume else 0
        except Exception:
            pass
        # Yahoo Finance
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            price = info.get('regularMarketPrice')
            volume = info.get('regularMarketVolume')
            if price and price > 0:
                return float(price), float(volume) if volume else 0
        except Exception:
            pass
        return 0, 0
    """Database management for dynamic stock universe with ACID compliance"""
    
    DB_PATH = Path(__file__).parent / "stock_universe.db"
    
    # Configuration for universe updates
    UPDATE_FREQUENCY_DAYS = 3  # Update every 3 days (twice a week)
    MIN_MARKET_CAP = 1e9  # Minimum $1B market cap
    EXCHANGES = ['NASDAQ', 'NYSE']  # Target exchanges
    
    # Thread lock for database operations
    _db_lock = threading.RLock()
    
    @classmethod
    @contextmanager
    def get_connection(cls, isolation_level=None):
        """
        Get a database connection with proper ACID configuration
        
        Args:
            isolation_level: Transaction isolation level 
                           ('DEFERRED', 'IMMEDIATE', 'EXCLUSIVE', or None for autocommit)
        """
        conn = None
        try:
            with cls._db_lock:
                conn = sqlite3.connect(
                    cls.DB_PATH,
                    timeout=30.0,  # 30 second timeout
                    isolation_level=isolation_level
                )
                
                # Enable WAL mode for better concurrency and durability
                conn.execute("PRAGMA journal_mode=WAL")
                
                # Enable foreign key constraints
                conn.execute("PRAGMA foreign_keys=ON")
                
                # Set synchronous mode for durability
                conn.execute("PRAGMA synchronous=FULL")
                
                # Enable better concurrency
                conn.execute("PRAGMA busy_timeout=30000")  # 30 seconds
                
                yield conn
                
        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database connection error: {e}")
            raise
        finally:
            if conn:
                conn.close()
    
    @classmethod
    def create_tables(cls):
        """Create database tables for stock universe management with ACID compliance"""
        try:
            with cls.get_connection('EXCLUSIVE') as conn:
                cursor = conn.cursor()
                
                # Begin explicit transaction
                cursor.execute("BEGIN EXCLUSIVE")
                
                try:
                    # Stock universe table with proper constraints and popularity criteria
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS stock_universe (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            symbol TEXT UNIQUE NOT NULL COLLATE NOCASE,
                            name TEXT NOT NULL CHECK(length(trim(name)) > 0),
                            sector TEXT CHECK(length(trim(sector)) > 0),
                            industry TEXT CHECK(length(trim(industry)) > 0),
                            market_cap REAL CHECK(market_cap >= 0),
                            exchange TEXT CHECK(length(trim(exchange)) > 0),
                            is_active BOOLEAN DEFAULT 1 CHECK(is_active IN (0, 1)),
                            
                            -- Popularity criteria fields
                            trading_volume REAL DEFAULT 0 CHECK(trading_volume >= 0),
                            avg_daily_volume REAL DEFAULT 0 CHECK(avg_daily_volume >= 0),
                            volatility REAL DEFAULT 0 CHECK(volatility >= 0),
                            price_change_1d REAL DEFAULT 0,
                            price_change_1w REAL DEFAULT 0,
                            price_change_1m REAL DEFAULT 0,
                            price_change_ytd REAL DEFAULT 0,
                            watchlist_count INTEGER DEFAULT 0 CHECK(watchlist_count >= 0),
                            buy_orders_count INTEGER DEFAULT 0 CHECK(buy_orders_count >= 0),
                            sell_orders_count INTEGER DEFAULT 0 CHECK(sell_orders_count >= 0),
                            total_trades_count INTEGER DEFAULT 0 CHECK(total_trades_count >= 0),
                            search_trend_score REAL DEFAULT 0 CHECK(search_trend_score >= 0),
                            
                            -- Logo and display fields
                            logo_url TEXT,
                            current_price REAL DEFAULT 0 CHECK(current_price >= 0),
                            
                            -- Popularity score calculation
                            popularity_score REAL DEFAULT 0 CHECK(popularity_score >= 0),
                            
                            added_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            last_price_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    ''')
                    
                    # Create indexes for performance
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_stock_universe_symbol 
                        ON stock_universe(symbol)
                    ''')
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_stock_universe_sector 
                        ON stock_universe(sector, is_active)
                    ''')
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_stock_universe_active 
                        ON stock_universe(is_active, last_updated)
                    ''')
                    
                    # Indexes for popularity criteria
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_stock_universe_popularity 
                        ON stock_universe(popularity_score DESC, is_active)
                    ''')
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_stock_universe_trading_volume 
                        ON stock_universe(trading_volume DESC, is_active)
                    ''')
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_stock_universe_volatility 
                        ON stock_universe(volatility DESC, is_active)
                    ''')
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_stock_universe_price_change 
                        ON stock_universe(price_change_1d DESC, is_active)
                    ''')
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_stock_universe_watchlist 
                        ON stock_universe(watchlist_count DESC, is_active)
                    ''')
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_stock_universe_trades 
                        ON stock_universe(total_trades_count DESC, is_active)
                    ''')
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_stock_universe_search_trend 
                        ON stock_universe(search_trend_score DESC, is_active)
                    ''')
                    
                    # Update history table for tracking with referential integrity
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS universe_updates (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            update_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                            stocks_added INTEGER DEFAULT 0 CHECK(stocks_added >= 0),
                            stocks_removed INTEGER DEFAULT 0 CHECK(stocks_removed >= 0),
                            total_stocks INTEGER DEFAULT 0 CHECK(total_stocks >= 0),
                            update_source TEXT NOT NULL CHECK(length(trim(update_source)) > 0),
                            status TEXT NOT NULL CHECK(status IN ('success', 'failed', 'partial')),
                            notes TEXT,
                            transaction_id TEXT UNIQUE,
                            CONSTRAINT valid_stock_counts CHECK(
                                stocks_added >= 0 AND stocks_removed >= 0 AND total_stocks >= 0
                            )
                        )
                    ''')
                    
                    # Create index for update history
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_universe_updates_date 
                        ON universe_updates(update_date, status)
                    ''')
                    
                    # Sector mapping table with proper constraints
                    cursor.execute('''
                        CREATE TABLE IF NOT EXISTS sector_mapping (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            sector_name TEXT UNIQUE NOT NULL COLLATE NOCASE 
                                CHECK(length(trim(sector_name)) > 0),
                            display_name TEXT NOT NULL CHECK(length(trim(display_name)) > 0),
                            description TEXT CHECK(length(trim(description)) > 0),
                            color_code TEXT CHECK(color_code LIKE '#%' AND length(color_code) = 7),
                            is_active BOOLEAN DEFAULT 1 CHECK(is_active IN (0, 1)),
                            created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                        )
                    ''')
                    
                    # Create index for sector mapping
                    cursor.execute('''
                        CREATE INDEX IF NOT EXISTS idx_sector_mapping_name 
                        ON sector_mapping(sector_name, is_active)
                    ''')
                    
                    # Create trigger to maintain referential integrity
                    cursor.execute('''
                        CREATE TRIGGER IF NOT EXISTS update_stock_timestamp 
                        AFTER UPDATE ON stock_universe
                        FOR EACH ROW
                        BEGIN
                            UPDATE stock_universe 
                            SET last_updated = CURRENT_TIMESTAMP 
                            WHERE id = NEW.id;
                        END
                    ''')
                    
                    # Commit the transaction
                    cursor.execute("COMMIT")
                    logger.info("✅ Stock universe database tables created successfully with ACID compliance")
                    
                    # Initialize with default sectors if empty
                    cls._initialize_default_sectors()
                    
                except Exception as e:
                    cursor.execute("ROLLBACK")
                    raise e
                    
        except Exception as e:
            logger.error(f"Error creating stock universe tables: {e}")
            raise
    
    @classmethod
    def _initialize_default_sectors(cls):
        """Initialize default sector mappings with ACID transaction"""
        default_sectors = [
            ('Technology', 'Technology', 'Software, hardware, and tech services companies', '#3B82F6'),
            ('Healthcare', 'Healthcare', 'Pharmaceutical, biotech, and medical device companies', '#10B981'),
            ('Financial', 'Financial Services', 'Banks, insurance, and financial services', '#F59E0B'),
            ('Consumer', 'Consumer Goods', 'Retail, consumer products, and services', '#EF4444'),
            ('Industrial', 'Industrial', 'Manufacturing, aerospace, and industrial services', '#8B5CF6'),
            ('Energy', 'Energy', 'Oil, gas, renewable energy, and utilities', '#F97316'),
            ('Communication', 'Communication Services', 'Telecom, media, and entertainment', '#06B6D4'),
            ('Utilities', 'Utilities', 'Electric, gas, water, and utility services', '#84CC16'),
            ('Materials', 'Materials', 'Mining, chemicals, and raw materials', '#6B7280'),
            ('Real Estate', 'Real Estate', 'REITs and real estate development', '#EC4899'),
            ('Unknown', 'Unknown', 'Unknown sector companies', '#6B7280')
        ]
        
        try:
            with cls.get_connection('IMMEDIATE') as conn:
                cursor = conn.cursor()
                
                # Begin transaction
                cursor.execute("BEGIN IMMEDIATE")
                
                try:
                    # Check if sectors already exist
                    cursor.execute("SELECT COUNT(*) FROM sector_mapping WHERE is_active = 1")
                    count = cursor.fetchone()[0]
                    
                    if count == 0:
                        # Validate data before insertion
                        for sector_data in default_sectors:
                            sector_name, display_name, description, color_code = sector_data
                            
                            # Validate constraints
                            if not sector_name or not sector_name.strip():
                                raise ValueError(f"Invalid sector name: {sector_name}")
                            if not display_name or not display_name.strip():
                                raise ValueError(f"Invalid display name: {display_name}")
                            if not color_code or len(color_code) != 7 or not color_code.startswith('#'):
                                raise ValueError(f"Invalid color code: {color_code}")
                        
                        # Insert all sectors in a single transaction
                        cursor.executemany('''
                            INSERT INTO sector_mapping 
                            (sector_name, display_name, description, color_code) 
                            VALUES (?, ?, ?, ?)
                        ''', default_sectors)
                        
                        # Verify insertion
                        cursor.execute("SELECT COUNT(*) FROM sector_mapping WHERE is_active = 1")
                        inserted_count = cursor.fetchone()[0]
                        
                        if inserted_count != len(default_sectors):
                            raise Exception(f"Expected {len(default_sectors)} sectors, but inserted {inserted_count}")
                        
                        cursor.execute("COMMIT")
                        logger.info(f"✅ Default sectors initialized: {inserted_count} sectors")
                    else:
                        cursor.execute("ROLLBACK")
                        logger.info("Default sectors already exist, skipping initialization")
                        
                except Exception as e:
                    cursor.execute("ROLLBACK")
                    raise e
                    
        except Exception as e:
            logger.error(f"Error initializing default sectors: {e}")
            raise
    
    @classmethod
    def needs_update(cls) -> bool:
        """Check if the stock universe needs updating"""
        try:
            with sqlite3.connect(cls.DB_PATH) as conn:
                cursor = conn.cursor()
                
                # Check last update date
                cursor.execute('''
                    SELECT MAX(update_date) FROM universe_updates 
                    WHERE status = 'success'
                ''')
                
                last_update = cursor.fetchone()[0]
                
                if not last_update:
                    logger.info("No previous updates found, update needed")
                    return True
                
                # Parse the date and check if it's older than UPDATE_FREQUENCY_DAYS
                last_update_date = datetime.fromisoformat(last_update.replace('Z', '+00:00'))
                days_since_update = (datetime.now() - last_update_date).days
                
                needs_update = days_since_update >= cls.UPDATE_FREQUENCY_DAYS
                
                logger.info(f"Days since last update: {days_since_update}, needs update: {needs_update}")
                return needs_update
                
        except Exception as e:
            logger.error(f"Error checking update status: {e}")
            return True  # If we can't check, assume we need an update
    
    @classmethod
    def fetch_stock_universe(cls) -> List[Dict]:
        """Fetch fresh stock universe from multiple sources"""
        logger.info("🔄 Fetching fresh stock universe...")
        
        all_stocks = []
        
        try:
            # Method 1: Fetch from Finnhub (if API key available)
            finnhub_stocks = cls._fetch_from_finnhub()
            all_stocks.extend(finnhub_stocks)
            # Method 2: Fetch popular stocks using Yahoo Finance
            yahoo_stocks = cls._fetch_from_yahoo()
            all_stocks.extend(yahoo_stocks)
            # Remove duplicates and filter
            unique_stocks = cls._filter_and_deduplicate(all_stocks)
            # Fetch and attach real price/volume for each unique stock
            for stock in unique_stocks:
                symbol = stock.get('symbol')
                price, volume = cls.get_realtime_price_and_volume(symbol)
                stock['current_price'] = price
                stock['trading_volume'] = volume
            logger.info(f"✅ Fetched {len(unique_stocks)} unique stocks with real price/volume")
            return unique_stocks
        except Exception as e:
            logger.error(f"Error fetching stock universe: {e}")
            return cls._get_fallback_stocks()
    
    @classmethod
    def _fetch_from_finnhub(cls) -> List[Dict]:
        """Fetch stocks from Finnhub API"""
        try:
            # Use the existing Finnhub API key
            from screener_service import OptimizedScreenerService
            api_key = OptimizedScreenerService.FINNHUB_API_KEY
            
            if not api_key or api_key == 'demo':
                logger.warning("No valid Finnhub API key, skipping Finnhub fetch")
                return []
            
            url = f"https://finnhub.io/api/v1/stock/symbol?exchange=US&token={api_key}"
            response = requests.get(url, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                stocks = []
                for item in data[:500]:  # Limit to top 500 to avoid overload
                    if (item.get('type') == 'Common Stock' and 
                        item.get('currency') == 'USD' and
                        '.' not in item.get('symbol', '')):  # Avoid complex symbols
                        
                        stocks.append({
                            'symbol': item['symbol'],
                            'name': item.get('description', f"{item['symbol']} Corp"),
                            'exchange': 'US',
                            'source': 'finnhub'
                        })
                
                logger.info(f"Fetched {len(stocks)} stocks from Finnhub")
                return stocks
                
        except Exception as e:
            logger.warning(f"Error fetching from Finnhub: {e}")
            
        return []
    
    @classmethod
    def _fetch_from_yahoo(cls) -> List[Dict]:
        """Fetch popular stocks using Yahoo Finance"""
        try:
            # List of popular stocks across different sectors
            popular_symbols = [
                # Technology
                'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'NFLX', 'ADBE', 'CRM',
                'ORCL', 'INTC', 'AMD', 'PYPL', 'UBER', 'ZOOM', 'SNOW', 'PLTR', 'IBM', 'CSCO',
                'NOW', 'INTU', 'QCOM', 'TXN', 'AVGO', 'MU', 'LRCX', 'KLAC', 'AMAT', 'MRVL',
                
                # Financial
                'JPM', 'BAC', 'V', 'MA', 'WFC', 'GS', 'MS', 'AXP', 'BLK', 'SPGI',
                'C', 'USB', 'PNC', 'TFC', 'COF', 'SCHW', 'CB', 'ICE', 'CME', 'AON',
                
                # Healthcare
                'JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'TMO', 'DHR', 'ABT', 'LLY', 'BMY',
                'CVS', 'AMGN', 'GILD', 'CI', 'HUM', 'ANTM', 'SYK', 'BDX', 'ZTS', 'ISRG',
                
                # Consumer
                'WMT', 'HD', 'PG', 'KO', 'COST', 'NKE', 'MCD', 'SBUX', 'TGT', 'LOW',
                'PM', 'PEP', 'CL', 'KMB', 'GIS', 'K', 'HSY', 'MO', 'EL', 'CLX',
                
                # Industrial
                'BA', 'CAT', 'GE', 'MMM', 'HON', 'UPS', 'LMT', 'RTX', 'DE', 'EMR',
                'FDX', 'WM', 'CSX', 'UNP', 'NSC', 'LUV', 'DAL', 'UAL', 'AAL', 'NOC',
                
                # Energy
                'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'MPC', 'VLO', 'PSX', 'KMI', 'OKE',
                'PXD', 'OXY', 'HAL', 'BKR', 'DVN', 'FANG', 'MRO', 'APA', 'HES', 'EQT',
                
                # Communication
                'DIS', 'CMCSA', 'VZ', 'T', 'TMUS', 'CHTR', 'PARA', 'WBD', 'FOX', 'FOXA',
                
                # Utilities
                'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'XEL', 'SRE', 'PEG', 'ED',
                
                # Materials
                'LIN', 'APD', 'SHW', 'FCX', 'NEM', 'DOW', 'DD', 'CF', 'ECL', 'PPG',
                
                # Real Estate
                'PLD', 'AMT', 'CCI', 'EQIX', 'SPG', 'PSA', 'EXR', 'WELL', 'AVB', 'EQR',
                'DLR', 'O', 'REYN', 'VTR', 'ESS', 'MAA', 'UDR', 'CPT', 'FRT', 'REG'
            ]
            
            stocks = []
            for symbol in popular_symbols:
                try:
                    ticker = yf.Ticker(symbol)
                    info = ticker.info
                    
                    stocks.append({
                        'symbol': symbol,
                        'name': info.get('longName', f"{symbol} Corporation"),
                        'sector': info.get('sector', 'Unknown'),
                        'industry': info.get('industry', 'Unknown'),
                        'market_cap': info.get('marketCap', 0),
                        'exchange': info.get('exchange', 'NASDAQ'),
                        'source': 'yahoo'
                    })
                    
                except Exception as e:
                    logger.warning(f"Error fetching {symbol} from Yahoo: {e}")
                    # Add with minimal data
                    stocks.append({
                        'symbol': symbol,
                        'name': f"{symbol} Corporation",
                        'sector': 'Unknown',
                        'exchange': 'NASDAQ',
                        'source': 'yahoo_fallback'
                    })
            
            logger.info(f"Fetched {len(stocks)} stocks from Yahoo Finance")
            return stocks
            
        except Exception as e:
            logger.error(f"Error fetching from Yahoo Finance: {e}")
            return []
    
    @classmethod
    def _filter_and_deduplicate(cls, stocks: List[Dict]) -> List[Dict]:
        """Filter and remove duplicate stocks"""
        seen_symbols = set()
        unique_stocks = []
        
        for stock in stocks:
            symbol = stock.get('symbol', '').upper()
            
            # Skip if already seen
            if symbol in seen_symbols:
                continue
            
            # Basic filtering
            if (len(symbol) > 5 or  # Too long
                '.' in symbol or    # Complex symbols
                symbol.isdigit() or # Numeric symbols
                not symbol.isalpha()):  # Non-alphabetic
                continue
            
            # Filter by market cap if available
            market_cap = stock.get('market_cap', 0)
            if market_cap > 0 and market_cap < cls.MIN_MARKET_CAP:
                continue
            
            seen_symbols.add(symbol)
            unique_stocks.append(stock)
        
        return unique_stocks
    
    @classmethod
    def _get_fallback_stocks(cls) -> List[Dict]:
        """Get fallback stock list if fetching fails"""
        # Use the existing stock list as fallback
        from screener_service import OptimizedScreenerService
        
        fallback_stocks = []
        for symbol in OptimizedScreenerService.POPULAR_STOCKS:
            # Determine sector from existing mapping
            sector = 'Unknown'
            for sector_name, symbols in OptimizedScreenerService.SECTOR_MAPPING.items():
                if symbol in symbols:
                    sector = sector_name
                    break
            
            fallback_stocks.append({
                'symbol': symbol,
                'name': f"{symbol} Corporation",
                'sector': sector,
                'exchange': 'NASDAQ',
                'source': 'fallback'
            })
        
        logger.info(f"Using {len(fallback_stocks)} fallback stocks")
        return fallback_stocks
    
    @classmethod
    def update_universe(cls, force: bool = False) -> Dict:
        """Update the stock universe if needed"""
        try:
            if not force and not cls.needs_update():
                logger.info("Stock universe is up to date, skipping update")
                return {
                    'status': 'skipped',
                    'message': 'Universe is up to date',
                    'last_update': cls.get_last_update_info()
                }
            
            logger.info("🔄 Starting stock universe update...")
            
            # Fetch fresh data
            fresh_stocks = cls.fetch_stock_universe()
            
            if not fresh_stocks:
                raise Exception("No stocks fetched from any source")
            
            # Update database
            stats = cls._update_database(fresh_stocks)
            
            # Log the update
            cls._log_update(stats)
            
            logger.info(f"✅ Stock universe updated: {stats}")
            
            return {
                'status': 'success',
                'message': f"Updated with {len(fresh_stocks)} stocks",
                'stats': stats,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error updating stock universe: {e}")
            
            # Log failed update
            cls._log_update({
                'status': 'failed',
                'error': str(e),
                'stocks_added': 0,
                'stocks_removed': 0,
                'total_stocks': 0
            })
            
            return {
                'status': 'error',
                'message': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    @classmethod
    def _update_database(cls, fresh_stocks: List[Dict]) -> Dict:
        """Update the database with fresh stock data using ACID transaction"""
        transaction_id = f"update_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        try:
            with cls.get_connection('EXCLUSIVE') as conn:
                cursor = conn.cursor()
                
                # Begin exclusive transaction for complex update
                cursor.execute("BEGIN EXCLUSIVE")
                
                try:
                    # Get current stocks
                    cursor.execute("SELECT symbol FROM stock_universe WHERE is_active = 1")
                    current_symbols = {row[0] for row in cursor.fetchall()}
                    
                    fresh_symbols = {stock['symbol'] for stock in fresh_stocks}
                    
                    # Calculate changes
                    to_add = fresh_symbols - current_symbols
                    to_remove = current_symbols - fresh_symbols
                    
                    # Validate input data
                    for stock in fresh_stocks:
                        symbol = stock.get('symbol', '').strip()
                        name = stock.get('name', '').strip()
                        
                        if not symbol:
                            raise ValueError(f"Invalid stock symbol: {stock}")
                        if not name:
                            raise ValueError(f"Invalid stock name for {symbol}: {stock}")
                        if len(symbol) > 10:
                            raise ValueError(f"Symbol too long: {symbol}")
                    
                    # Deactivate removed stocks with audit trail
                    stocks_removed = 0
                    if to_remove:
                        placeholders = ','.join('?' * len(to_remove))
                        cursor.execute(f'''
                            UPDATE stock_universe 
                            SET is_active = 0, last_updated = CURRENT_TIMESTAMP 
                            WHERE symbol IN ({placeholders}) AND is_active = 1
                        ''', list(to_remove))
                        stocks_removed = cursor.rowcount
                    
                    # Add new stocks
                    stocks_added = 0
                    for stock in fresh_stocks:
                        if stock['symbol'] in to_add:
                            try:
                                cursor.execute('''
                                    INSERT INTO stock_universe 
                                    (symbol, name, sector, industry, market_cap, exchange, is_active,
                                     logo_url, current_price)
                                    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
                                ''', (
                                    stock['symbol'].strip().upper(),
                                    stock.get('name', f"{stock['symbol']} Corp").strip(),
                                    stock.get('sector', 'Unknown').strip() or 'Unknown',
                                    stock.get('industry', 'Unknown').strip() or 'Unknown',
                                    max(0, float(stock.get('market_cap', 0) or 0)),
                                    stock.get('exchange', 'NASDAQ').strip() or 'NASDAQ',
                                    stock.get('logo_url', ''),
                                    float(stock.get('current_price', 0) or 0)
                                ))
                                stocks_added += 1
                            except sqlite3.IntegrityError as e:
                                logger.warning(f"Failed to insert {stock['symbol']}: {e}")
                                continue
                    
                    # Update existing stocks
                    stocks_updated = 0
                    for stock in fresh_stocks:
                        if stock['symbol'] not in to_add:
                            cursor.execute('''
                                UPDATE stock_universe 
                                SET name = ?, sector = ?, industry = ?, 
                                    market_cap = ?, exchange = ?, 
                                    logo_url = ?, current_price = ?,
                                    last_updated = CURRENT_TIMESTAMP
                                WHERE symbol = ? AND is_active = 1
                            ''', (
                                stock.get('name', f"{stock['symbol']} Corp").strip(),
                                stock.get('sector', 'Unknown').strip() or 'Unknown',
                                stock.get('industry', 'Unknown').strip() or 'Unknown',
                                max(0, float(stock.get('market_cap', 0) or 0)),
                                stock.get('exchange', 'NASDAQ').strip() or 'NASDAQ',
                                stock.get('logo_url', ''),
                                float(stock.get('current_price', 0) or 0),
                                stock['symbol'].strip().upper()
                            ))
                            if cursor.rowcount > 0:
                                stocks_updated += 1
                    
                    # Get final count and verify data integrity
                    cursor.execute("SELECT COUNT(*) FROM stock_universe WHERE is_active = 1")
                    total_active = cursor.fetchone()[0]
                    
                    # Verify no duplicate active symbols
                    cursor.execute('''
                        SELECT symbol, COUNT(*) as cnt 
                        FROM stock_universe 
                        WHERE is_active = 1 
                        GROUP BY symbol 
                        HAVING cnt > 1
                    ''')
                    duplicates = cursor.fetchall()
                    if duplicates:
                        raise Exception(f"Duplicate active symbols found: {duplicates}")
                    
                    # Verify minimum data quality
                    cursor.execute('''
                        SELECT COUNT(*) FROM stock_universe 
                        WHERE is_active = 1 AND (symbol IS NULL OR trim(symbol) = '')
                    ''')
                    invalid_symbols = cursor.fetchone()[0]
                    if invalid_symbols > 0:
                        raise Exception(f"Found {invalid_symbols} stocks with invalid symbols")
                    
                    # Log the successful update
                    cursor.execute('''
                        INSERT INTO universe_updates 
                        (stocks_added, stocks_removed, total_stocks, update_source, status, notes, transaction_id)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        stocks_added,
                        stocks_removed,
                        total_active,
                        'multiple_apis',
                        'success',
                        f"Updated: {stocks_added} added, {stocks_removed} removed, {stocks_updated} updated",
                        transaction_id
                    ))
                    
                    # Commit the entire transaction
                    cursor.execute("COMMIT")
                    
                    stats = {
                        'status': 'success',
                        'stocks_added': stocks_added,
                        'stocks_removed': stocks_removed,
                        'stocks_updated': stocks_updated,
                        'total_stocks': total_active,
                        'update_source': 'multiple_apis',
                        'transaction_id': transaction_id
                    }
                    
                    logger.info(f"✅ Database updated successfully: {stats}")
                    return stats
                    
                except Exception as e:
                    cursor.execute("ROLLBACK")
                    # Log the failed update
                    try:
                        cursor.execute('''
                            INSERT INTO universe_updates 
                            (stocks_added, stocks_removed, total_stocks, update_source, status, notes, transaction_id)
                            VALUES (?, ?, ?, ?, ?, ?, ?)
                        ''', (0, 0, 0, 'multiple_apis', 'failed', str(e), transaction_id))
                        cursor.execute("COMMIT")
                    except:
                        pass  # Don't fail on logging failure
                    raise e
                    
        except Exception as e:
            logger.error(f"Error updating database: {e}")
            raise
    
    @classmethod
    def _fetch_from_yahoo(cls) -> List[Dict]:
        """Fetch popular stocks using Yahoo Finance, including real-time price and volume"""
        try:
            # List of popular stocks across different sectors
            popular_symbols = [
                # ...existing code...
                'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'NFLX', 'ADBE', 'CRM',
                'ORCL', 'INTC', 'AMD', 'PYPL', 'UBER', 'ZOOM', 'SNOW', 'PLTR', 'IBM', 'CSCO',
                'NOW', 'INTU', 'QCOM', 'TXN', 'AVGO', 'MU', 'LRCX', 'KLAC', 'AMAT', 'MRVL',
                # Financial
                'JPM', 'BAC', 'V', 'MA', 'WFC', 'GS', 'MS', 'AXP', 'BLK', 'SPGI',
                'C', 'USB', 'PNC', 'TFC', 'COF', 'SCHW', 'CB', 'ICE', 'CME', 'AON',
                # Healthcare
                'JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'TMO', 'DHR', 'ABT', 'LLY', 'BMY',
                'CVS', 'AMGN', 'GILD', 'CI', 'HUM', 'ANTM', 'SYK', 'BDX', 'ZTS', 'ISRG',
                # Consumer
                'WMT', 'HD', 'PG', 'KO', 'COST', 'NKE', 'MCD', 'SBUX', 'TGT', 'LOW',
                'PM', 'PEP', 'CL', 'KMB', 'GIS', 'K', 'HSY', 'MO', 'EL', 'CLX',
                # Industrial
                'BA', 'CAT', 'GE', 'MMM', 'HON', 'UPS', 'LMT', 'RTX', 'DE', 'EMR',
                'FDX', 'WM', 'CSX', 'UNP', 'NSC', 'LUV', 'DAL', 'UAL', 'AAL', 'NOC',
                # Energy
                'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'MPC', 'VLO', 'PSX', 'KMI', 'OKE',
                'PXD', 'OXY', 'HAL', 'BKR', 'DVN', 'FANG', 'MRO', 'APA', 'HES', 'EQT',
                # Communication
                'DIS', 'CMCSA', 'VZ', 'T', 'TMUS', 'CHTR', 'PARA', 'WBD', 'FOX', 'FOXA',
                # Utilities
                'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'XEL', 'SRE', 'PEG', 'ED',
                # Materials
                'LIN', 'APD', 'SHW', 'FCX', 'NEM', 'DOW', 'DD', 'CF', 'ECL', 'PPG',
                # Real Estate
                'PLD', 'AMT', 'CCI', 'EQIX', 'SPG', 'PSA', 'EXR', 'WELL', 'AVB', 'EQR',
                'DLR', 'O', 'REYN', 'VTR', 'ESS', 'MAA', 'UDR', 'CPT', 'FRT', 'REG'
            ]

            stocks = []
            for symbol in popular_symbols:
                try:
                    ticker = yf.Ticker(symbol)
                    info = ticker.info
                    price, volume = cls.get_realtime_price_and_volume(symbol)
                    shares_out = info.get('sharesOutstanding')
                    # Calculate market cap as price * shares_outstanding if both available
                    if price and price > 0 and shares_out and shares_out > 0:
                        market_cap = float(price) * float(shares_out)
                    else:
                        market_cap = info.get('marketCap', 0)
                    if price and price > 0:
                        stocks.append({
                            'symbol': symbol,
                            'name': info.get('longName', f"{symbol} Corporation"),
                            'sector': info.get('sector', 'Unknown'),
                            'industry': info.get('industry', 'Unknown'),
                            'market_cap': market_cap,
                            'exchange': info.get('exchange', 'NASDAQ'),
                            'current_price': price,
                            'trading_volume': volume,
                            'logo_url': info.get('logo_url', ''),
                            'source': 'yahoo'
                        })
                except Exception as e:
                    logger.warning(f"Error fetching {symbol} from Yahoo: {e}")
                    # Do not add fallback with price 0

            logger.info(f"Fetched {len(stocks)} stocks from Yahoo Finance (with real price/volume)")
            return stocks

        except Exception as e:
            logger.error(f"Error fetching from Yahoo Finance: {e}")
            return []
    
    @classmethod
    def get_last_update_info(cls) -> Optional[Dict]:
        """Get information about the last update with ACID read"""
        try:
            with cls.get_connection('DEFERRED') as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT update_date, stocks_added, stocks_removed, total_stocks, status, notes, transaction_id
                    FROM universe_updates 
                    ORDER BY update_date DESC 
                    LIMIT 1
                ''')
                
                row = cursor.fetchone()
                if not row:
                    return None
                
                return {
                    'update_date': row[0],
                    'stocks_added': row[1],
                    'stocks_removed': row[2],
                    'total_stocks': row[3],
                    'status': row[4],
                    'notes': row[5],
                    'transaction_id': row[6]
                }
                
        except Exception as e:
            logger.error(f"Error getting last update info: {e}")
            return None
    
    @classmethod
    def get_update_history(cls, limit: int = 10) -> List[Dict]:
        """Get update history with ACID read"""
        if limit <= 0:
            limit = 10
        if limit > 100:  # Prevent excessive queries
            limit = 100
            
        try:
            with cls.get_connection('DEFERRED') as conn:
                cursor = conn.cursor()
                
                cursor.execute('''
                    SELECT update_date, stocks_added, stocks_removed, total_stocks, status, notes, transaction_id
                    FROM universe_updates 
                    ORDER BY update_date DESC 
                    LIMIT ?
                ''', (limit,))
                
                history = []
                for row in cursor.fetchall():
                    history.append({
                        'update_date': row[0],
                        'stocks_added': row[1],
                        'stocks_removed': row[2],
                        'total_stocks': row[3],
                        'status': row[4],
                        'notes': row[5],
                        'transaction_id': row[6]
                    })
                
                return history
                
        except Exception as e:
            logger.error(f"Error getting update history: {e}")
            return []
    
    @classmethod
    def verify_database_integrity(cls) -> Dict:
        """
        Verify database integrity and ACID compliance
        Returns a report of any issues found
        """
        report = {
            'status': 'healthy',
            'issues': [],
            'stats': {},
            'recommendations': []
        }
        
        try:
            with cls.get_connection('DEFERRED') as conn:
                cursor = conn.cursor()
                
                # Check for duplicate active symbols
                cursor.execute('''
                    SELECT symbol, COUNT(*) as cnt 
                    FROM stock_universe 
                    WHERE is_active = 1 
                    GROUP BY symbol 
                    HAVING cnt > 1
                ''')
                duplicates = cursor.fetchall()
                if duplicates:
                    report['issues'].append(f"Duplicate active symbols: {duplicates}")
                    report['status'] = 'warning'
                
                # Check for invalid symbols
                cursor.execute('''
                    SELECT COUNT(*) FROM stock_universe 
                    WHERE is_active = 1 AND (symbol IS NULL OR trim(symbol) = '')
                ''')
                invalid_symbols = cursor.fetchone()[0]
                if invalid_symbols > 0:
                    report['issues'].append(f"{invalid_symbols} stocks with invalid symbols")
                    report['status'] = 'error'
                
                # Check for orphaned sectors
                cursor.execute('''
                    SELECT DISTINCT su.sector 
                    FROM stock_universe su 
                    LEFT JOIN sector_mapping sm ON su.sector = sm.sector_name 
                    WHERE su.is_active = 1 AND sm.sector_name IS NULL
                ''')
                orphaned_sectors = [row[0] for row in cursor.fetchall()]
                if orphaned_sectors:
                    report['issues'].append(f"Orphaned sectors: {orphaned_sectors}")
                    report['recommendations'].append("Add missing sectors to sector_mapping table")
                
                # Get basic stats
                cursor.execute("SELECT COUNT(*) FROM stock_universe WHERE is_active = 1")
                report['stats']['active_stocks'] = cursor.fetchone()[0]
                
                cursor.execute("SELECT COUNT(*) FROM sector_mapping WHERE is_active = 1")
                report['stats']['active_sectors'] = cursor.fetchone()[0]
                
                cursor.execute("SELECT COUNT(*) FROM universe_updates")
                report['stats']['total_updates'] = cursor.fetchone()[0]
                
                # Check WAL mode
                cursor.execute("PRAGMA journal_mode")
                journal_mode = cursor.fetchone()[0]
                report['stats']['journal_mode'] = journal_mode
                if journal_mode != 'wal':
                    report['recommendations'].append("Enable WAL mode for better concurrency")
                
                # Check foreign keys
                cursor.execute("PRAGMA foreign_keys")
                foreign_keys = cursor.fetchone()[0]
                report['stats']['foreign_keys_enabled'] = bool(foreign_keys)
                if not foreign_keys:
                    report['recommendations'].append("Enable foreign key constraints")
                
                logger.info(f"Database integrity check completed: {report['status']}")
                return report
                
        except Exception as e:
            logger.error(f"Error during integrity check: {e}")
            return {
                'status': 'error',
                'issues': [str(e)],
                'stats': {},
                'recommendations': ['Fix database connection issues']
            }
    
    @classmethod
    def update_popularity_metrics(cls, symbol: str, metrics: Dict) -> bool:
        """Update popularity metrics for a specific stock with ACID transaction"""
        try:
            with cls.get_connection('IMMEDIATE') as conn:
                cursor = conn.cursor()
                
                cursor.execute("BEGIN IMMEDIATE")
                
                try:
                    # Validate inputs
                    if not symbol or not symbol.strip():
                        raise ValueError("Invalid symbol provided")
                    
                    # Build update query dynamically based on provided metrics
                    valid_fields = {
                        'trading_volume', 'avg_daily_volume', 'volatility',
                        'price_change_1d', 'price_change_1w', 'price_change_1m', 'price_change_ytd',
                        'watchlist_count', 'buy_orders_count', 'sell_orders_count', 'total_trades_count',
                        'search_trend_score', 'logo_url', 'current_price'
                    }
                    
                    update_fields = []
                    values = []
                    
                    for field, value in metrics.items():
                        if field in valid_fields:
                            update_fields.append(f"{field} = ?")
                            values.append(value)
                    
                    if not update_fields:
                        logger.warning(f"No valid metrics provided for {symbol}")
                        cursor.execute("ROLLBACK")
                        return False
                    
                    # Add timestamp update
                    update_fields.append("last_price_update = CURRENT_TIMESTAMP")
                    values.append(symbol.upper())
                    
                    # Execute update
                    query = f'''
                        UPDATE stock_universe 
                        SET {', '.join(update_fields)}
                        WHERE symbol = ? AND is_active = 1
                    '''
                    
                    cursor.execute(query, values)
                    
                    if cursor.rowcount == 0:
                        logger.warning(f"Stock {symbol} not found for popularity update")
                        cursor.execute("ROLLBACK")
                        return False
                    
                    # Calculate and update popularity score
                    cls._calculate_popularity_score(cursor, symbol.upper())
                    
                    cursor.execute("COMMIT")
                    logger.info(f"✅ Updated popularity metrics for {symbol}")
                    return True
                    
                except Exception as e:
                    cursor.execute("ROLLBACK")
                    raise e
                    
        except Exception as e:
            logger.error(f"Error updating popularity metrics for {symbol}: {e}")
            return False
    
    @classmethod
    def _calculate_popularity_score(cls, cursor, symbol: str):
        """Calculate popularity score based on all criteria"""
        # Get current metrics
        cursor.execute('''
            SELECT trading_volume, avg_daily_volume, volatility, 
                   ABS(price_change_1d), ABS(price_change_1w), ABS(price_change_1m),
                   watchlist_count, total_trades_count, search_trend_score
            FROM stock_universe 
            WHERE symbol = ? AND is_active = 1
        ''', (symbol,))
        
        row = cursor.fetchone()
        if not row:
            return
        
        trading_vol, avg_vol, volatility, price_1d, price_1w, price_1m, watchlist, trades, search = row
        
        # Normalize and weight the scores (0-100 scale)
        # Trading Volume (25% weight)
        vol_score = min(25, (trading_vol or 0) / 1000000 * 10)  # Scale by millions
        
        # Volatility (20% weight) - higher volatility = more interest
        vol_score += min(20, (volatility or 0) * 100)  # Convert to percentage scale
        
        # Price Change (20% weight) - absolute change indicates activity
        price_score = min(20, ((price_1d or 0) + (price_1w or 0) + (price_1m or 0)) / 3 * 10)
        vol_score += price_score
        
        # Watchlist Activity (15% weight)
        watchlist_score = min(15, (watchlist or 0) / 100 * 15)
        vol_score += watchlist_score
        
        # Trading Activity (10% weight)
        trade_score = min(10, (trades or 0) / 1000 * 10)
        vol_score += trade_score
        
        # Search Trends (10% weight)
        search_score = min(10, (search or 0))
        vol_score += search_score
        
        # Update the popularity score
        cursor.execute('''
            UPDATE stock_universe 
            SET popularity_score = ?
            WHERE symbol = ? AND is_active = 1
        ''', (vol_score, symbol))
    
    @classmethod
    def get_popular_stocks(cls, limit: int = 20, criteria: str = 'overall') -> List[Dict]:
        """Get popular stocks based on specified criteria with ACID read"""
        if limit <= 0:
            limit = 20
        if limit > 100:  # Prevent excessive queries
            limit = 100
            
        try:
            with cls.get_connection('DEFERRED') as conn:
                cursor = conn.cursor()
                
                # Define order by criteria
                order_criteria = {
                    'overall': 'popularity_score DESC',
                    'trading_volume': 'trading_volume DESC',
                    'volatility': 'volatility DESC',
                    'price_change': 'ABS(price_change_1d) DESC',
                    'watchlist': 'watchlist_count DESC',
                    'trades': 'total_trades_count DESC',
                    'search_trends': 'search_trend_score DESC'
                }
                
                order_by = order_criteria.get(criteria, 'popularity_score DESC')
                
                cursor.execute(f'''
                    SELECT symbol, name, sector, industry, market_cap, exchange,
                           trading_volume, volatility, price_change_1d, price_change_1w, price_change_1m,
                           watchlist_count, total_trades_count, search_trend_score,
                           logo_url, current_price, popularity_score, last_price_update
                    FROM stock_universe 
                    WHERE is_active = 1 AND popularity_score > 0
                    ORDER BY {order_by}
                    LIMIT ?
                ''', (limit,))
                
                columns = ['symbol', 'name', 'sector', 'industry', 'market_cap', 'exchange',
                          'trading_volume', 'volatility', 'price_change_1d', 'price_change_1w', 'price_change_1m',
                          'watchlist_count', 'total_trades_count', 'search_trend_score',
                          'logo_url', 'current_price', 'popularity_score', 'last_price_update']
                
                stocks = []
                for row in cursor.fetchall():
                    stock = dict(zip(columns, row))
                    stocks.append(stock)
                
                logger.info(f"Retrieved {len(stocks)} popular stocks by {criteria}")
                return stocks
                
        except Exception as e:
            logger.error(f"Error getting popular stocks by {criteria}: {e}")
            return []

    @classmethod
    def optimize_database(cls) -> Dict:
        """
        Optimize database for performance and maintain ACID compliance
        """
        try:
            with cls.get_connection('EXCLUSIVE') as conn:
                cursor = conn.cursor()
                
                cursor.execute("BEGIN EXCLUSIVE")
                
                try:
                    # Analyze tables for query optimization
                    cursor.execute("ANALYZE")
                    
                    # Vacuum to reclaim space and reorganize
                    cursor.execute("VACUUM")
                    
                    # Update statistics
                    cursor.execute("PRAGMA optimize")
                    
                    cursor.execute("COMMIT")
                    
                    logger.info("✅ Database optimization completed")
                    return {'status': 'success', 'message': 'Database optimized successfully'}
                    
                except Exception as e:
                    cursor.execute("ROLLBACK")
                    raise e
                    
        except Exception as e:
            logger.error(f"Error optimizing database: {e}")
            return {'status': 'error', 'message': str(e)}
