import psycopg2
import psycopg2.extras  # <-- Add this import
import os
import logging
from dotenv import load_dotenv
from pprint import pprint
from datetime import datetime, timedelta
import json

# Load environment variables
import os
current_dir = os.path.dirname(os.path.abspath(__file__))
credentials_path = os.path.join(current_dir, "credentials.env")
load_dotenv(dotenv_path=credentials_path)

DATABASE_URL = os.getenv("DATABASE_URL")

DB_NAME = os.getenv("DB_NAME", "StockView")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)

def get_connection(retries=5, delay=2):
    for attempt in range(1, retries + 1):
        try:
            if DATABASE_URL:
                conn = psycopg2.connect(DATABASE_URL)
            else:
                conn = psycopg2.connect(
                    dbname=DB_NAME,
                    user=DB_USER,
                    password=DB_PASSWORD,
                    host=DB_HOST,
                    port=DB_PORT
                )
            logging.info("✅ PostgreSQL connection established.")
            return conn
        except psycopg2.OperationalError as e:
            logging.error(f"[Attempt {attempt}] DB connection failed: {e}")
            import time
            time.sleep(delay)
    raise ConnectionError("❌ Could not connect to the PostgreSQL database after multiple attempts.")

# Ensure table exists
def create_table():
    """Create the stock_info table if it doesn't exist"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cur:
                cur.execute("""
                    CREATE TABLE IF NOT EXISTS stock_info (
                        symbol TEXT PRIMARY KEY,
                        price NUMERIC,
                        currency TEXT,
                        market_cap NUMERIC,
                        pe_ratio NUMERIC,
                        eps NUMERIC,
                        pb_ratio NUMERIC,
                        dividend_yield NUMERIC,
                        industry_pe NUMERIC,
                        book_value NUMERIC,
                        roe NUMERIC,
                        sector TEXT,
                        industry TEXT,
                        exchange TEXT,
                        company_name TEXT,
                        logo TEXT,
                        raw_data JSONB,
                        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                    )
                """)
                logging.info("✅ Stock info table created or already exists")
                return True
    except Exception as e:
        logging.error(f"❌ Error creating table: {str(e)}")
        return False
    finally:
        if 'conn' in locals():
            conn.close()

# Get current logo from DB
def get_current_logo(symbol):
    """Get the current logo for a stock symbol."""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cur:
                cur.execute("SELECT logo FROM stock_info WHERE symbol = %s", (symbol,))
                row = cur.fetchone()
                return row[0] if row else None
    except Exception as e:
        logging.error(f"❌ Error fetching logo for {symbol}: {e}")
        return None
    finally:
        if 'conn' in locals():
            conn.close()

# Insert or update stock data
def insert_stock_info(data):
    """Insert or update stock information in the database"""
    try:
        conn = get_connection()
        with conn:
            with conn.cursor() as cur:
                symbol = data.get("symbol")
                if not symbol:
                    logging.error("❌ No symbol provided in data")
                    return False

                alphavantage = data.get("alphavantage", {})
                finnhub = data.get("finnhub", {})

                # Extract and convert fields for each column
                def safe_float(val):
                    try:
                        return float(val)
                    except (TypeError, ValueError):
                        return None

                price = safe_float(alphavantage.get("latest_price"))
                currency = alphavantage.get("Currency")
                market_cap = safe_float(alphavantage.get("MarketCapitalization"))
                pe_ratio = safe_float(alphavantage.get("PERatio"))
                eps = safe_float(alphavantage.get("EPS"))
                pb_ratio = safe_float(alphavantage.get("PriceToBookRatio"))
                dividend_yield = safe_float(alphavantage.get("DividendYield"))
                industry_pe = safe_float(alphavantage.get("ForwardPE"))
                book_value = safe_float(alphavantage.get("BookValue"))
                roe = safe_float(alphavantage.get("ReturnOnEquityTTM"))
                sector = alphavantage.get("Sector")
                industry = alphavantage.get("Industry")
                exchange = alphavantage.get("Exchange")
                company_name = alphavantage.get("Name")
                logo = finnhub.get("logo")

                # Extract relevant data for simplified schema
                values = (symbol, price, market_cap, pe_ratio, pb_ratio, dividend_yield, sector, industry, company_name, logo)

                logging.info(f"Inserting values: {values}")

                cur.execute("""
                    INSERT INTO stock_info (
                        symbol, current_price, market_cap, pe_ratio, 
                        pb_ratio, dividend_yield, sector, industry, 
                        company_name, logo_url
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (symbol) 
                    DO UPDATE SET
                        current_price = EXCLUDED.current_price,
                        market_cap = EXCLUDED.market_cap,
                        pe_ratio = EXCLUDED.pe_ratio,
                        pb_ratio = EXCLUDED.pb_ratio,
                        dividend_yield = EXCLUDED.dividend_yield,
                        sector = EXCLUDED.sector,
                        industry = EXCLUDED.industry,
                        company_name = EXCLUDED.company_name,
                        logo_url = EXCLUDED.logo_url,
                        last_updated = CURRENT_TIMESTAMP
                """, (symbol, price, market_cap, pe_ratio, pb_ratio, dividend_yield, sector, industry, company_name, logo))

                conn.commit()

                conn.commit()
                logging.info(f"✅ Successfully inserted/updated data for {symbol}")
                return True

    except Exception as e:
        logging.error(f"❌ Database error in insert_stock_info: {str(e)}")
        import traceback
        logging.error(traceback.format_exc())
        return False
    finally:
        if 'conn' in locals():
            conn.close()

def search_stocks_in_db(query):
    """Search stocks in the database by symbol or name using stock universe"""
    try:
        # First try the stock universe database
        from stock_universe_database import StockUniverseDatabase
        
        with StockUniverseDatabase.get_connection() as conn:
            cursor = conn.cursor()
            
            # Search for stocks that match the query in symbol or name
            # Make the search case-insensitive and prioritize exact matches
            cursor.execute("""
                SELECT symbol, name, sector, industry, exchange, market_cap
                FROM stock_universe 
                WHERE is_active = 1 
                AND (symbol LIKE ? OR name LIKE ? OR symbol LIKE ? OR name LIKE ?)
                ORDER BY 
                    CASE 
                        WHEN symbol = ? THEN 1
                        WHEN symbol LIKE ? THEN 2  
                        WHEN name LIKE ? THEN 3
                        ELSE 4
                    END,
                    market_cap DESC
                LIMIT 15
            """, (
                f'{query}%',        # Symbol starts with query
                f'{query}%',        # Name starts with query  
                f'%{query}%',       # Symbol contains query
                f'%{query}%',       # Name contains query
                query.upper(),      # Exact symbol match
                f'{query.upper()}%', # Symbol starts with query (uppercase)
                f'{query}%'         # Name starts with query
            ))
            
            results = cursor.fetchall()
            
        if results:
            fresh_results = []
            for result in results:
                fresh_results.append({
                    "symbol": result[0],
                    "name": result[1] or result[0],  # company name or fallback to symbol
                    "type": "Equity",
                    "region": result[4] or "US",     # exchange
                    "currency": "USD",
                    "sector": result[2],             # sector
                    "industry": result[3],           # industry
                    "market_cap": result[5],         # market_cap
                    "is_cached": True,
                    "source": "Universe DB"
                })
                    
            return {"fresh": fresh_results, "stale": []}
        
        # Fallback to stock_info table if universe DB has no results
        conn = get_connection()
        cursor = conn.cursor()
        
        # Search for stocks that match the query in symbol or name
        # Make the search case-insensitive
        cursor.execute("""
            SELECT symbol, company_name, exchange, industry
            FROM stock_info 
            WHERE symbol ILIKE %s OR company_name ILIKE %s
            ORDER BY 
                CASE 
                    WHEN symbol ILIKE %s THEN 1
                    WHEN company_name ILIKE %s THEN 2
                    ELSE 3
                END
            LIMIT 10
        """, (f'%{query}%', f'%{query}%', f'{query}%', f'{query}%'))
        
        results = cursor.fetchall()
        cursor.close()
        conn.close()
        
        # Since we don't have updated_at column, treat all results as fresh
        fresh_results = []
        
        for result in results:
            fresh_results.append({
                "symbol": result[0],  # symbol is the first column
                "name": result[1] or result[0],  # company_name or fallback to symbol
                "type": "Equity",  # Default to Equity
                "region": result[2] or "US",  # exchange or default to US
                "currency": "USD",  # Default to USD
                "industry": result[3],
                "is_cached": True,
                "source": "Stock Info DB"
            })
                
        return {"fresh": fresh_results, "stale": []}
    except Exception as e:
        print(f"Database search error: {str(e)}")
        return {"fresh": [], "stale": []}
