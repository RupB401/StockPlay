"""
Test the popularity system
"""

from stock_universe_database import StockUniverseDatabase

def test_popularity_system():
    print("🧪 Testing popularity system...")
    
    # Get popular stocks
    stocks = StockUniverseDatabase.get_popular_stocks(5)
    
    if stocks:
        print(f"✅ Retrieved {len(stocks)} popular stocks:")
        for stock in stocks:
            symbol = stock['symbol']
            name = stock['name']
            score = stock['popularity_score'] or 0
            price = stock['current_price'] or 0
            print(f"  {symbol}: {name} (Score: {score:.1f}, Price: ${price:.2f})")
    else:
        print("❌ No popular stocks found")
    
    # Test popularity service
    try:
        from popularity_service import PopularityService
        api_stocks = PopularityService.get_popular_stocks_api_format(5, 'overall')
        
        if api_stocks:
            print(f"\n✅ API format test successful - {len(api_stocks)} stocks:")
            for stock in api_stocks:
                print(f"  {stock['symbol']}: {stock['name']} (Score: {stock['popularity_score']:.1f})")
        else:
            print("\n❌ API format test failed")
            
    except Exception as e:
        print(f"\n❌ PopularityService test failed: {e}")

if __name__ == "__main__":
    test_popularity_system()
