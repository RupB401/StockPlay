"""
Database Migration Script for Popularity Features
This script will update the existing database schema to include popularity criteria
"""

import sqlite3
import logging
import asyncio
from stock_universe_database import StockUniverseDatabase
from popularity_service import PopularityService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class DatabaseMigration:
    """Handle database migration for popularity features"""
    
    @classmethod
    def migrate_schema(cls):
        """Add new columns to existing stock_universe table"""
        try:
            # First, create the tables (this will update the schema)
            logger.info("Creating/updating database tables...")
            StockUniverseDatabase.create_tables()
            
            # Check if we need to add columns to existing data
            with StockUniverseDatabase.get_connection('EXCLUSIVE') as conn:
                cursor = conn.cursor()
                
                # Check current schema
                cursor.execute("PRAGMA table_info(stock_universe)")
                columns = [row[1] for row in cursor.fetchall()]
                
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
                    ('last_price_update', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP')
                ]
                
                # Add missing columns
                for column_name, column_def in new_columns:
                    if column_name not in columns:
                        try:
                            cursor.execute(f"ALTER TABLE stock_universe ADD COLUMN {column_name} {column_def}")
                            logger.info(f"✅ Added column: {column_name}")
                        except sqlite3.OperationalError as e:
                            if "duplicate column name" in str(e).lower():
                                logger.info(f"Column {column_name} already exists")
                            else:
                                logger.error(f"Error adding column {column_name}: {e}")
                
                # Create new indexes if they don't exist
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
                        logger.info(f"✅ Created index")
                    except Exception as e:
                        logger.warning(f"Index creation issue: {e}")
                
                # Commit changes
                conn.commit()
                logger.info("✅ Database schema migration completed")
                
        except Exception as e:
            logger.error(f"Error during schema migration: {e}")
            raise
    
    @classmethod
    async def populate_initial_data(cls):
        """Populate initial popularity data for popular stocks"""
        try:
            logger.info("Populating initial popularity data...")
            
            # List of popular stocks to initialize
            popular_symbols = [
                'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'TSLA', 'META', 'NFLX',
                'JPM', 'V', 'WMT', 'HD', 'PG', 'JNJ', 'MA', 'BAC', 'UNH', 'PFE',
                'KO', 'ABBV', 'CVX', 'XOM', 'TMO', 'CRM', 'ADBE', 'DHR', 'ABT',
                'MRK', 'LLY', 'COST', 'NKE', 'ORCL', 'INTC', 'AMD', 'QCOM'
            ]
            
            # Check which stocks exist in database
            active_stocks = StockUniverseDatabase.get_active_stocks()
            existing_symbols = {stock['symbol'] for stock in active_stocks}
            
            # Add missing popular stocks
            missing_stocks = []
            for symbol in popular_symbols:
                if symbol not in existing_symbols:
                    missing_stocks.append({
                        'symbol': symbol,
                        'name': f"{symbol} Corporation",
                        'sector': 'Unknown',
                        'industry': 'Unknown',
                        'market_cap': 0,
                        'exchange': 'NASDAQ',
                        'logo_url': f"https://logo.clearbit.com/{symbol.lower()}.com",
                        'current_price': 0
                    })
            
            if missing_stocks:
                logger.info(f"Adding {len(missing_stocks)} missing popular stocks...")
                stats = StockUniverseDatabase._update_database(missing_stocks)
                logger.info(f"Added stocks: {stats}")
            
            # Update popularity data for existing stocks
            logger.info("Updating popularity data for stocks...")
            successful_updates = 0
            
            for symbol in popular_symbols[:20]:  # Start with top 20
                try:
                    success = await PopularityService.update_stock_popularity_data(symbol)
                    if success:
                        successful_updates += 1
                    
                    # Rate limiting
                    await asyncio.sleep(1)
                    
                except Exception as e:
                    logger.warning(f"Error updating {symbol}: {e}")
                    continue
            
            logger.info(f"✅ Updated popularity data for {successful_updates} stocks")
            
        except Exception as e:
            logger.error(f"Error populating initial data: {e}")
            raise
    
    @classmethod
    async def run_full_migration(cls):
        """Run complete migration process"""
        try:
            logger.info("🚀 Starting database migration for popularity features...")
            
            # Step 1: Update schema
            cls.migrate_schema()
            
            # Step 2: Populate initial data
            await cls.populate_initial_data()
            
            # Step 3: Verify migration
            popular_stocks = StockUniverseDatabase.get_popular_stocks(limit=10)
            logger.info(f"✅ Migration completed! Found {len(popular_stocks)} stocks with popularity data")
            
            # Display sample results
            if popular_stocks:
                logger.info("Sample popular stocks:")
                for stock in popular_stocks[:5]:
                    logger.info(f"  {stock['symbol']}: {stock['name']} (Score: {stock['popularity_score']:.1f})")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            return False

async def main():
    """Run the migration"""
    migration = DatabaseMigration()
    success = await migration.run_full_migration()
    
    if success:
        print("✅ Database migration completed successfully!")
        print("You can now use the popularity-based stock system.")
    else:
        print("❌ Migration failed. Check the logs for details.")

if __name__ == "__main__":
    asyncio.run(main())
