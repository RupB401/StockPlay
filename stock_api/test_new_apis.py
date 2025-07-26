#!/usr/bin/env python3

import requests
import asyncio
from trading_service import TradingService

async def force_portfolio_update():
    """Force update portfolio prices to test the new API system"""
    try:
        print("=== TESTING NEW API SYSTEM ===")
        
        # Test the trading service directly
        trading_service = TradingService()
        
        symbols = ['GOOGL', 'TSLA', 'AAPL', 'BRK.B']
        
        for symbol in symbols:
            print(f"\nTesting {symbol}:")
            
            # Test price fetching
            price = await trading_service.get_real_time_price(symbol)
            
            if price:
                print(f"  ✅ Real-time price: ${price:.2f}")
            else:
                print(f"  ❌ Failed to get price")
        
        print("\n=== API TEST COMPLETED ===")
        print("Now refresh your portfolio page to see the updated prices!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(force_portfolio_update())
