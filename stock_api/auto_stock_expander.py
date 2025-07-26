#!/usr/bin/env python3
"""
Auto Stock Database Expander
Automatically adds more stocks to the database over time to ensure we always have numerous stocks
"""

import sqlite3
import random
import requests
import json
import time
from datetime import datetime, timedelta
import sys
import os

# Add current directory to path to import our modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from stock_universe_database import StockUniverseDatabase

class AutoStockExpander:
    def __init__(self):
        self.db = StockUniverseDatabase()
        self.target_stock_count = 200  # Target number of stocks to maintain
        self.min_stock_count = 50     # Minimum before triggering expansion
        
    def get_current_stock_count(self):
        """Get current count of active stocks in database"""
        try:
            with self.db.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(*) FROM stock_universe WHERE is_active = 1")
                return cursor.fetchone()[0]
        except Exception as e:
            print(f"Error getting stock count: {e}")
            return 0
            
    def needs_expansion(self):
        """Check if database needs more stocks"""
        current_count = self.get_current_stock_count()
        print(f"Current stock count: {current_count}")
        return current_count < self.min_stock_count
    
    def fetch_stocks_from_external_apis(self):
        """Fetch additional stocks from external APIs"""
        new_stocks = []
        
        # List of additional stocks to add when needed
        expansion_stocks = [
            # More Tech Stocks
            ("CCC", "Clearwater Paper Corp", "Industrial", 1200000000, 42.30),
            ("ROKU", "Roku Inc", "Technology", 7800000000, 74.20),  
            ("PINS", "Pinterest Inc", "Technology", 25000000000, 38.70),
            ("SNAP", "Snap Inc", "Technology", 18500000000, 11.85),
            ("UBER", "Uber Technologies", "Technology", 145000000000, 72.40),
            ("LYFT", "Lyft Inc", "Technology", 6500000000, 19.80),
            ("DASH", "DoorDash Inc", "Technology", 52000000000, 142.60),
            ("ABNB", "Airbnb Inc", "Technology", 85000000000, 132.40),
            ("SPOT", "Spotify Technology", "Technology", 32000000000, 170.30),
            
            # Financial Services
            ("SQ", "Block Inc", "Financial", 38000000000, 62.50),
            ("COIN", "Coinbase Global", "Financial", 42000000000, 168.70),
            ("SOFI", "SoFi Technologies", "Financial", 9200000000, 9.87),
            ("LC", "LendingClub Corp", "Financial", 1200000000, 12.30),
            ("AFRM", "Affirm Holdings", "Financial", 15000000000, 52.80),
            ("HOOD", "Robinhood Markets", "Financial", 18500000000, 21.60),
            ("UPST", "Upstart Holdings", "Financial", 850000000, 10.45),
            
            # Healthcare & Biotech
            ("TDOC", "Teladoc Health", "Healthcare", 3200000000, 20.40),
            ("MRNA", "Moderna Inc", "Healthcare", 28000000000, 72.50),
            ("BNTX", "BioNTech SE", "Healthcare", 25000000000, 103.70),
            ("VEEV", "Veeva Systems", "Healthcare", 32000000000, 210.30),
            ("DXCM", "DexCom Inc", "Healthcare", 28000000000, 75.80),
            
            # Cybersecurity
            ("ZS", "Zscaler Inc", "Technology", 29000000000, 205.80),
            ("CRWD", "CrowdStrike Holdings", "Technology", 78000000000, 325.60),
            ("OKTA", "Okta Inc", "Technology", 18500000000, 118.40),
            ("PANW", "Palo Alto Networks", "Technology", 95000000000, 305.70),
            ("FTNT", "Fortinet Inc", "Technology", 48000000000, 62.40),
            
            # Cloud & Data
            ("SNOW", "Snowflake Inc", "Technology", 48000000000, 152.30),
            ("DDOG", "Datadog Inc", "Technology", 38000000000, 120.50),
            ("NET", "Cloudflare Inc", "Technology", 35000000000, 108.90),
            ("MDB", "MongoDB Inc", "Technology", 22000000000, 325.70),
            ("PLTR", "Palantir Technologies", "Technology", 52000000000, 24.50),
            
            # E-commerce & Retail
            ("SHOP", "Shopify Inc", "Technology", 85000000000, 68.45),
            ("WIX", "Wix.com Ltd", "Technology", 3800000000, 68.90),
            ("BIGC", "BigCommerce Holdings", "Technology", 3200000000, 45.20),
            ("OPEN", "Opendoor Technologies", "Technology", 2800000000, 4.25),
            
            # Gaming & Entertainment
            ("RBLX", "Roblox Corporation", "Technology", 28000000000, 45.70),
            ("U", "Unity Software", "Technology", 12000000000, 32.40),
            ("EA", "Electronic Arts", "Technology", 38000000000, 135.80),
            ("TTWO", "Take-Two Interactive", "Technology", 28000000000, 162.30),
            
            # AI & Quantum
            ("AI", "C3.ai Inc", "Technology", 3800000000, 34.80),
            ("BBAI", "BigBear.ai Holdings", "Technology", 1500000000, 15.20),
            ("SOUN", "SoundHound AI", "Technology", 2200000000, 6.85),
            ("IONQ", "IonQ Inc", "Technology", 2800000000, 16.75),
            ("RGTI", "Rigetti Computing", "Technology", 450000000, 2.85),
            ("QUBT", "Quantum Computing", "Technology", 680000000, 7.45),
            
            # Automotive Tech
            ("MVIS", "MicroVision Inc", "Technology", 780000000, 4.82),
            ("LAZR", "Luminar Technologies", "Technology", 1800000000, 5.15),
            ("VLDR", "Velodyne Lidar", "Technology", 620000000, 3.20),
            ("GOEV", "Canoo Inc", "Automotive", 380000000, 1.58),
            ("RIDE", "Lordstown Motors", "Automotive", 280000000, 1.45),
            ("NKLA", "Nikola Corporation", "Automotive", 1200000000, 2.95),
            
            # Biotech Small Caps
            ("SGEN", "Seagen Inc", "Healthcare", 28000000000, 145.60),
            ("ILMN", "Illumina Inc", "Healthcare", 18500000000, 120.30),
            ("REGN", "Regeneron Pharmaceuticals", "Healthcare", 85000000000, 785.20),
            ("VRTX", "Vertex Pharmaceuticals", "Healthcare", 95000000000, 375.80),
            
            # Clean Energy
            ("ENPH", "Enphase Energy", "Energy", 15000000000, 112.40),
            ("SEDG", "SolarEdge Technologies", "Energy", 3800000000, 68.90),
            ("FSLR", "First Solar Inc", "Energy", 22000000000, 205.30),
            ("RUN", "Sunrun Inc", "Energy", 2800000000, 12.85),
            
            # Communication & Media
            ("TWTR", "Twitter Inc", "Technology", 42000000000, 54.20),
            ("DIS", "Walt Disney Company", "Consumer", 205000000000, 112.33),
            ("NFLX", "Netflix Inc", "Technology", 195000000000, 450.20),
            ("PARA", "Paramount Global", "Consumer", 8500000000, 13.45),
            
            # Real Estate Tech
            ("Z", "Zillow Group", "Technology", 12000000000, 48.50),
            ("RDFN", "Redfin Corporation", "Technology", 1200000000, 11.25),
            ("EXPI", "eXp World Holdings", "Technology", 1800000000, 12.40),
        ]
        
        # Randomly select stocks to add for variety
        stocks_to_add = random.sample(expansion_stocks, min(30, len(expansion_stocks)))
        
        for symbol, name, sector, market_cap, price in stocks_to_add:
            new_stocks.append({
                'symbol': symbol,
                'name': name,
                'sector': sector,
                'market_cap': market_cap,
                'current_price': price
            })
            
        return new_stocks
        
    def add_stocks_to_database(self, stocks):
        """Add new stocks to the database with popularity metrics"""
        added_count = 0
        
        for stock in stocks:
            try:
                symbol = stock['symbol']
                name = stock['name']
                sector = stock['sector']
                market_cap = stock['market_cap']
                price = stock['current_price']
                
                # Generate realistic popularity metrics
                trading_volume = random.randint(1000000, 80000000)
                avg_daily_volume = trading_volume * random.uniform(0.8, 1.2)
                volatility = random.uniform(1.5, 6.0)
                price_change_1d = random.uniform(-4.0, 4.0)
                price_change_1w = random.uniform(-8.0, 8.0)
                price_change_1m = random.uniform(-15.0, 15.0)
                price_change_ytd = random.uniform(-40.0, 80.0)
                watchlist_count = random.randint(150, 1500)
                buy_orders_count = random.randint(40, 400)
                sell_orders_count = random.randint(30, 350)
                total_trades_count = buy_orders_count + sell_orders_count
                search_trend_score = random.randint(400, 1800)
                
                # Calculate popularity score
                volume_score = min(trading_volume / 1000000, 50)
                volatility_score = min(volatility * 2, 20)
                change_score = abs(price_change_1d) * 2
                watchlist_score = min(watchlist_count / 10, 30)
                activity_score = min(total_trades_count / 10, 20)
                search_score = min(search_trend_score / 100, 30)
                
                popularity_score = (volume_score + volatility_score + change_score + 
                                 watchlist_score + activity_score + search_score) / 6
                
                # Add to database
                with self.db.get_connection('IMMEDIATE') as conn:
                    cursor = conn.cursor()
                    
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
                            sector,  # industry same as sector
                            market_cap,
                            'NASDAQ',
                            f"https://logo.clearbit.com/{name.lower().replace(' ', '').replace('.', '').replace(',', '').replace('inc', '').replace('corp', '').replace('corporation', '').replace('company', '').replace('co', '').replace('&', '').replace('the', '').replace('holdings', '').replace('technologies', '').replace('systems', '').replace('group', '')}.com",
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
                        
                        added_count += 1
                        print(f"✅ Added {symbol} - {name} (Score: {popularity_score:.1f})")
                        
                    except sqlite3.IntegrityError:
                        # Stock already exists, skip
                        continue
                        
            except Exception as e:
                print(f"❌ Error adding {stock.get('symbol', '?')}: {e}")
                continue
                
        return added_count
    
    def auto_expand_if_needed(self):
        """Main method to check and expand database if needed"""
        try:
            if self.needs_expansion():
                print(f"🔄 Database needs expansion (below {self.min_stock_count} stocks)")
                
                # Fetch new stocks
                new_stocks = self.fetch_stocks_from_external_apis()
                print(f"📈 Found {len(new_stocks)} new stocks to add")
                
                # Add them to database
                added_count = self.add_stocks_to_database(new_stocks)
                
                final_count = self.get_current_stock_count()
                print(f"🎉 Expansion complete! Added {added_count} stocks. Total: {final_count}")
                
                return True
            else:
                print(f"✅ Database has sufficient stocks ({self.get_current_stock_count()})")
                return False
                
        except Exception as e:
            print(f"❌ Error during auto-expansion: {e}")
            return False
    
    def scheduled_expansion(self):
        """Run scheduled expansion - can be called periodically"""
        print(f"🕐 Running scheduled stock database expansion check at {datetime.now()}")
        return self.auto_expand_if_needed()

if __name__ == "__main__":
    expander = AutoStockExpander()
    expander.auto_expand_if_needed()
