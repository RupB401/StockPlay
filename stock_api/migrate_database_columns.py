"""
Database Migration Script for Adding Popularity Features
This script will add the new popularity columns to the existing database
"""

import sqlite3
import logging
import asyncio
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PopularityMigration:
    """Handle database migration for popularity features"""
    
    DB_PATH = Path(__file__).parent / "stock_universe.db"
    
    @classmethod
    def migrate_add_columns(cls):
        """Add new popularity columns to existing stock_universe table"""
        try:
            conn = sqlite3.connect(cls.DB_PATH)
            cursor = conn.cursor()
            
            # Check current schema
            cursor.execute("PRAGMA table_info(stock_universe)")
            existing_columns = [row[1] for row in cursor.fetchall()]
            logger.info(f"Current columns: {existing_columns}")
            
            # Define new columns to add
            new_columns = [
                ('trading_volume', 'REAL DEFAULT 0'),
                ('avg_daily_volume', 'REAL DEFAULT 0'),
                ('volatility', 'REAL DEFAULT 0'),
                ('price_change_1d', 'REAL DEFAULT 0'),
                ('price_change_1w', 'REAL DEFAULT 0'),
                ('price_change_1m', 'REAL DEFAULT 0'),
                ('price_change_ytd', 'REAL DEFAULT 0'),
                ('watchlist_count', 'INTEGER DEFAULT 0'),
                ('buy_orders_count', 'INTEGER DEFAULT 0'),
                ('sell_orders_count', 'INTEGER DEFAULT 0'),
                ('total_trades_count', 'INTEGER DEFAULT 0'),
                ('search_trend_score', 'REAL DEFAULT 0'),
                ('logo_url', 'TEXT'),
                ('current_price', 'REAL DEFAULT 0'),
                ('popularity_score', 'REAL DEFAULT 0'),
                ('last_price_update', 'TEXT DEFAULT "2025-01-01 00:00:00"')
            ]
            
            # Add missing columns
            columns_added = 0
            for column_name, column_def in new_columns:
                if column_name not in existing_columns:
                    try:
                        cursor.execute(f"ALTER TABLE stock_universe ADD COLUMN {column_name} {column_def}")
                        logger.info(f"✅ Added column: {column_name}")
                        columns_added += 1
                    except sqlite3.OperationalError as e:
                        if "duplicate column name" in str(e).lower():
                            logger.info(f"Column {column_name} already exists")
                        else:
                            logger.error(f"Error adding column {column_name}: {e}")
                            raise
                else:
                    logger.info(f"Column {column_name} already exists")
            
            # Create new indexes
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_stock_universe_popularity ON stock_universe(popularity_score DESC, is_active)",
                "CREATE INDEX IF NOT EXISTS idx_stock_universe_trading_volume ON stock_universe(trading_volume DESC, is_active)",
                "CREATE INDEX IF NOT EXISTS idx_stock_universe_volatility ON stock_universe(volatility DESC, is_active)",
                "CREATE INDEX IF NOT EXISTS idx_stock_universe_price_change ON stock_universe(price_change_1d DESC, is_active)",
                "CREATE INDEX IF NOT EXISTS idx_stock_universe_watchlist ON stock_universe(watchlist_count DESC, is_active)",
                "CREATE INDEX IF NOT EXISTS idx_stock_universe_trades ON stock_universe(total_trades_count DESC, is_active)",
                "CREATE INDEX IF NOT EXISTS idx_stock_universe_search_trend ON stock_universe(search_trend_score DESC, is_active)"
            ]
            
            for index_sql in indexes:
                try:
                    cursor.execute(index_sql)
                    logger.info(f"✅ Created/verified index")
                except Exception as e:
                    logger.warning(f"Index creation issue: {e}")
            
            # Commit changes
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Migration completed! Added {columns_added} new columns")
            return True
            
        except Exception as e:
            logger.error(f"Error during migration: {e}")
            if conn:
                conn.close()
            return False
    
    @classmethod
    def populate_sample_data(cls):
        """Add some sample popularity data for testing"""
        try:
            conn = sqlite3.connect(cls.DB_PATH)
            cursor = conn.cursor()
            
            # Sample data for popular stocks
            sample_data = [
                ('AAPL', 47250000, 45000000, 2.1, 1.23, 2.45, 3.67, 1250, 856, 734, 1590, 9.5, 193.60, 95.5),
                ('MSFT', 19340000, 18500000, 1.8, -0.29, 1.24, 2.89, 1180, 734, 623, 1357, 9.2, 424.30, 92.8),
                ('GOOGL', 25680000, 24000000, 2.5, 2.01, 3.45, 4.23, 1045, 623, 567, 1190, 8.9, 175.25, 89.2),
                ('NVDA', 41200000, 38000000, 4.2, 3.16, 5.67, 8.34, 1320, 789, 734, 1523, 9.4, 138.07, 94.1),
                ('TSLA', 89420000, 85000000, 5.8, 3.51, 6.78, 12.45, 1465, 892, 834, 1726, 9.3, 248.98, 93.7)
            ]
            
            for data in sample_data:
                symbol = data[0]
                # Check if stock exists
                cursor.execute("SELECT id FROM stock_universe WHERE symbol = ? AND is_active = 1", (symbol,))
                if cursor.fetchone():
                    cursor.execute('''
                        UPDATE stock_universe 
                        SET trading_volume = ?, avg_daily_volume = ?, volatility = ?,
                            price_change_1d = ?, price_change_1w = ?, price_change_1m = ?,
                            watchlist_count = ?, buy_orders_count = ?, sell_orders_count = ?,
                            total_trades_count = ?, search_trend_score = ?, current_price = ?,
                            popularity_score = ?, last_price_update = CURRENT_TIMESTAMP
                        WHERE symbol = ? AND is_active = 1
                    ''', data[1:] + (symbol,))
                    logger.info(f"✅ Updated sample data for {symbol}")
                else:
                    # Insert new stock
                    cursor.execute('''
                        INSERT INTO stock_universe 
                        (symbol, name, sector, industry, market_cap, exchange, is_active,
                         trading_volume, avg_daily_volume, volatility, price_change_1d, price_change_1w, price_change_1m,
                         watchlist_count, buy_orders_count, sell_orders_count, total_trades_count, 
                         search_trend_score, current_price, popularity_score)
                        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''', (
                        symbol, f"{symbol} Corporation", "Technology", "Technology Services", 
                        1000000000, "NASDAQ"
                    ) + data[1:])
                    logger.info(f"✅ Inserted sample data for {symbol}")
            
            conn.commit()
            conn.close()
            
            logger.info("✅ Sample popularity data populated")
            return True
            
        except Exception as e:
            logger.error(f"Error populating sample data: {e}")
            if conn:
                conn.close()
            return False
    
    @classmethod
    def verify_migration(cls):
        """Verify the migration was successful"""
        try:
            conn = sqlite3.connect(cls.DB_PATH)
            cursor = conn.cursor()
            
            # Check new columns exist
            cursor.execute("PRAGMA table_info(stock_universe)")
            columns = [row[1] for row in cursor.fetchall()]
            
            required_columns = [
                'trading_volume', 'avg_daily_volume', 'volatility',
                'price_change_1d', 'price_change_1w', 'price_change_1m',
                'watchlist_count', 'total_trades_count', 'search_trend_score',
                'logo_url', 'current_price', 'popularity_score'
            ]
            
            missing_columns = [col for col in required_columns if col not in columns]
            
            if missing_columns:
                logger.error(f"❌ Missing columns: {missing_columns}")
                return False
            
            # Check if we have stocks with popularity data
            cursor.execute("SELECT COUNT(*) FROM stock_universe WHERE popularity_score > 0")
            popular_count = cursor.fetchone()[0]
            
            logger.info(f"✅ Migration verification successful!")
            logger.info(f"  - All required columns present: {len(required_columns)}")
            logger.info(f"  - Stocks with popularity data: {popular_count}")
            
            # Show sample popular stocks
            cursor.execute('''
                SELECT symbol, name, popularity_score, current_price 
                FROM stock_universe 
                WHERE popularity_score > 0 
                ORDER BY popularity_score DESC 
                LIMIT 5
            ''')
            
            sample_stocks = cursor.fetchall()
            if sample_stocks:
                logger.info("  - Top popular stocks:")
                for stock in sample_stocks:
                    logger.info(f"    {stock[0]}: {stock[1]} (Score: {stock[2]:.1f}, Price: ${stock[3]:.2f})")
            
            conn.close()
            return True
            
        except Exception as e:
            logger.error(f"Error verifying migration: {e}")
            if conn:
                conn.close()
            return False

def main():
    """Run the migration"""
    migration = PopularityMigration()
    
    print("🚀 Starting database migration for popularity features...")
    
    # Step 1: Add new columns
    if not migration.migrate_add_columns():
        print("❌ Failed to add new columns")
        return False
    
    # Step 2: Populate sample data
    if not migration.populate_sample_data():
        print("❌ Failed to populate sample data")
        return False
    
    # Step 3: Verify migration
    if not migration.verify_migration():
        print("❌ Migration verification failed")
        return False
    
    print("✅ Database migration completed successfully!")
    print("🎉 The popularity-based stock system is now ready!")
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        exit(1)
