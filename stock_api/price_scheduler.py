"""
Stock Price Update Scheduler
Handles automatic updates of stock prices for all holdings at regular intervals
"""

import schedule
import threading
import time
import logging
from datetime import datetime, timedelta
from typing import List, Dict
import asyncio
from database import get_connection
from trading_service import TradingService

logger = logging.getLogger(__name__)

class PriceUpdateScheduler:
    """Scheduler for automatic stock price updates"""
    
    def __init__(self):
        self.running = False
        self.thread = None
        self.trading_service = TradingService()
    
    def start_scheduler(self):
        """Start the background price update scheduler"""
        if self.running:
            logger.warning("Price update scheduler is already running")
            return
        
        self.running = True
        
        # Schedule price updates every 5 minutes during market hours (9 AM - 6 PM)
        schedule.every(5).minutes.do(self.update_all_stock_prices)
        
        # Also schedule a comprehensive update at market open (9:30 AM) and close (4 PM)
        schedule.every().day.at("09:30").do(self.comprehensive_price_update)
        schedule.every().day.at("16:00").do(self.comprehensive_price_update)
        
        # Start the scheduler thread
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        
        logger.info("✅ Stock price update scheduler started")
        logger.info("📅 Scheduled: Every 5 minutes (market hours) + comprehensive updates at 9:30 AM & 4:00 PM")
    
    def stop_scheduler(self):
        """Stop the background price update scheduler"""
        self.running = False
        schedule.clear()
        logger.info("🛑 Stock price update scheduler stopped")
    
    def _run_scheduler(self):
        """Background thread to run the scheduler"""
        while self.running:
            try:
                schedule.run_pending()
                time.sleep(30)  # Check every 30 seconds
            except Exception as e:
                logger.error(f"❌ Error in price update scheduler: {e}")
                time.sleep(60)  # Wait longer on error
    
    def update_all_stock_prices(self):
        """Update prices for all stocks currently held by users"""
        try:
            current_time = datetime.now().time()
            # Only update during market hours (9 AM - 6 PM) on weekdays
            if current_time < datetime.strptime("09:00", "%H:%M").time() or \
               current_time > datetime.strptime("18:00", "%H:%M").time():
                return
            
            # Skip weekends
            if datetime.now().weekday() >= 5:  # Saturday = 5, Sunday = 6
                return
            
            logger.info("🔄 Starting stock price updates...")
            
            # Run the async update function
            asyncio.run(self._async_update_prices())
            
            logger.info("✅ Stock price updates completed")
            
        except Exception as e:
            logger.error(f"❌ Error updating stock prices: {e}")
    
    def comprehensive_price_update(self):
        """Comprehensive price update regardless of market hours"""
        try:
            logger.info("🔄 Starting comprehensive stock price update...")
            asyncio.run(self._async_update_prices(comprehensive=True))
            logger.info("✅ Comprehensive stock price update completed")
        except Exception as e:
            logger.error(f"❌ Error in comprehensive price update: {e}")
    
    async def _async_update_prices(self, comprehensive: bool = False):
        """Async function to update all stock prices"""
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            # Get all unique symbols from holdings
            cursor.execute("""
                SELECT DISTINCT symbol FROM stock_holdings 
                WHERE quantity > 0
            """)
            
            symbols = [row[0] for row in cursor.fetchall()]
            
            if not symbols:
                logger.info("No active holdings found, skipping price update")
                conn.close()
                return
            
            logger.info(f"Updating prices for {len(symbols)} symbols: {', '.join(symbols)}")
            
            updated_count = 0
            failed_count = 0
            
            for symbol in symbols:
                try:
                    # Get real-time price
                    real_time_price = await self.trading_service.get_real_time_price(symbol)
                    
                    if real_time_price and real_time_price > 0:
                        # Update all holdings for this symbol
                        cursor.execute("""
                            UPDATE stock_holdings 
                            SET current_price = %s, 
                                current_value = quantity * %s, 
                                last_updated = CURRENT_TIMESTAMP
                            WHERE symbol = %s AND quantity > 0
                        """, (real_time_price, real_time_price, symbol))
                        
                        # Update price cache
                        await self.trading_service._update_price_cache(symbol, real_time_price)
                        
                        updated_count += 1
                        logger.debug(f"✅ Updated {symbol}: ${real_time_price:.2f}")
                        
                    else:
                        failed_count += 1
                        logger.warning(f"❌ Failed to get price for {symbol}")
                        
                except Exception as e:
                    failed_count += 1
                    logger.error(f"❌ Error updating price for {symbol}: {e}")
                    continue
                
                # Small delay to avoid overwhelming APIs
                await asyncio.sleep(0.5)
            
            # Commit all updates
            conn.commit()
            conn.close()
            
            logger.info(f"Price update summary: {updated_count} updated, {failed_count} failed")
            
        except Exception as e:
            logger.error(f"❌ Error in async price update: {e}")
            if conn:
                conn.close()
    
    def force_update_symbol(self, symbol: str):
        """Force update price for a specific symbol"""
        try:
            logger.info(f"🔄 Force updating price for {symbol}...")
            asyncio.run(self._force_update_single_symbol(symbol))
        except Exception as e:
            logger.error(f"❌ Error force updating {symbol}: {e}")
    
    async def _force_update_single_symbol(self, symbol: str):
        """Force update price for a single symbol"""
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            # Get real-time price
            real_time_price = await self.trading_service.get_real_time_price(symbol)
            
            if real_time_price and real_time_price > 0:
                # Update all holdings for this symbol
                cursor.execute("""
                    UPDATE stock_holdings 
                    SET current_price = %s, 
                        current_value = quantity * %s, 
                        last_updated = CURRENT_TIMESTAMP
                    WHERE symbol = %s AND quantity > 0
                """, (real_time_price, real_time_price, symbol))
                
                # Update price cache
                await self.trading_service._update_price_cache(symbol, real_time_price)
                
                conn.commit()
                logger.info(f"✅ Force updated {symbol}: ${real_time_price:.2f}")
            else:
                logger.warning(f"❌ Failed to get real-time price for {symbol}")
            
            conn.close()
            
        except Exception as e:
            logger.error(f"❌ Error in force update for {symbol}: {e}")
            if conn:
                conn.close()

# Global scheduler instance
price_scheduler = PriceUpdateScheduler()

def start_price_scheduler():
    """Start the price update scheduler"""
    price_scheduler.start_scheduler()

def stop_price_scheduler():
    """Stop the price update scheduler"""
    price_scheduler.stop_scheduler()

def force_price_update(symbol: str = None):
    """Force price update for specific symbol or all symbols"""
    if symbol:
        price_scheduler.force_update_symbol(symbol)
    else:
        price_scheduler.comprehensive_price_update()
