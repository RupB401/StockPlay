from stock_universe_database import StockUniverseDatabase

if __name__ == "__main__":
    print("Updating stock universe database...")
    count = StockUniverseDatabase.fetch_stock_universe()
    print(f"Update complete. {count} stocks added/updated.")
