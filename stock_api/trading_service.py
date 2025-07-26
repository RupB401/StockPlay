"""
Trading Service - Core business logic for the QuantCoin virtual trading system
Handles buy/sell operations, portfolio calculations, and real-time price updates
"""

import logging
from decimal import Decimal, ROUND_HALF_UP
from datetime import datetime
from typing import Dict, List, Optional, Tuple
import yfinance as yf
import asyncio
import aiohttp
import requests
import os
from dotenv import load_dotenv
from trading_database import TradingDatabase

# Load environment variables
load_dotenv('credentials.env')

logging.basicConfig(level=logging.INFO)

class TradingService:
    
    def __init__(self):
        self.db = TradingDatabase()
    
    async def buy_stock(self, user_id: int, symbol: str, quantity: int, current_price: float = None) -> Dict:
        """
        Execute a buy order for a stock
        Returns: {success: bool, message: str, transaction_id: int, data: dict}
        """
        try:
            # Get current stock price if not provided
            if current_price is None:
                current_price = await self.get_real_time_price(symbol)
                if not current_price:
                    return {"success": False, "message": "Unable to fetch current stock price"}
            
            # Calculate total cost
            total_cost = Decimal(str(current_price)) * quantity
            fees = Decimal('0.00')  # No fees for now, can be added later
            net_amount = total_cost + fees
            
            # Get user wallet
            wallet = self.db.get_user_wallet(user_id)
            if not wallet:
                return {"success": False, "message": "User wallet not found"}
            
            current_balance = Decimal(str(wallet['quantz_balance']))
            
            # Check if user has sufficient balance
            if current_balance < net_amount:
                return {
                    "success": False, 
                    "message": f"Insufficient balance. Required: {net_amount}, Available: {current_balance}"
                }
            
            # Get company name
            company_info = await self.get_company_info(symbol)
            company_name = company_info.get('name', symbol) if company_info else symbol
            
            # Execute the transaction
            from database import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            
            try:
                # Start transaction
                cursor.execute("BEGIN;")
                
                # 1. Record the transaction
                cursor.execute("""
                    INSERT INTO transactions 
                    (user_id, transaction_type, symbol, company_name, quantity, price_per_share, total_amount, fees, net_amount)
                    VALUES (%s, 'BUY', %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (user_id, symbol.upper(), company_name, quantity, current_price, float(total_cost), float(fees), float(net_amount)))
                
                transaction_id = cursor.fetchone()[0]
                
                # 2. Update user balance
                new_balance = current_balance - net_amount
                cursor.execute("""
                    UPDATE user_wallets 
                    SET quantz_balance = %s, total_invested = total_invested + %s
                    WHERE user_id = %s
                """, (float(new_balance), float(total_cost), user_id))
                
                # 3. Update or create stock holding
                cursor.execute("""
                    SELECT quantity, average_price, total_cost FROM stock_holdings 
                    WHERE user_id = %s AND symbol = %s
                """, (user_id, symbol.upper()))
                
                existing_holding = cursor.fetchone()
                
                if existing_holding:
                    # Update existing holding with weighted average price
                    existing_qty, existing_avg_price, existing_cost = existing_holding
                    new_total_qty = existing_qty + quantity
                    new_total_cost = Decimal(str(existing_cost)) + total_cost
                    new_avg_price = new_total_cost / new_total_qty
                    
                    cursor.execute("""
                        UPDATE stock_holdings 
                        SET quantity = %s, average_price = %s, total_cost = %s, 
                            current_price = %s, current_value = %s, last_updated = CURRENT_TIMESTAMP
                        WHERE user_id = %s AND symbol = %s
                    """, (new_total_qty, float(new_avg_price), float(new_total_cost), 
                          current_price, float(new_total_qty * Decimal(str(current_price))), user_id, symbol.upper()))
                else:
                    # Create new holding
                    cursor.execute("""
                        INSERT INTO stock_holdings 
                        (user_id, symbol, company_name, quantity, average_price, current_price, total_cost, current_value)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    """, (user_id, symbol.upper(), company_name, quantity, current_price, current_price, 
                          float(total_cost), float(total_cost)))
                
                # 4. Update portfolio summary
                await self._update_portfolio_summary(user_id, cursor)
                
                # 5. Update stock price cache
                await self._update_price_cache(symbol.upper(), current_price, company_name)
                
                # Commit transaction
                cursor.execute("COMMIT;")
                
                conn.close()
                
                # Create notification
                await self._create_notification(
                    user_id, 
                    "TRADE_EXECUTED", 
                    "Stock Purchase Successful",
                    f"Successfully purchased {quantity} shares of {symbol.upper()} at ${current_price:.2f} per share"
                )
                
                return {
                    "success": True,
                    "message": f"Successfully purchased {quantity} shares of {symbol.upper()}",
                    "transaction_id": transaction_id,
                    "data": {
                        "symbol": symbol.upper(),
                        "quantity": quantity,
                        "price": current_price,
                        "total_cost": float(total_cost),
                        "new_balance": float(new_balance)
                    }
                }
                
            except Exception as e:
                cursor.execute("ROLLBACK;")
                conn.close()
                raise e
                
        except Exception as e:
            logging.error(f"❌ Error buying stock {symbol} for user {user_id}: {e}")
            return {"success": False, "message": f"Transaction failed: {str(e)}"}
    
    async def sell_stock(self, user_id: int, symbol: str, quantity: int, current_price: float = None) -> Dict:
        """
        Execute a sell order for a stock
        Returns: {success: bool, message: str, transaction_id: int, data: dict}
        """
        try:
            # Get current stock price if not provided
            if current_price is None:
                current_price = await self.get_real_time_price(symbol)
                if not current_price:
                    return {"success": False, "message": "Unable to fetch current stock price"}
            
            # Check if user has enough shares to sell
            from database import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT quantity, average_price, total_cost, company_name FROM stock_holdings 
                WHERE user_id = %s AND symbol = %s
            """, (user_id, symbol.upper()))
            
            holding = cursor.fetchone()
            
            if not holding:
                conn.close()
                return {"success": False, "message": "You don't own any shares of this stock"}
            
            current_qty, avg_price, total_cost, company_name = holding
            
            if current_qty < quantity:
                conn.close()
                return {"success": False, "message": f"Insufficient shares. You own {current_qty} shares"}
            
            # Calculate proceeds
            total_proceeds = Decimal(str(current_price)) * quantity
            fees = Decimal('0.00')  # No fees for now
            net_proceeds = total_proceeds - fees
            
            # Calculate realized gain/loss
            avg_cost_per_share = Decimal(str(avg_price))
            realized_gain_loss = (Decimal(str(current_price)) - avg_cost_per_share) * quantity
            
            try:
                # Start transaction
                cursor.execute("BEGIN;")
                
                # 1. Record the transaction
                cursor.execute("""
                    INSERT INTO transactions 
                    (user_id, transaction_type, symbol, company_name, quantity, price_per_share, total_amount, fees, net_amount, notes)
                    VALUES (%s, 'SELL', %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                """, (user_id, symbol.upper(), company_name, quantity, current_price, float(total_proceeds), 
                      float(fees), float(net_proceeds), f"Realized P&L: ${float(realized_gain_loss):.2f}"))
                
                transaction_id = cursor.fetchone()[0]
                
                # 2. Update user balance
                wallet = self.db.get_user_wallet(user_id)
                current_balance = Decimal(str(wallet['quantz_balance']))
                new_balance = current_balance + net_proceeds
                
                cursor.execute("""
                    UPDATE user_wallets 
                    SET quantz_balance = %s, total_returns = total_returns + %s
                    WHERE user_id = %s
                """, (float(new_balance), float(realized_gain_loss), user_id))
                
                # 3. Update stock holding
                if current_qty == quantity:
                    # Sell all shares - remove holding
                    cursor.execute("""
                        DELETE FROM stock_holdings 
                        WHERE user_id = %s AND symbol = %s
                    """, (user_id, symbol.upper()))
                else:
                    # Partial sale - update holding
                    new_qty = current_qty - quantity
                    new_total_cost = Decimal(str(total_cost)) - (avg_cost_per_share * quantity)
                    
                    cursor.execute("""
                        UPDATE stock_holdings 
                        SET quantity = %s, total_cost = %s, current_price = %s, 
                            current_value = %s, last_updated = CURRENT_TIMESTAMP
                        WHERE user_id = %s AND symbol = %s
                    """, (new_qty, float(new_total_cost), current_price, 
                          float(new_qty * Decimal(str(current_price))), user_id, symbol.upper()))
                
                # 4. Update portfolio summary
                await self._update_portfolio_summary(user_id, cursor)
                
                # 5. Update stock price cache
                await self._update_price_cache(symbol.upper(), current_price, company_name)
                
                # Commit transaction
                cursor.execute("COMMIT;")
                
                conn.close()
                
                # Create notification
                pnl_message = f"Profit: ${float(realized_gain_loss):.2f}" if realized_gain_loss > 0 else f"Loss: ${float(abs(realized_gain_loss)):.2f}"
                await self._create_notification(
                    user_id, 
                    "TRADE_EXECUTED", 
                    "Stock Sale Successful",
                    f"Successfully sold {quantity} shares of {symbol.upper()} at ${current_price:.2f} per share. {pnl_message}"
                )
                
                return {
                    "success": True,
                    "message": f"Successfully sold {quantity} shares of {symbol.upper()}",
                    "transaction_id": transaction_id,
                    "data": {
                        "symbol": symbol.upper(),
                        "quantity": quantity,
                        "price": current_price,
                        "total_proceeds": float(total_proceeds),
                        "realized_gain_loss": float(realized_gain_loss),
                        "new_balance": float(new_balance)
                    }
                }
                
            except Exception as e:
                cursor.execute("ROLLBACK;")
                conn.close()
                raise e
                
        except Exception as e:
            logging.error(f"❌ Error selling stock {symbol} for user {user_id}: {e}")
            return {"success": False, "message": f"Transaction failed: {str(e)}"}
    
    async def get_real_time_price(self, symbol: str) -> Optional[float]:
        """Get real-time stock/index price using multiple data sources with fallback"""
        try:
            symbol = symbol.upper()
            logging.info(f"🔍 Fetching real-time price for {symbol}")
            
            # 1. Try Finnhub API first (Primary)
            try:
                finnhub_token = os.getenv('FINNHUB_API_KEY')
                if not finnhub_token:
                    logging.warning(f"FINNHUB_API_KEY not found in environment variables")
                    raise Exception("Missing Finnhub API key")
                    
                finnhub_url = f"https://finnhub.io/api/v1/quote?symbol={symbol}&token={finnhub_token}"
                
                response = requests.get(finnhub_url, timeout=10)
                if response.status_code == 200:
                    data = response.json()
                    current_price = data.get('c')  # 'c' is current price
                    
                    if current_price and current_price > 0:
                        logging.info(f"✅ Got price for {symbol} from Finnhub: ${current_price:.2f}")
                        return float(current_price)
                else:
                    logging.warning(f"Finnhub API returned status {response.status_code} for {symbol}")
                        
            except Exception as finnhub_error:
                logging.warning(f"Finnhub API failed for {symbol}: {finnhub_error}")
            
            # 2. Try Alpha Vantage API (Secondary)
            try:
                alpha_vantage_key = os.getenv('ALPHA_VANTAGE_API_KEY')
                if not alpha_vantage_key:
                    logging.warning(f"ALPHA_VANTAGE_API_KEY not found in environment variables")
                    raise Exception("Missing Alpha Vantage API key")
                    
                alpha_url = f"https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol={symbol}&apikey={alpha_vantage_key}"
                
                response = requests.get(alpha_url, timeout=15)
                if response.status_code == 200:
                    data = response.json()
                    global_quote = data.get('Global Quote', {})
                    current_price = global_quote.get('05. price')
                    
                    if current_price and float(current_price) > 0:
                        price = float(current_price)
                        logging.info(f"✅ Got price for {symbol} from Alpha Vantage: ${price:.2f}")
                        return price
                else:
                    logging.warning(f"Alpha Vantage API returned status {response.status_code} for {symbol}")
                        
            except Exception as alpha_error:
                logging.warning(f"Alpha Vantage API failed for {symbol}: {alpha_error}")
            
            # 3. Try yfinance fast_info (Tertiary)
            try:
                ticker = yf.Ticker(symbol)
                data = ticker.fast_info
                price = data.get('last_price', None)
                
                if price and price > 0:
                    logging.info(f"✅ Got price for {symbol} from yfinance fast_info: ${price:.2f}")
                    return float(price)
            except Exception as yf_error:
                logging.warning(f"yfinance fast_info failed for {symbol}: {yf_error}")
            
            # 4. Try yfinance info (Quaternary)
            try:
                ticker = yf.Ticker(symbol)
                info = ticker.info
                
                # Try different price fields in order of preference
                price_fields = ['currentPrice', 'regularMarketPrice', 'previousClose', 'open', 'bid', 'ask']
                for field in price_fields:
                    price = info.get(field)
                    if price and price > 0:
                        logging.info(f"✅ Got price for {symbol} from yfinance info.{field}: ${price:.2f}")
                        return float(price)
                        
            except Exception as info_error:
                logging.warning(f"yfinance info failed for {symbol}: {info_error}")
            
            # 5. Try yfinance historical data (Fifth fallback)
            try:
                ticker = yf.Ticker(symbol)
                # Get last 2 days to ensure we get recent data
                hist = ticker.history(period="2d", interval="1d")
                
                if not hist.empty:
                    latest_price = hist['Close'].iloc[-1]
                    if latest_price and latest_price > 0:
                        logging.info(f"✅ Got price for {symbol} from yfinance history: ${latest_price:.2f}")
                        return float(latest_price)
            except Exception as hist_error:
                logging.warning(f"yfinance history failed for {symbol}: {hist_error}")
            
            # 6. Direct Yahoo Finance API (Last resort)
            try:
                url = f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
                headers = {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
                response = requests.get(url, timeout=10, headers=headers)
                
                if response.status_code == 200:
                    data = response.json()
                    
                    if data and 'chart' in data and data['chart']['result']:
                        result = data['chart']['result'][0]
                        if 'meta' in result and 'regularMarketPrice' in result['meta']:
                            price = result['meta']['regularMarketPrice']
                            if price and price > 0:
                                logging.info(f"✅ Got price for {symbol} from Yahoo API: ${price:.2f}")
                                return float(price)
                        
            except Exception as alt_error:
                logging.warning(f"Direct Yahoo API failed for {symbol}: {alt_error}")
            
            logging.error(f"❌ All price fetch methods failed for {symbol}")
            return None
            
        except Exception as e:
            logging.error(f"❌ Error fetching price for {symbol}: {e}")
            return None
    
    async def get_company_info(self, symbol: str) -> Optional[Dict]:
        """Get basic company information"""
        try:
            ticker = yf.Ticker(symbol.upper())
            info = ticker.info
            return {
                'name': info.get('longName', symbol),
                'sector': info.get('sector', 'Unknown'),
                'industry': info.get('industry', 'Unknown')
            }
        except Exception as e:
            logging.error(f"❌ Error fetching company info for {symbol}: {e}")
            return None
    
    async def _update_portfolio_summary(self, user_id: int, cursor) -> None:
        """Update portfolio summary after a transaction"""
        try:
            # Calculate total portfolio value and metrics
            cursor.execute("""
                SELECT 
                    COALESCE(SUM(current_value), 0) as total_value,
                    COALESCE(SUM(total_cost), 0) as total_invested,
                    COUNT(*) as num_holdings
                FROM stock_holdings 
                WHERE user_id = %s
            """, (user_id,))
            
            portfolio_data = cursor.fetchone()
            total_value, total_invested, num_holdings = portfolio_data
            
            total_gain_loss = total_value - total_invested
            total_gain_loss_percent = (total_gain_loss / total_invested * 100) if total_invested > 0 else 0
            
            # Update portfolio summary
            cursor.execute("""
                UPDATE portfolio_summary 
                SET total_portfolio_value = %s, total_invested = %s, 
                    total_gain_loss = %s, total_gain_loss_percent = %s,
                    number_of_holdings = %s, last_calculated = CURRENT_TIMESTAMP
                WHERE user_id = %s
            """, (float(total_value), float(total_invested), float(total_gain_loss), 
                  float(total_gain_loss_percent), num_holdings, user_id))
            
        except Exception as e:
            logging.error(f"❌ Error updating portfolio summary for user {user_id}: {e}")
    
    async def _update_price_cache(self, symbol: str, price: float, company_name: str = None) -> None:
        """Update or insert stock price in cache"""
        try:
            from database import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO stock_prices_cache (symbol, company_name, current_price, last_updated)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
                ON CONFLICT (symbol) 
                DO UPDATE SET 
                    current_price = EXCLUDED.current_price,
                    company_name = COALESCE(EXCLUDED.company_name, stock_prices_cache.company_name),
                    last_updated = CURRENT_TIMESTAMP
            """, (symbol, company_name, price))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logging.error(f"❌ Error updating price cache for {symbol}: {e}")
    
    async def _create_notification(self, user_id: int, notification_type: str, title: str, message: str, data: Dict = None) -> None:
        """Create a notification for the user"""
        try:
            from database import get_connection
            conn = get_connection()
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO notifications (user_id, notification_type, title, message, data)
                VALUES (%s, %s, %s, %s, %s)
            """, (user_id, notification_type, title, message, data))
            
            conn.commit()
            conn.close()
            
        except Exception as e:
            logging.error(f"❌ Error creating notification for user {user_id}: {e}")
