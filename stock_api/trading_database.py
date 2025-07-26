"""
Trading Database Module for QuantCoin Virtual Trading System
Handles all database operations for wallets, portfolios, transactions, and alerts
"""

import psycopg2
import psycopg2.extras
import logging
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Optional, Tuple
from database import get_connection

logging.basicConfig(level=logging.INFO)

class TradingDatabase:
    
    @staticmethod
    def create_trading_tables():
        """Create all trading-related tables"""
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            # 1. User Wallets Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_wallets (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER UNIQUE NOT NULL,
                    quantz_balance DECIMAL(15, 2) DEFAULT 10000.00,
                    total_invested DECIMAL(15, 2) DEFAULT 0.00,
                    total_returns DECIMAL(15, 2) DEFAULT 0.00,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
            """)
            
            # 2. Stock Holdings Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS stock_holdings (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    symbol VARCHAR(10) NOT NULL,
                    company_name VARCHAR(255),
                    quantity INTEGER NOT NULL CHECK (quantity > 0),
                    average_price DECIMAL(10, 4) NOT NULL,
                    current_price DECIMAL(10, 4) DEFAULT 0.00,
                    total_cost DECIMAL(15, 2) NOT NULL,
                    current_value DECIMAL(15, 2) DEFAULT 0.00,
                    unrealized_gain_loss DECIMAL(15, 2) DEFAULT 0.00,
                    unrealized_gain_loss_percent DECIMAL(8, 4) DEFAULT 0.00,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    UNIQUE(user_id, symbol)
                );
            """)
            
            # 3. Transaction History Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS transactions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('BUY', 'SELL', 'DEPOSIT', 'WITHDRAWAL')),
                    symbol VARCHAR(10),
                    company_name VARCHAR(255),
                    quantity INTEGER,
                    price_per_share DECIMAL(10, 4),
                    total_amount DECIMAL(15, 2) NOT NULL,
                    fees DECIMAL(10, 2) DEFAULT 0.00,
                    net_amount DECIMAL(15, 2) NOT NULL,
                    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    status VARCHAR(20) DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
                    notes TEXT,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
            """)
            
            # 4. Price Alerts Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS price_alerts (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    symbol VARCHAR(10) NOT NULL,
                    company_name VARCHAR(255),
                    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('PRICE_TARGET', 'PERCENTAGE_CHANGE', 'TECHNICAL_INDICATOR')),
                    condition_type VARCHAR(10) NOT NULL CHECK (condition_type IN ('ABOVE', 'BELOW', 'EQUALS')),
                    target_value DECIMAL(10, 4) NOT NULL,
                    current_value DECIMAL(10, 4) DEFAULT 0.00,
                    is_triggered BOOLEAN DEFAULT FALSE,
                    is_active BOOLEAN DEFAULT TRUE,
                    trigger_once BOOLEAN DEFAULT TRUE,
                    notification_methods JSON DEFAULT '["IN_APP"]',
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    triggered_at TIMESTAMP,
                    last_checked TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
            """)
            
            # 5. Notifications Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS notifications (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL,
                    notification_type VARCHAR(50) NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    data JSON,
                    is_read BOOLEAN DEFAULT FALSE,
                    priority VARCHAR(10) DEFAULT 'NORMAL' CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    read_at TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
            """)
            
            # 6. Real-time Stock Prices Cache Table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS stock_prices_cache (
                    symbol VARCHAR(10) PRIMARY KEY,
                    company_name VARCHAR(255),
                    current_price DECIMAL(10, 4) NOT NULL,
                    previous_close DECIMAL(10, 4),
                    day_change DECIMAL(10, 4),
                    day_change_percent DECIMAL(8, 4),
                    volume BIGINT,
                    market_cap BIGINT,
                    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    data_source VARCHAR(50) DEFAULT 'API'
                );
            """)
            
            # 7. Portfolio Summary Table (for performance optimization)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS portfolio_summary (
                    user_id INTEGER PRIMARY KEY,
                    total_portfolio_value DECIMAL(15, 2) DEFAULT 0.00,
                    total_invested DECIMAL(15, 2) DEFAULT 0.00,
                    total_gain_loss DECIMAL(15, 2) DEFAULT 0.00,
                    total_gain_loss_percent DECIMAL(8, 4) DEFAULT 0.00,
                    day_change DECIMAL(15, 2) DEFAULT 0.00,
                    day_change_percent DECIMAL(8, 4) DEFAULT 0.00,
                    number_of_holdings INTEGER DEFAULT 0,
                    diversification_score DECIMAL(5, 2) DEFAULT 0.00,
                    last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );
            """)
            
            # Create indexes for better performance
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_stock_holdings_user_id ON stock_holdings(user_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(transaction_date);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read);")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_stock_prices_updated ON stock_prices_cache(last_updated);")
            
            # Create triggers for auto-updating timestamps
            cursor.execute("""
                CREATE OR REPLACE FUNCTION update_updated_at_column()
                RETURNS TRIGGER AS $$
                BEGIN
                    NEW.updated_at = CURRENT_TIMESTAMP;
                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            """)
            
            cursor.execute("""
                DROP TRIGGER IF EXISTS update_user_wallets_updated_at ON user_wallets;
                CREATE TRIGGER update_user_wallets_updated_at
                    BEFORE UPDATE ON user_wallets
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            """)
            
            cursor.execute("""
                DROP TRIGGER IF EXISTS update_stock_holdings_updated_at ON stock_holdings;
                CREATE TRIGGER update_stock_holdings_updated_at
                    BEFORE UPDATE ON stock_holdings
                    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
            """)
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logging.info("✅ All trading tables created successfully")
            
        except Exception as e:
            logging.error(f"❌ Error creating trading tables: {e}")
            raise e
    
    @staticmethod
    def initialize_user_wallet(user_id: int, initial_balance: float = 10000.00) -> bool:
        """Initialize wallet for a new user"""
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO user_wallets (user_id, quantz_balance)
                VALUES (%s, %s)
                ON CONFLICT (user_id) DO NOTHING
            """, (user_id, initial_balance))
            
            # Also create portfolio summary entry
            cursor.execute("""
                INSERT INTO portfolio_summary (user_id)
                VALUES (%s)
                ON CONFLICT (user_id) DO NOTHING
            """, (user_id,))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logging.info(f"✅ Wallet initialized for user {user_id}")
            return True
            
        except Exception as e:
            logging.error(f"❌ Error initializing wallet for user {user_id}: {e}")
            return False
    
    @staticmethod
    def get_user_wallet(user_id: int) -> Optional[Dict]:
        """Get user wallet information"""
        try:
            conn = get_connection()
            cursor = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
            
            cursor.execute("""
                SELECT * FROM user_wallets WHERE user_id = %s
            """, (user_id,))
            
            wallet = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if wallet:
                return dict(wallet)
            return None
            
        except Exception as e:
            logging.error(f"❌ Error getting wallet for user {user_id}: {e}")
            return None
    
    @staticmethod
    def update_user_balance(user_id: int, new_balance: float) -> bool:
        """Update user's QuantZ balance"""
        try:
            conn = get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE user_wallets 
                SET quantz_balance = %s, updated_at = CURRENT_TIMESTAMP
                WHERE user_id = %s
            """, (new_balance, user_id))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            logging.info(f"✅ Balance updated for user {user_id}: {new_balance}")
            return True
            
        except Exception as e:
            logging.error(f"❌ Error updating balance for user {user_id}: {e}")
            return False
