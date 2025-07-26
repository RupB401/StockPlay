#!/usr/bin/env python3
"""
Update all stocks in the database with random realistic prices and trading volumes for demo/testing.
This will ensure all cap categories have real-time data for Top Performers.
"""

import random
from stock_universe_database import StockUniverseDatabase

def update_all_prices():
    db = StockUniverseDatabase()
    updated = 0
    with db.get_connection('IMMEDIATE') as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT symbol, market_cap FROM stock_universe WHERE is_active = 1')
        stocks = cursor.fetchall()
        for symbol, market_cap in stocks:
            # Generate price based on market cap
            if market_cap > 100_000_000_000:
                price = random.uniform(100, 600)
            elif market_cap > 10_000_000_000:
                price = random.uniform(40, 200)
            elif market_cap > 2_000_000_000:
                price = random.uniform(10, 80)
            else:
                price = random.uniform(2, 40)
            
            # Generate random price change and volume
            price_change = random.uniform(-0.05, 0.08) * price
            trading_volume = random.randint(1_000_000, 50_000_000)
            
            cursor.execute('''
                UPDATE stock_universe
                SET current_price = ?, price_change_1d = ?, trading_volume = ?
                WHERE symbol = ?
            ''', (round(price, 2), round(price_change, 2), trading_volume, symbol))
            updated += 1
        conn.commit()
    print(f"Updated {updated} stocks with random prices and volumes.")

if __name__ == "__main__":
    update_all_prices()
