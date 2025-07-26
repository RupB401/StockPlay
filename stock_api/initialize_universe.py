#!/usr/bin/env python3
"""
Initialize Stock Universe Database
Run this script to set up and populate the stock universe database
"""
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from stock_universe_database import StockUniverseDatabase
import logging

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    """Initialize the stock universe database"""
    print("🚀 Initializing Stock Universe Database System")
    print("=" * 50)
    
    # Step 1: Create tables
    print("\n📋 Step 1: Creating database tables...")
    try:
        StockUniverseDatabase.create_tables()
        print("✅ Database tables created successfully")
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False
    
    # Step 2: Check if update is needed
    print("\n🔍 Step 2: Checking if update is needed...")
    try:
        needs_update = StockUniverseDatabase.needs_update()
        print(f"📊 Update needed: {needs_update}")
    except Exception as e:
        print(f"❌ Error checking update status: {e}")
        return False
    
    # Step 3: Run initial update
    print("\n🔄 Step 3: Running initial stock universe update...")
    try:
        result = StockUniverseDatabase.update_universe(force=True)
        
        if result['status'] == 'success':
            print("✅ Initial update completed successfully!")
            print(f"📈 Stats: {result.get('stats', {})}")
        else:
            print(f"❌ Update failed: {result.get('message', 'Unknown error')}")
            return False
            
    except Exception as e:
        print(f"❌ Error during initial update: {e}")
        return False
    
    # Step 4: Verify data
    print("\n✅ Step 4: Verifying data...")
    try:
        active_stocks = StockUniverseDatabase.get_active_stocks()
        sectors = StockUniverseDatabase.get_available_sectors()
        last_update = StockUniverseDatabase.get_last_update_info()
        
        print(f"📊 Total active stocks: {len(active_stocks)}")
        print(f"🏭 Total sectors: {len(sectors)}")
        print(f"📅 Last update: {last_update.get('update_date', 'Unknown') if last_update else 'None'}")
        
        # Show sector breakdown
        print("\n🏭 Sector breakdown:")
        for sector in sectors:
            print(f"  • {sector['display_name']}: {sector['stock_count']} stocks")
            
    except Exception as e:
        print(f"❌ Error verifying data: {e}")
        return False
    
    print("\n🎉 Stock Universe Database initialized successfully!")
    print("🔗 You can now:")
    print("  • Visit http://localhost:5174/stock-universe to view the management interface")
    print("  • Use the updated screener with dynamic stock filtering")
    print("  • The system will auto-update every 3 days")
    
    return True

if __name__ == "__main__":
    success = main()
    if not success:
        sys.exit(1)
