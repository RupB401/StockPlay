#!/usr/bin/env python3
"""
Script to add more stocks to the stock universe database
Focus on showing numerous stocks instead of just popularity-based selection
"""

import sqlite3
import random
from datetime import datetime
import sys
import os

# Add current directory to path to import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from stock_universe_database import StockUniverseDatabase

from stock_universe_database import StockUniverseDatabase

class StockExpansion:
    def __init__(self):
        self.db = StockUniverseDatabase()
        
    def add_comprehensive_stock_list(self):
        """Add a comprehensive list of stocks across different categories"""
        
        # Large Cap Stocks (Market Cap > $10B)
        large_cap_stocks = [
            # Technology
            ("AAPL", "Apple Inc.", "Technology", 3200000000000, 193.60),
            ("MSFT", "Microsoft Corporation", "Technology", 3752000000000, 424.30),
            ("GOOGL", "Alphabet Inc.", "Technology", 2310000000000, 175.25),
            ("AMZN", "Amazon.com Inc.", "Technology", 1850000000000, 178.50),
            ("NVDA", "NVIDIA Corporation", "Technology", 4152000000000, 138.07),
            ("META", "Meta Platforms Inc.", "Technology", 1450000000000, 580.50),
            ("TSLA", "Tesla Inc.", "Automotive", 1067000000000, 248.98),
            ("NFLX", "Netflix Inc.", "Technology", 195000000000, 450.20),
            ("CRM", "Salesforce Inc.", "Technology", 295000000000, 269.75),
            ("ORCL", "Oracle Corporation", "Technology", 520000000000, 245.24),
            ("ADBE", "Adobe Inc.", "Technology", 220000000000, 475.30),
            ("INTC", "Intel Corporation", "Technology", 195000000000, 46.20),
            ("AMD", "Advanced Micro Devices", "Technology", 285000000000, 166.30),
            ("PYPL", "PayPal Holdings Inc.", "Financial", 75000000000, 65.80),
            ("SHOP", "Shopify Inc.", "Technology", 85000000000, 68.45),
            
            # Financial Services
            ("JPM", "JPMorgan Chase & Co.", "Financial", 580000000000, 198.50),
            ("BAC", "Bank of America Corp", "Financial", 320000000000, 39.80),
            ("WFC", "Wells Fargo & Company", "Financial", 210000000000, 52.30),
            ("GS", "Goldman Sachs Group", "Financial", 125000000000, 375.20),
            ("MS", "Morgan Stanley", "Financial", 165000000000, 95.60),
            ("C", "Citigroup Inc.", "Financial", 125000000000, 62.40),
            ("V", "Visa Inc.", "Financial", 550000000000, 250.80),
            ("MA", "Mastercard Inc.", "Financial", 420000000000, 425.60),
            ("AXP", "American Express Co.", "Financial", 185000000000, 245.70),
            ("BRK.B", "Berkshire Hathaway", "Financial", 950000000000, 425.50),
            
            # Healthcare
            ("JNJ", "Johnson & Johnson", "Healthcare", 485000000000, 162.50),
            ("PFE", "Pfizer Inc.", "Healthcare", 162000000000, 28.75),
            ("UNH", "UnitedHealth Group", "Healthcare", 520000000000, 555.30),
            ("ABBV", "AbbVie Inc.", "Healthcare", 315000000000, 178.90),
            ("MRK", "Merck & Co Inc.", "Healthcare", 285000000000, 112.40),
            ("TMO", "Thermo Fisher Scientific", "Healthcare", 220000000000, 550.20),
            ("ABT", "Abbott Laboratories", "Healthcare", 195000000000, 110.80),
            ("BMY", "Bristol Myers Squibb", "Healthcare", 110000000000, 52.30),
            ("AMGN", "Amgen Inc.", "Healthcare", 165000000000, 295.70),
            ("GILD", "Gilead Sciences Inc.", "Healthcare", 85000000000, 68.20),
            
            # Consumer & Retail
            ("WMT", "Walmart Inc.", "Retail", 685000000000, 170.50),
            ("HD", "Home Depot Inc.", "Retail", 385000000000, 370.80),
            ("PG", "Procter & Gamble Co.", "Consumer", 385000000000, 165.20),
            ("KO", "Coca-Cola Company", "Consumer", 285000000000, 66.40),
            ("PEP", "PepsiCo Inc.", "Consumer", 240000000000, 175.60),
            ("COST", "Costco Wholesale Corp", "Retail", 385000000000, 865.50),
            ("NKE", "Nike Inc.", "Consumer", 165000000000, 105.80),
            ("MCD", "McDonald's Corporation", "Consumer", 220000000000, 295.40),
            ("SBUX", "Starbucks Corporation", "Consumer", 105000000000, 92.30),
            ("TGT", "Target Corporation", "Retail", 75000000000, 165.20),
            
            # Industrial & Energy
            ("BA", "Boeing Company", "Industrial", 125000000000, 205.80),
            ("CAT", "Caterpillar Inc.", "Industrial", 185000000000, 340.50),
            ("GE", "General Electric Co.", "Industrial", 185000000000, 168.70),
            ("MMM", "3M Company", "Industrial", 75000000000, 135.60),
            ("XOM", "Exxon Mobil Corporation", "Energy", 485000000000, 115.40),
            ("CVX", "Chevron Corporation", "Energy", 285000000000, 152.30),
            ("COP", "ConocoPhillips", "Energy", 165000000000, 128.90),
        ]
        
        # Mid Cap Stocks (Market Cap $2B - $10B)
        mid_cap_stocks = [
            ("PLTR", "Palantir Technologies", "Technology", 52000000000, 24.50),
            ("SNOW", "Snowflake Inc.", "Technology", 48000000000, 152.30),
            ("ZM", "Zoom Video Communications", "Technology", 22000000000, 75.40),
            ("DOCU", "DocuSign Inc.", "Technology", 12000000000, 62.80),
            ("TWLO", "Twilio Inc.", "Technology", 9500000000, 58.90),
            ("SQ", "Block Inc.", "Financial", 38000000000, 62.50),
            ("COIN", "Coinbase Global Inc.", "Financial", 42000000000, 168.70),
            ("ROKU", "Roku Inc.", "Technology", 7800000000, 74.20),
            ("UBER", "Uber Technologies Inc.", "Technology", 145000000000, 72.40),
            ("LYFT", "Lyft Inc.", "Technology", 6500000000, 19.80),
            ("DASH", "DoorDash Inc.", "Technology", 52000000000, 142.60),
            ("ABNB", "Airbnb Inc.", "Technology", 85000000000, 132.40),
            ("PINS", "Pinterest Inc.", "Technology", 25000000000, 38.70),
            ("SNAP", "Snap Inc.", "Technology", 18500000000, 11.85),
            ("SPOT", "Spotify Technology", "Technology", 32000000000, 170.30),
            ("TDOC", "Teladoc Health Inc.", "Healthcare", 3200000000, 20.40),
            ("MRNA", "Moderna Inc.", "Healthcare", 28000000000, 72.50),
            ("BNTX", "BioNTech SE", "Healthcare", 25000000000, 103.70),
            ("ZS", "Zscaler Inc.", "Technology", 29000000000, 205.80),
            ("CRWD", "CrowdStrike Holdings", "Technology", 78000000000, 325.60),
            ("DDOG", "Datadog Inc.", "Technology", 38000000000, 120.50),
            ("NET", "Cloudflare Inc.", "Technology", 35000000000, 108.90),
            ("OKTA", "Okta Inc.", "Technology", 18500000000, 118.40),
            ("MDB", "MongoDB Inc.", "Technology", 22000000000, 325.70),
            ("WDAY", "Workday Inc.", "Technology", 65000000000, 258.30),
        ]
        
        # Small Cap Stocks (Market Cap $300M - $2B)
        small_cap_stocks = [
            ("UPST", "Upstart Holdings Inc.", "Financial", 850000000, 10.45),
            ("SOFI", "SoFi Technologies Inc.", "Financial", 9200000000, 9.87),
            ("LC", "LendingClub Corporation", "Financial", 1200000000, 12.30),
            ("AFRM", "Affirm Holdings Inc.", "Financial", 15000000000, 52.80),
            ("HOOD", "Robinhood Markets Inc.", "Financial", 18500000000, 21.60),
            ("OPEN", "Opendoor Technologies", "Technology", 2800000000, 4.25),
            ("RBLX", "Roblox Corporation", "Technology", 28000000000, 45.70),
            ("U", "Unity Software Inc.", "Technology", 12000000000, 32.40),
            ("PATH", "UiPath Inc.", "Technology", 7200000000, 13.50),
            ("AI", "C3.ai Inc.", "Technology", 3800000000, 34.80),
            ("BBAI", "BigBear.ai Holdings", "Technology", 1500000000, 15.20),
            ("SOUN", "SoundHound AI Inc.", "Technology", 2200000000, 6.85),
            ("SMCI", "Super Micro Computer", "Technology", 42000000000, 750.30),
            ("IONQ", "IonQ Inc.", "Technology", 2800000000, 16.75),
            ("RGTI", "Rigetti Computing Inc.", "Technology", 450000000, 2.85),
            ("QUBT", "Quantum Computing Inc.", "Technology", 680000000, 7.45),
            ("MVIS", "MicroVision Inc.", "Technology", 780000000, 4.82),
            ("LAZR", "Luminar Technologies", "Technology", 1800000000, 5.15),
            ("VLDR", "Velodyne Lidar Inc.", "Technology", 620000000, 3.20),
            ("GOEV", "Canoo Inc.", "Automotive", 380000000, 1.58),
            ("RIDE", "Lordstown Motors Corp", "Automotive", 280000000, 1.45),
            ("NKLA", "Nikola Corporation", "Automotive", 1200000000, 2.95),
            ("FISV", "Fiserv Inc.", "Financial", 85000000000, 132.40),
            ("PYPL", "PayPal Holdings Inc.", "Financial", 75000000000, 65.80),
            ("ADYEY", "Adyen N.V.", "Financial", 45000000000, 145.60),
        ]
        
        # Combine all stocks
        all_stocks = large_cap_stocks + mid_cap_stocks + small_cap_stocks
        
        print(f"Adding {len(all_stocks)} stocks to the database...")
        
        # Add stocks to database with popularity metrics
        for symbol, name, sector, market_cap, price in all_stocks:
            try:
                # Generate realistic popularity metrics
                trading_volume = random.randint(1000000, 100000000)
                avg_daily_volume = trading_volume * random.uniform(0.8, 1.2)
                volatility = random.uniform(1.0, 8.0)
                price_change_1d = random.uniform(-5.0, 5.0)
                price_change_1w = random.uniform(-10.0, 10.0)
                price_change_1m = random.uniform(-20.0, 20.0)
                price_change_ytd = random.uniform(-50.0, 100.0)
                watchlist_count = random.randint(100, 2000)
                buy_orders_count = random.randint(50, 500)
                sell_orders_count = random.randint(30, 400)
                total_trades_count = buy_orders_count + sell_orders_count
                search_trend_score = random.randint(500, 2000)
                
                # Calculate popularity score
                volume_score = min(trading_volume / 1000000, 50)
                volatility_score = min(volatility * 2, 20)
                change_score = abs(price_change_1d) * 2
                watchlist_score = min(watchlist_count / 10, 30)
                activity_score = min(total_trades_count / 10, 20)
                search_score = min(search_trend_score / 100, 30)
                
                popularity_score = (volume_score + volatility_score + change_score + 
                                 watchlist_score + activity_score + search_score) / 6
                
                # Insert or update stock using direct database operations
                with self.db.get_connection('IMMEDIATE') as conn:
                    cursor = conn.cursor()
                    
                    # First try to insert as new stock
                    try:
                        cursor.execute('''
                            INSERT INTO stock_universe 
                            (symbol, name, sector, industry, market_cap, exchange, is_active,
                             logo_url, current_price, trading_volume, avg_daily_volume, volatility,
                             price_change_1d, price_change_1w, price_change_1m, price_change_ytd,
                             watchlist_count, buy_orders_count, sell_orders_count, total_trades_count,
                             search_trend_score, popularity_score, last_price_update)
                            VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                        ''', (
                            symbol.upper(),
                            name,
                            sector,
                            sector,  # industry same as sector for simplicity
                            market_cap,
                            'NASDAQ',
                            f"https://logo.clearbit.com/{name.lower().replace(' ', '').replace('.', '').replace(',', '').replace('inc', '').replace('corp', '').replace('corporation', '').replace('company', '').replace('co', '').replace('&', '').replace('the', '')}.com",
                            price,
                            trading_volume,
                            avg_daily_volume,
                            volatility,
                            price_change_1d,
                            price_change_1w,
                            price_change_1m,
                            price_change_ytd,
                            watchlist_count,
                            buy_orders_count,
                            sell_orders_count,
                            total_trades_count,
                            search_trend_score,
                            popularity_score
                        ))
                        
                    except sqlite3.IntegrityError:
                        # Stock exists, update popularity metrics instead
                        metrics = {
                            'trading_volume': trading_volume,
                            'avg_daily_volume': avg_daily_volume,
                            'volatility': volatility,
                            'price_change_1d': price_change_1d,
                            'price_change_1w': price_change_1w,
                            'price_change_1m': price_change_1m,
                            'price_change_ytd': price_change_ytd,
                            'watchlist_count': watchlist_count,
                            'buy_orders_count': buy_orders_count,
                            'sell_orders_count': sell_orders_count,
                            'total_trades_count': total_trades_count,
                            'search_trend_score': search_trend_score,
                            'current_price': price,
                            'logo_url': f"https://logo.clearbit.com/{name.lower().replace(' ', '').replace('.', '').replace(',', '').replace('inc', '').replace('corp', '').replace('corporation', '').replace('company', '').replace('co', '').replace('&', '').replace('the', '')}.com"
                        }
                        self.db.update_popularity_metrics(symbol, metrics)
                
                print(f"✅ Added {symbol} - {name} (Score: {popularity_score:.1f})")
                
            except Exception as e:
                print(f"❌ Error adding {symbol}: {e}")
        
        print(f"\n🎉 Successfully added {len(all_stocks)} stocks to the database!")
        
        # Get summary
        popular_stocks = self.db.get_popular_stocks(limit=50)
        print(f"📊 Total stocks with popularity data: {len(popular_stocks)}")
        
        return len(all_stocks)

if __name__ == "__main__":
    expander = StockExpansion()
    count = expander.add_comprehensive_stock_list()
    print(f"\n✨ Database expansion complete! Added {count} stocks.")
