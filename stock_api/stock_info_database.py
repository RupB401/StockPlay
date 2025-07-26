"""
Stock Information Database Module
Handles stock search tracking, performance analysis, and dynamic market cap allocation
"""

import psycopg2
import psycopg2.extras
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Optional
from database import get_connection

logging.basicConfig(level=logging.INFO)

class StockInfoDatabase:
    
    @staticmethod
    def create_stock_info_table():
        """Create stock_info table for tracking searches and stock performance"""
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            # Stock Information and Search Tracking Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS stock_info (
                    id SERIAL PRIMARY KEY,
                    symbol VARCHAR(10) UNIQUE NOT NULL,
                    company_name VARCHAR(255) NOT NULL,
                    market_cap BIGINT DEFAULT 0,
                    market_cap_category VARCHAR(20) DEFAULT 'unknown' CHECK (market_cap_category IN ('large', 'mid', 'small', 'micro', 'unknown')),
                    sector VARCHAR(100),
                    industry VARCHAR(100),
                    logo_url VARCHAR(500),
                    current_price DECIMAL(10, 4) DEFAULT 0.00,
                    price_change DECIMAL(10, 4) DEFAULT 0.00,
                    price_change_percent DECIMAL(8, 4) DEFAULT 0.00,
                    volume BIGINT DEFAULT 0,
                    avg_volume BIGINT DEFAULT 0,
                    pe_ratio DECIMAL(10, 4),
                    pb_ratio DECIMAL(10, 4),
                    dividend_yield DECIMAL(8, 4),
                    search_count INTEGER DEFAULT 0,
                    popularity_score DECIMAL(8, 4) DEFAULT 0.00,
                    performance_score DECIMAL(8, 4) DEFAULT 0.00,
                    trending_score DECIMAL(8, 4) DEFAULT 0.00,
                    last_searched_at TIMESTAMP,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            
            # User Search History Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_search_history (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER,
                    symbol VARCHAR(10) NOT NULL,
                    search_type VARCHAR(50) DEFAULT 'manual' CHECK (search_type IN ('manual', 'autocomplete', 'trending')),
                    searched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    session_id VARCHAR(100),
                    ip_address VARCHAR(45),
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
                );
            """)
            
            # Stock Performance Metrics Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS stock_performance_metrics (
                    id SERIAL PRIMARY KEY,
                    symbol VARCHAR(10) NOT NULL,
                    metric_date DATE DEFAULT CURRENT_DATE,
                    daily_return DECIMAL(8, 4),
                    weekly_return DECIMAL(8, 4),
                    monthly_return DECIMAL(8, 4),
                    quarterly_return DECIMAL(8, 4),
                    yearly_return DECIMAL(8, 4),
                    volatility DECIMAL(8, 4),
                    volume_change_percent DECIMAL(8, 4),
                    relative_strength DECIMAL(8, 4),
                    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(symbol, metric_date)
                );
            """)
            
            # Check which columns exist before creating indexes
            cursor.execute("""
                SELECT column_name FROM information_schema.columns 
                WHERE table_name = 'stock_info';
            """)
            existing_columns = [row[0] for row in cursor.fetchall()]
            
            # Create indexes for better performance (only if columns exist)
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_stock_info_symbol ON stock_info(symbol);")
            
            # Only create indexes if the columns exist
            if 'market_cap_category' in existing_columns:
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_stock_info_market_cap ON stock_info(market_cap_category);")
            else:
                logging.warning("⚠️ market_cap_category column does not exist, skipping index creation")
            
            if 'popularity_score' in existing_columns:
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_stock_info_popularity ON stock_info(popularity_score DESC);")
            else:
                logging.warning("⚠️ popularity_score column does not exist, skipping index creation")
                
            if 'performance_score' in existing_columns:
                cursor.execute("CREATE INDEX IF NOT EXISTS idx_stock_info_performance ON stock_info(performance_score DESC);")
            else:
                logging.warning("⚠️ performance_score column does not exist, skipping index creation")
            
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_search_user_id ON user_search_history(user_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_search_symbol ON user_search_history(symbol);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_search_time ON user_search_history(searched_at);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_performance_symbol ON stock_performance_metrics(symbol);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_performance_date ON stock_performance_metrics(metric_date);")
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logging.info("✅ Stock info tables created successfully")
            
        except Exception as e:
            logging.error(f"❌ Error creating stock info tables: {e}")
            raise e
    
    @staticmethod
    def track_search(symbol: str, user_id: Optional[int] = None, search_type: str = 'manual', session_id: Optional[str] = None, ip_address: Optional[str] = None) -> bool:
        """Track user search and update stock popularity"""
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            # Update search history
            cursor.execute("""
                INSERT INTO user_search_history (user_id, symbol, search_type, session_id, ip_address)
                VALUES (%s, %s, %s, %s, %s)
            """, (user_id, symbol.upper(), search_type, session_id, ip_address))
            
            # Update stock info search count and last searched time
            cursor.execute("""
                UPDATE stock_info 
                SET search_count = search_count + 1, 
                    last_searched_at = CURRENT_TIMESTAMP
                WHERE symbol = %s
            """, (symbol.upper(),))
            
            # If stock doesn't exist, we'll create it with basic info
            if cursor.rowcount == 0:
                cursor.execute("""
                    INSERT INTO stock_info (symbol, company_name, search_count, last_searched_at)
                    VALUES (%s, %s, 1, CURRENT_TIMESTAMP)
                    ON CONFLICT (symbol) DO UPDATE SET
                    search_count = stock_info.search_count + 1,
                    last_searched_at = CURRENT_TIMESTAMP
                """, (symbol.upper(), f"{symbol.upper()} Inc."))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logging.info(f"✅ Search tracked for {symbol}")
            return True
            
        except Exception as e:
            logging.error(f"❌ Error tracking search for {symbol}: {e}")
            return False
    
    @staticmethod
    def update_stock_info(symbol: str, stock_data: Dict) -> bool:
        """Update comprehensive stock information"""
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            # Determine market cap category
            market_cap = stock_data.get('market_cap', 0)
            if market_cap >= 10_000_000_000:  # 10B+
                market_cap_category = 'large'
            elif market_cap >= 2_000_000_000:  # 2B-10B
                market_cap_category = 'mid'
            elif market_cap >= 300_000_000:   # 300M-2B
                market_cap_category = 'small'
            elif market_cap > 0:              # <300M
                market_cap_category = 'micro'
            else:
                market_cap_category = 'unknown'
            
            cursor.execute("""
                INSERT INTO stock_info (
                    symbol, company_name, market_cap, market_cap_category, sector, industry,
                    logo_url, current_price, price_change, price_change_percent,
                    volume, avg_volume, pe_ratio, pb_ratio, dividend_yield, last_updated
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (symbol) DO UPDATE SET
                    company_name = EXCLUDED.company_name,
                    market_cap = EXCLUDED.market_cap,
                    market_cap_category = EXCLUDED.market_cap_category,
                    sector = EXCLUDED.sector,
                    industry = EXCLUDED.industry,
                    logo_url = EXCLUDED.logo_url,
                    current_price = EXCLUDED.current_price,
                    price_change = EXCLUDED.price_change,
                    price_change_percent = EXCLUDED.price_change_percent,
                    volume = EXCLUDED.volume,
                    avg_volume = EXCLUDED.avg_volume,
                    pe_ratio = EXCLUDED.pe_ratio,
                    pb_ratio = EXCLUDED.pb_ratio,
                    dividend_yield = EXCLUDED.dividend_yield,
                    last_updated = CURRENT_TIMESTAMP
            """, (
                symbol.upper(),
                stock_data.get('company_name', f"{symbol.upper()} Inc."),
                market_cap,
                market_cap_category,
                stock_data.get('sector'),
                stock_data.get('industry'),
                stock_data.get('logo_url'),
                stock_data.get('current_price', 0),
                stock_data.get('price_change', 0),
                stock_data.get('price_change_percent', 0),
                stock_data.get('volume', 0),
                stock_data.get('avg_volume', 0),
                stock_data.get('pe_ratio'),
                stock_data.get('pb_ratio'),
                stock_data.get('dividend_yield')
            ))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logging.info(f"✅ Stock info updated for {symbol}")
            return True
            
        except Exception as e:
            logging.error(f"❌ Error updating stock info for {symbol}: {e}")
            return False
    
    @staticmethod
    def get_popular_stocks(limit: int = 10, time_window_days: int = 30) -> List[Dict]:
        """Get most popular stocks based on search frequency"""
        try:
            conn = get_connection()
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            cursor.execute("""
                SELECT 
                    si.symbol,
                    si.company_name,
                    si.current_price,
                    si.price_change,
                    si.price_change_percent,
                    si.market_cap,
                    si.market_cap_category,
                    si.logo_url,
                    si.search_count,
                    si.popularity_score,
                    COUNT(ush.id) as recent_searches
                FROM stock_info si
                LEFT JOIN user_search_history ush ON si.symbol = ush.symbol 
                    AND ush.searched_at >= CURRENT_TIMESTAMP - INTERVAL '%s days'
                WHERE si.search_count > 0
                GROUP BY si.symbol, si.company_name, si.current_price, si.price_change, 
                         si.price_change_percent, si.market_cap, si.market_cap_category, 
                         si.logo_url, si.search_count, si.popularity_score
                ORDER BY recent_searches DESC, si.search_count DESC
                LIMIT %s
            """, (time_window_days, limit))
            
            stocks = cursor.fetchall()
            cursor.close()
            conn.close()
            
            return [dict(stock) for stock in stocks]
            
        except Exception as e:
            logging.error(f"❌ Error getting popular stocks: {e}")
            return []
    
    @staticmethod
    def get_stocks_by_market_cap(category: str, limit: int = 10) -> List[Dict]:
        """Get stocks filtered by market cap category"""
        try:
            conn = get_connection()
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            cursor.execute("""
                SELECT 
                    symbol, company_name, current_price, price_change, price_change_percent,
                    market_cap, logo_url, search_count, performance_score
                FROM stock_info
                WHERE market_cap_category = %s AND search_count > 0
                ORDER BY performance_score DESC, search_count DESC
                LIMIT %s
            """, (category, limit))
            
            stocks = cursor.fetchall()
            cursor.close()
            conn.close()
            
            return [dict(stock) for stock in stocks]
            
        except Exception as e:
            logging.error(f"❌ Error getting {category} cap stocks: {e}")
            return []
    
    @staticmethod
    def calculate_popularity_scores():
        """Calculate and update popularity scores for all stocks"""
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            # Update popularity scores based on recent searches and total searches
            cursor.execute("""
                UPDATE stock_info SET 
                popularity_score = (
                    (search_count * 0.3) + 
                    (COALESCE(recent_search_weight, 0) * 0.7)
                )
                FROM (
                    SELECT 
                        si.symbol,
                        COUNT(ush.id) FILTER (WHERE ush.searched_at >= CURRENT_TIMESTAMP - INTERVAL '7 days') * 10 +
                        COUNT(ush.id) FILTER (WHERE ush.searched_at >= CURRENT_TIMESTAMP - INTERVAL '30 days') * 5 +
                        COUNT(ush.id) FILTER (WHERE ush.searched_at >= CURRENT_TIMESTAMP - INTERVAL '90 days') * 2 as recent_search_weight
                    FROM stock_info si
                    LEFT JOIN user_search_history ush ON si.symbol = ush.symbol
                    GROUP BY si.symbol
                ) recent_data
                WHERE stock_info.symbol = recent_data.symbol
            """)
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logging.info("✅ Popularity scores updated")
            return True
            
        except Exception as e:
            logging.error(f"❌ Error calculating popularity scores: {e}")
            return False
