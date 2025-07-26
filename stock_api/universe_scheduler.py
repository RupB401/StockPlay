"""
Stock Universe Update Scheduler
Handles automatic updates of the stock universe at regular intervals
"""
import schedule
import time
import threading
import logging
from datetime import datetime
from stock_universe_database import StockUniverseDatabase

logger = logging.getLogger(__name__)

class UniverseUpdateScheduler:
    """Scheduler for automatic stock universe updates"""
    
    def __init__(self):
        self.running = False
        self.thread = None
    
    def start_scheduler(self):
        """Start the background scheduler"""
        if self.running:
            logger.warning("Scheduler is already running")
            return
        
        self.running = True
        
        # Schedule updates every 3 days at 2 AM
        schedule.every(3).days.at("02:00").do(self.run_scheduled_update)
        
        # Also schedule a daily check at 8 AM (will only update if needed)
        schedule.every().day.at("08:00").do(self.check_and_update)
        
        # Start the scheduler thread
        self.thread = threading.Thread(target=self._run_scheduler, daemon=True)
        self.thread.start()
        
        logger.info("✅ Stock universe update scheduler started")
        logger.info("📅 Scheduled: Every 3 days at 2:00 AM (with daily checks at 8:00 AM)")
    
    def stop_scheduler(self):
        """Stop the background scheduler"""
        self.running = False
        schedule.clear()
        logger.info("🛑 Stock universe update scheduler stopped")
    
    def _run_scheduler(self):
        """Internal method to run the scheduler loop"""
        while self.running:
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                time.sleep(300)  # Wait 5 minutes before retrying
    
    def run_scheduled_update(self):
        """Run a scheduled update"""
        try:
            logger.info("🔄 Running scheduled stock universe update...")
            
            result = StockUniverseDatabase.update_universe(force=False)
            
            if result['status'] == 'success':
                logger.info(f"✅ Scheduled update completed: {result['message']}")
            elif result['status'] == 'skipped':
                logger.info(f"⏭️ Scheduled update skipped: {result['message']}")
            else:
                logger.error(f"❌ Scheduled update failed: {result['message']}")
                
        except Exception as e:
            logger.error(f"Error in scheduled update: {e}")
    
    def check_and_update(self):
        """Check if update is needed and run if necessary"""
        try:
            if StockUniverseDatabase.needs_update():
                logger.info("🔍 Daily check: Update needed, running update...")
                self.run_scheduled_update()
            else:
                logger.info("🔍 Daily check: Universe is up to date")
                
        except Exception as e:
            logger.error(f"Error in daily check: {e}")

# Global scheduler instance
universe_scheduler = UniverseUpdateScheduler()

def start_universe_scheduler():
    """Start the universe update scheduler"""
    universe_scheduler.start_scheduler()

def stop_universe_scheduler():
    """Stop the universe update scheduler"""
    universe_scheduler.stop_scheduler()

if __name__ == "__main__":
    # For testing the scheduler
    logging.basicConfig(level=logging.INFO)
    
    print("Starting universe update scheduler test...")
    start_universe_scheduler()
    
    try:
        # Keep the script running
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nStopping scheduler...")
        stop_universe_scheduler()
        print("Scheduler stopped.")
