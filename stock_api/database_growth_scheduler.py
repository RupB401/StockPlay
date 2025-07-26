#!/usr/bin/env python3
"""
Stock Database Growth Scheduler
Automatically expands stock database at regular intervals to ensure we always have numerous stocks
"""

import schedule
import time
import threading
import logging
from datetime import datetime
import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from auto_stock_expander import AutoStockExpander

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('stock_database_growth.log'),
        logging.StreamHandler()
    ]
)

class StockDatabaseGrowthScheduler:
    def __init__(self):
        self.expander = AutoStockExpander()
        self.is_running = False
        self.scheduler_thread = None
        
    def run_expansion_job(self):
        """Job function to run database expansion"""
        try:
            logging.info("🚀 Starting scheduled database expansion check")
            result = self.expander.scheduled_expansion()
            
            if result:
                logging.info("✅ Database expansion completed successfully")
            else:
                logging.info("ℹ️ No expansion needed at this time")
                
        except Exception as e:
            logging.error(f"❌ Error during scheduled expansion: {e}")
    
    def start_scheduler(self):
        """Start the background scheduler"""
        if self.is_running:
            logging.warning("Scheduler is already running")
            return
            
        # Schedule database expansion checks
        schedule.every(6).hours.do(self.run_expansion_job)  # Check every 6 hours
        schedule.every().day.at("09:00").do(self.run_expansion_job)  # Daily at 9 AM
        schedule.every().day.at("15:00").do(self.run_expansion_job)  # Daily at 3 PM
        schedule.every().week.do(self.run_expansion_job)  # Weekly check
        
        self.is_running = True
        
        def run_scheduler():
            logging.info("📅 Stock Database Growth Scheduler started")
            logging.info("⏰ Scheduled checks: Every 6 hours, Daily at 9 AM & 3 PM, Weekly")
            
            while self.is_running:
                try:
                    schedule.run_pending()
                    time.sleep(60)  # Check every minute
                except Exception as e:
                    logging.error(f"Scheduler error: {e}")
                    time.sleep(60)
                    
        self.scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        self.scheduler_thread.start()
        
        logging.info("✅ Scheduler thread started successfully")
    
    def stop_scheduler(self):
        """Stop the scheduler"""
        self.is_running = False
        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=5)
        schedule.clear()
        logging.info("🛑 Scheduler stopped")
    
    def run_immediate_check(self):
        """Run an immediate expansion check"""
        logging.info("🔄 Running immediate database expansion check")
        self.run_expansion_job()

def main():
    """Main function to start the scheduler as a standalone service"""
    scheduler = StockDatabaseGrowthScheduler()
    
    try:
        # Run immediate check on startup
        scheduler.run_immediate_check()
        
        # Start the background scheduler
        scheduler.start_scheduler()
        
        # Keep the main thread alive
        while True:
            time.sleep(10)
            
    except KeyboardInterrupt:
        logging.info("🔴 Received interrupt signal, shutting down...")
        scheduler.stop_scheduler()
        sys.exit(0)
    except Exception as e:
        logging.error(f"Fatal error: {e}")
        scheduler.stop_scheduler()
        sys.exit(1)

if __name__ == "__main__":
    main()
