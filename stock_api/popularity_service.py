"""
Popularity Service for Stock Universe
Handles calculation and updates of stock popularity metrics
"""

import logging
import asyncio
import yfinance as yf
import requests
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from stock_universe_database import StockUniverseDatabase
# from trading_database import TradingDatabase  # Comment out for now
import sqlite3

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class PopularityService:
    """Service to calculate and update stock popularity metrics"""
    
    # Logo sources for companies
    LOGO_SOURCES = {
        'AAPL': 'https://logo.clearbit.com/apple.com',
        'MSFT': 'https://logo.clearbit.com/microsoft.com',
        'GOOGL': 'https://logo.clearbit.com/google.com',
        'AMZN': 'https://logo.clearbit.com/amazon.com',
        'META': 'https://logo.clearbit.com/meta.com',
        'NVDA': 'https://logo.clearbit.com/nvidia.com',
        'TSLA': 'https://logo.clearbit.com/tesla.com',
        'NFLX': 'https://logo.clearbit.com/netflix.com',
        'JPM': 'https://logo.clearbit.com/jpmorganchase.com',
        'V': 'https://logo.clearbit.com/visa.com',
        'WMT': 'https://logo.clearbit.com/walmart.com',
        'PG': 'https://logo.clearbit.com/pg.com',
        'JNJ': 'https://logo.clearbit.com/jnj.com',
        'HD': 'https://logo.clearbit.com/homedepot.com',
        'BAC': 'https://logo.clearbit.com/bankofamerica.com',
        'MA': 'https://logo.clearbit.com/mastercard.com',
        'UNH': 'https://logo.clearbit.com/unitedhealthgroup.com',
        'PFE': 'https://logo.clearbit.com/pfizer.com',
        'KO': 'https://logo.clearbit.com/coca-cola.com',
        'ABBV': 'https://logo.clearbit.com/abbvie.com'
    }
    
    @classmethod
    def update_stock_popularity_data(cls, symbol: str) -> bool:
        """Update all popularity metrics for a single stock"""
        try:
            logger.info(f"Updating popularity data for {symbol}")
            
            # Get trading data (volume, volatility, price changes)
            trading_metrics = cls._fetch_trading_metrics(symbol)
            
            # Get activity data (watchlist, trades)
            activity_metrics = cls._fetch_activity_metrics(symbol)
            
            # Get search trend data (simulated for now)
            search_metrics = cls._fetch_search_metrics(symbol)
            
            # Get logo
            logo_url = cls._fetch_logo_url(symbol)
            
            # Combine all metrics
            all_metrics = {**trading_metrics, **activity_metrics, **search_metrics}
            if logo_url:
                all_metrics['logo_url'] = logo_url
            
            # Update in database
            success = StockUniverseDatabase.update_popularity_metrics(symbol, all_metrics)
            
            if success:
                logger.info(f"✅ Updated popularity data for {symbol}")
            else:
                logger.warning(f"❌ Failed to update popularity data for {symbol}")
            
            return success
            
        except Exception as e:
            logger.error(f"Error updating popularity data for {symbol}: {e}")
            return False
    
    @classmethod
    def _fetch_trading_metrics(cls, symbol: str) -> Dict:
        """Fetch trading volume, volatility, and price change data"""
        try:
            ticker = yf.Ticker(symbol)
            
            # Get historical data for calculations
            hist = ticker.history(period="1mo")
            if hist.empty:
                return cls._get_default_trading_metrics()
            
            # Get current price
            current_price = hist['Close'].iloc[-1] if not hist.empty else 0
            
            # Calculate price changes
            price_1d = ((hist['Close'].iloc[-1] - hist['Close'].iloc[-2]) / hist['Close'].iloc[-2] * 100) if len(hist) >= 2 else 0
            price_1w = ((hist['Close'].iloc[-1] - hist['Close'].iloc[-7]) / hist['Close'].iloc[-7] * 100) if len(hist) >= 7 else 0
            price_1m = ((hist['Close'].iloc[-1] - hist['Close'].iloc[0]) / hist['Close'].iloc[0] * 100) if len(hist) >= 20 else 0
            
            # Calculate volatility (standard deviation of returns)
            returns = hist['Close'].pct_change().dropna()
            volatility = returns.std() * 100 if not returns.empty else 0
            
            # Get volume data
            avg_volume = hist['Volume'].mean() if not hist.empty else 0
            current_volume = hist['Volume'].iloc[-1] if not hist.empty else 0
            
            return {
                'current_price': float(current_price),
                'trading_volume': float(current_volume),
                'avg_daily_volume': float(avg_volume),
                'volatility': float(volatility),
                'price_change_1d': float(price_1d),
                'price_change_1w': float(price_1w),
                'price_change_1m': float(price_1m),
                'price_change_ytd': float(price_1m)  # Using 1m as approximation
            }
            
        except Exception as e:
            logger.warning(f"Error fetching trading metrics for {symbol}: {e}")
            return cls._get_default_trading_metrics()
    
    @classmethod
    def _get_default_trading_metrics(cls) -> Dict:
        """Get default trading metrics when fetch fails"""
        return {
            'current_price': 0.0,
            'trading_volume': 0.0,
            'avg_daily_volume': 0.0,
            'volatility': 0.0,
            'price_change_1d': 0.0,
            'price_change_1w': 0.0,
            'price_change_1m': 0.0,
            'price_change_ytd': 0.0
        }
    
    @classmethod
    def _fetch_activity_metrics(cls, symbol: str) -> Dict:
        """Fetch watchlist and trading activity from our database"""
        try:
            # For now, return simulated activity data
            # In a real implementation, you'd query the trading database
            
            # Simulate activity based on symbol popularity
            popular_symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA']
            
            if symbol in popular_symbols[:3]:  # Most popular
                base_multiplier = 3
            elif symbol in popular_symbols:  # Popular
                base_multiplier = 2
            else:  # Less popular
                base_multiplier = 1
            
            # Use hash for consistent but varied data
            hash_val = abs(hash(symbol)) % 1000
            
            watchlist_count = base_multiplier * 200 + (hash_val % 100)
            buy_orders = base_multiplier * 50 + (hash_val % 25)
            sell_orders = base_multiplier * 40 + (hash_val % 20)
            total_trades = buy_orders + sell_orders + (hash_val % 30)
            
            return {
                'watchlist_count': watchlist_count,
                'buy_orders_count': buy_orders,
                'sell_orders_count': sell_orders,
                'total_trades_count': total_trades
            }
            
        except Exception as e:
            logger.warning(f"Error fetching activity metrics for {symbol}: {e}")
            return {
                'watchlist_count': 0,
                'buy_orders_count': 0,
                'sell_orders_count': 0,
                'total_trades_count': 0
            }
    
    @classmethod
    def _fetch_search_metrics(cls, symbol: str) -> Dict:
        """Fetch search trend data (simulated for now)"""
        try:
            # For now, we'll simulate search trends based on the symbol popularity
            # In a real implementation, you'd integrate with Google Trends API or similar
            
            popular_symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX']
            
            if symbol in popular_symbols[:4]:  # Most popular
                search_score = 8.0 + (hash(symbol) % 20) / 10  # 8.0-9.9
            elif symbol in popular_symbols:  # Popular
                search_score = 6.0 + (hash(symbol) % 20) / 10  # 6.0-7.9
            else:  # Less popular
                search_score = 1.0 + (hash(symbol) % 50) / 10  # 1.0-5.9
            
            return {'search_trend_score': search_score}
            
        except Exception as e:
            logger.warning(f"Error fetching search metrics for {symbol}: {e}")
            return {'search_trend_score': 1.0}
    
    @classmethod
    def _fetch_logo_url(cls, symbol: str) -> Optional[str]:
        """Get logo URL for the company"""
        try:
            # First check our predefined list
            if symbol in cls.LOGO_SOURCES:
                logo_url = cls.LOGO_SOURCES[symbol]
                
                # Verify the URL is accessible
                try:
                    response = requests.head(logo_url, timeout=5)
                    if response.status_code == 200:
                        return logo_url
                except:
                    pass
            
            # Try generic Clearbit logo
            company_domain = cls._get_company_domain(symbol)
            if company_domain:
                logo_url = f"https://logo.clearbit.com/{company_domain}"
                try:
                    response = requests.head(logo_url, timeout=5)
                    if response.status_code == 200:
                        return logo_url
                except:
                    pass
            
            return None
            
        except Exception as e:
            logger.warning(f"Error fetching logo for {symbol}: {e}")
            return None
    
    @classmethod
    def _get_company_domain(cls, symbol: str) -> Optional[str]:
        """Get company domain for logo fetching"""
        # Map common symbols to domains
        domain_map = {
            'AAPL': 'apple.com',
            'MSFT': 'microsoft.com',
            'GOOGL': 'google.com',
            'AMZN': 'amazon.com',
            'META': 'meta.com',
            'NVDA': 'nvidia.com',
            'TSLA': 'tesla.com',
            'NFLX': 'netflix.com',
            'JPM': 'jpmorganchase.com',
            'V': 'visa.com',
            'WMT': 'walmart.com',
            'HD': 'homedepot.com',
            'BAC': 'bankofamerica.com',
            'MA': 'mastercard.com',
            'KO': 'coca-cola.com'
        }
        
        return domain_map.get(symbol)
    
    @classmethod
    async def update_all_popular_stocks(cls, limit: int = 50):
        """Update popularity data for all active stocks"""
        try:
            # Get active stocks from database
            active_stocks = StockUniverseDatabase.get_active_stocks()
            
            # Limit to most popular ones first
            stocks_to_update = active_stocks[:limit]
            
            logger.info(f"Updating popularity data for {len(stocks_to_update)} stocks")
            
            # Update each stock (with rate limiting)
            successful_updates = 0
            for i, stock in enumerate(stocks_to_update):
                try:
                    success = cls.update_stock_popularity_data(stock['symbol'])
                    if success:
                        successful_updates += 1
                    
                    # Rate limiting - wait between requests
                    if i % 10 == 9:  # Every 10 stocks
                        await asyncio.sleep(2)
                    else:
                        await asyncio.sleep(0.5)
                        
                except Exception as e:
                    logger.error(f"Error updating {stock['symbol']}: {e}")
                    continue
            
            logger.info(f"✅ Updated popularity data for {successful_updates}/{len(stocks_to_update)} stocks")
            return successful_updates
            
        except Exception as e:
            logger.error(f"Error in bulk popularity update: {e}")
            return 0
    
    @classmethod
    def get_popular_stocks_api_format(cls, limit: int = 20, criteria: str = 'overall') -> List[Dict]:
        """Get popular stocks formatted for API response"""
        try:
            stocks = StockUniverseDatabase.get_popular_stocks(limit, criteria)
            
            # Format for API response
            formatted_stocks = []
            for stock in stocks:
                formatted_stock = {
                    'symbol': stock['symbol'],
                    'name': stock['name'],
                    'sector': stock['sector'],
                    'price': stock['current_price'] or 0,
                    'change': stock['price_change_1d'] or 0,
                    'changePercent': stock['price_change_1d'] or 0,
                    'volume': stock['trading_volume'] or 0,
                    'marketCap': stock['market_cap'] or 0,
                    'logo': stock['logo_url'] or '',
                    'popularity_score': stock['popularity_score'] or 0,
                    'volatility': stock['volatility'] or 0,
                    'watchlist_count': stock['watchlist_count'] or 0,
                    'total_trades': stock['total_trades_count'] or 0
                }
                formatted_stocks.append(formatted_stock)
            
            return formatted_stocks
            
        except Exception as e:
            logger.error(f"Error formatting popular stocks: {e}")
            return []

# Async runner for testing
async def main():
    """Test the popularity service"""
    service = PopularityService()
    
    # Test single stock update
    await service.update_stock_popularity_data('AAPL')
    
    # Test bulk update (small batch for testing)
    await service.update_all_popular_stocks(10)
    
    # Test getting popular stocks
    popular = service.get_popular_stocks_api_format(20, 'overall')
    print(f"Retrieved {len(popular)} popular stocks")

if __name__ == "__main__":
    asyncio.run(main())
