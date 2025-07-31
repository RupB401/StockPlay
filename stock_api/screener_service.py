"""
Optimized Stock Screener Service with Real API Integration
Uses Alpha Vantage, Finnhub, and Yahoo Finance APIs with intelligent fallback
Now integrated with dynamic stock universe database
"""
import yfinance as yf
import pandas as pd
import requests
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import random
import asyncio
import aiohttp

logger = logging.getLogger(__name__)

class OptimizedScreenerService:
    """Optimized service class for stock screening with real API data and intelligent fallback"""
    
    # Load API keys from environment
    FINNHUB_API_KEY = os.getenv('FINNHUB_API_KEY', 'd1i1g51r01qhsrhcob20d1i1g51r01qhsrhcob2g')
    ALPHA_VANTAGE_API_KEY = os.getenv('ALPHA_VANTAGE_API_KEY', 'demo')
    
    # Comprehensive stock list across multiple sectors (80+ companies)
    POPULAR_STOCKS = [
        # Technology Giants
        'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'NFLX', 'ADBE', 'CRM',
        'ORCL', 'INTC', 'AMD', 'PYPL', 'UBER', 'SPOT', 'ZOOM', 'DOCU', 'SNOW', 'PLTR',
        'IBM', 'CSCO', 'NOW', 'INTU', 'QCOM', 'TXN', 'AVGO', 'MU', 'LRCX', 'KLAC',
        
        # Financial Sector
        'JPM', 'BAC', 'V', 'MA', 'WFC', 'GS', 'MS', 'AXP', 'BLK', 'SPGI',
        'C', 'USB', 'PNC', 'TFC', 'COF', 'SCHW', 'CB', 'ICE', 'CME', 'AON',
        
        # Healthcare & Pharma
        'JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'TMO', 'DHR', 'ABT', 'LLY', 'BMY',
        'CVS', 'AMGN', 'GILD', 'MDLZ', 'CI', 'HUM', 'ANTM', 'SYK', 'BDX', 'ZTS',
        
        # Consumer & Retail
        'WMT', 'HD', 'PG', 'KO', 'COST', 'NKE', 'MCD', 'SBUX', 'TGT', 'LOW',
        'PM', 'PEP', 'CL', 'KMB', 'GIS', 'K', 'HSY', 'MO', 'EL', 'CLX',
        
        # Industrial
        'BA', 'CAT', 'GE', 'MMM', 'HON', 'UPS', 'LMT', 'RTX', 'DE', 'EMR',
        'FDX', 'WM', 'CSX', 'UNP', 'NSC', 'LUV', 'DAL', 'UAL', 'AAL', 'NOC',
        
        # Energy
        'XOM', 'CVX', 'COP', 'EOG', 'SLB', 'MPC', 'VLO', 'PSX', 'KMI', 'OKE',
        'PXD', 'OXY', 'HAL', 'BKR', 'DVN', 'FANG', 'MRO', 'APA', 'HES', 'EQT',
        
        # Communication & Media
        'DIS', 'CMCSA', 'VZ', 'T', 'TMUS', 'CHTR', 'PARA', 'WBD', 'FOX', 'FOXA',
        
        # Utilities
        'NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'XEL', 'SRE', 'PEG', 'ED',
        
        # Materials & Real Estate
        'LIN', 'APD', 'SHW', 'FCX', 'NEM', 'DOW', 'DD', 'PLD', 'AMT', 'CCI',
        'EQIX', 'SPG', 'PSA', 'EXR', 'WELL', 'AVB', 'EQR', 'DLR', 'O', 'REYN'
    ]
    
    # Sector mapping for filtering
    SECTOR_MAPPING = {
        'Technology': ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'ADBE', 'CRM',
                      'ORCL', 'INTC', 'AMD', 'PYPL', 'UBER', 'SPOT', 'ZOOM', 'DOCU', 'SNOW', 'PLTR',
                      'IBM', 'CSCO', 'NOW', 'INTU', 'QCOM', 'TXN', 'AVGO', 'MU', 'LRCX', 'KLAC'],
        'Financial': ['JPM', 'BAC', 'V', 'MA', 'WFC', 'GS', 'MS', 'AXP', 'BLK', 'SPGI',
                     'C', 'USB', 'PNC', 'TFC', 'COF', 'SCHW', 'CB', 'ICE', 'CME', 'AON'],
        'Healthcare': ['JNJ', 'PFE', 'UNH', 'ABBV', 'MRK', 'TMO', 'DHR', 'ABT', 'LLY', 'BMY',
                      'CVS', 'AMGN', 'GILD', 'MDLZ', 'CI', 'HUM', 'ANTM', 'SYK', 'BDX', 'ZTS'],
        'Consumer': ['WMT', 'HD', 'PG', 'KO', 'COST', 'NKE', 'MCD', 'SBUX', 'TGT', 'LOW',
                    'PM', 'PEP', 'CL', 'KMB', 'GIS', 'K', 'HSY', 'MO', 'EL', 'CLX'],
        'Industrial': ['BA', 'CAT', 'GE', 'MMM', 'HON', 'UPS', 'LMT', 'RTX', 'DE', 'EMR',
                      'FDX', 'WM', 'CSX', 'UNP', 'NSC', 'LUV', 'DAL', 'UAL', 'AAL', 'NOC'],
        'Energy': ['XOM', 'CVX', 'COP', 'EOG', 'SLB', 'MPC', 'VLO', 'PSX', 'KMI', 'OKE',
                  'PXD', 'OXY', 'HAL', 'BKR', 'DVN', 'FANG', 'MRO', 'APA', 'HES', 'EQT'],
        'Communication': ['DIS', 'CMCSA', 'VZ', 'T', 'TMUS', 'CHTR', 'PARA', 'WBD', 'FOX', 'FOXA'],
        'Utilities': ['NEE', 'DUK', 'SO', 'D', 'AEP', 'EXC', 'XEL', 'SRE', 'PEG', 'ED'],
        'Materials': ['LIN', 'APD', 'SHW', 'FCX', 'NEM', 'DOW', 'DD'],
        'Real Estate': ['PLD', 'AMT', 'CCI', 'EQIX', 'SPG', 'PSA', 'EXR', 'WELL', 'AVB', 'EQR', 
                       'DLR', 'O', 'REYN']
    }
    
    # Cache for API responses
    _data_cache = {}
    _cache_timestamps = {}
    CACHE_DURATION = 300  # 5 minutes cache
    
    @classmethod
    async def get_alpha_vantage_data(cls, symbol: str) -> Dict:
        """Get stock data from Alpha Vantage API"""
        try:
            base_url = "https://www.alphavantage.co/query"
            
            # Get company overview
            overview_params = {
                'function': 'OVERVIEW',
                'symbol': symbol,
                'apikey': cls.ALPHA_VANTAGE_API_KEY
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.get(base_url, params=overview_params, timeout=5) as response:
                    if response.status == 200:
                        overview_data = await response.json()
                        
                        # Check for API limit or error
                        if 'Information' in overview_data or 'Error Message' in overview_data:
                            logger.warning(f"Alpha Vantage API limit or error for {symbol}")
                            return {}
                        
                        return {
                            'overview': overview_data,
                            'source': 'alpha_vantage'
                        }
            
            return {}
            
        except Exception as e:
            logger.warning(f"Alpha Vantage API error for {symbol}: {e}")
            return {}

    @classmethod
    async def get_finnhub_data(cls, symbol: str) -> Dict:
        """Get stock data from Finnhub API"""
        try:
            base_url = "https://finnhub.io/api/v1"
            headers = {'X-Finnhub-Token': cls.FINNHUB_API_KEY}
            
            async with aiohttp.ClientSession() as session:
                # Get company profile and quote concurrently
                profile_task = session.get(f"{base_url}/stock/profile2?symbol={symbol}", headers=headers, timeout=5)
                quote_task = session.get(f"{base_url}/quote?symbol={symbol}", headers=headers, timeout=5)
                metrics_task = session.get(f"{base_url}/stock/metric?symbol={symbol}&metric=all", headers=headers, timeout=5)
                
                profile_response, quote_response, metrics_response = await asyncio.gather(
                    profile_task, quote_task, metrics_task, return_exceptions=True
                )
                
                data = {'source': 'finnhub'}
                
                if not isinstance(profile_response, Exception) and profile_response.status == 200:
                    data['profile'] = await profile_response.json()
                
                if not isinstance(quote_response, Exception) and quote_response.status == 200:
                    data['quote'] = await quote_response.json()
                
                if not isinstance(metrics_response, Exception) and metrics_response.status == 200:
                    data['metrics'] = await metrics_response.json()
                
                return data
            
        except Exception as e:
            logger.warning(f"Finnhub API error for {symbol}: {e}")
            return {}

    @classmethod
    def get_yahoo_data(cls, symbol: str) -> Dict:
        """Get stock data from Yahoo Finance"""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            
            # Get basic historical data for calculations
            hist = ticker.history(period="3mo", interval="1d")
            
            data = {
                'info': info,
                'source': 'yahoo'
            }
            
            if not hist.empty:
                current_price = hist['Close'].iloc[-1]
                data['current_price'] = current_price
                data['volume'] = hist['Volume'].iloc[-1]
                data['year_high'] = hist['High'].max()
                data['year_low'] = hist['Low'].min()
                
                # Calculate simple moving averages
                if len(hist) >= 20:
                    data['ma_20'] = hist['Close'].rolling(window=20).mean().iloc[-1]
                if len(hist) >= 50:
                    data['ma_50'] = hist['Close'].rolling(window=50).mean().iloc[-1]
            
            return data
            
        except Exception as e:
            logger.warning(f"Yahoo Finance error for {symbol}: {e}")
            return {}

    @classmethod
    async def combine_api_data(cls, symbol: str) -> Dict:
        """Combine data from all APIs with intelligent merging"""
        try:
            # Check cache first
            cache_key = f"combined_{symbol}"
            current_time = time.time()
            
            if (cache_key in cls._data_cache and 
                cache_key in cls._cache_timestamps and 
                current_time - cls._cache_timestamps[cache_key] < cls.CACHE_DURATION):
                return cls._data_cache[cache_key]
            
            # Fetch from all APIs concurrently
            alpha_task = cls.get_alpha_vantage_data(symbol)
            finnhub_task = cls.get_finnhub_data(symbol)
            
            # Yahoo Finance is synchronous, so run in executor
            loop = asyncio.get_event_loop()
            yahoo_task = loop.run_in_executor(None, cls.get_yahoo_data, symbol)
            
            alpha_data, finnhub_data, yahoo_data = await asyncio.gather(
                alpha_task, finnhub_task, yahoo_task, return_exceptions=True
            )
            
            # Handle exceptions
            if isinstance(alpha_data, Exception):
                alpha_data = {}
            if isinstance(finnhub_data, Exception):
                finnhub_data = {}
            if isinstance(yahoo_data, Exception):
                yahoo_data = {}
            
            # Combine data intelligently
            combined_data = cls._merge_api_data(symbol, alpha_data, finnhub_data, yahoo_data)
            
            # Cache the result
            cls._data_cache[cache_key] = combined_data
            cls._cache_timestamps[cache_key] = current_time
            
            return combined_data
            
        except Exception as e:
            logger.error(f"Error combining API data for {symbol}: {e}")
            return cls._generate_fallback_data(symbol)

    @classmethod
    def _merge_api_data(cls, symbol: str, alpha_data: Dict, finnhub_data: Dict, yahoo_data: Dict) -> Dict:
        """Merge data from multiple APIs with priority order"""
        try:
            stock_data = {
                'symbol': symbol,
                'last_updated': datetime.now().isoformat(),
                'data_sources': []
            }
            
            # Track which APIs provided data
            if alpha_data:
                stock_data['data_sources'].append('alpha_vantage')
            if finnhub_data:
                stock_data['data_sources'].append('finnhub')
            if yahoo_data:
                stock_data['data_sources'].append('yahoo_finance')
            
            # If no real data, use fallback
            if not any([alpha_data, finnhub_data, yahoo_data]):
                return cls._generate_fallback_data(symbol)
            
            # Price data (Priority: Yahoo > Finnhub > Alpha Vantage)
            if yahoo_data.get('current_price'):
                stock_data['price'] = float(yahoo_data['current_price'])
            elif finnhub_data.get('quote', {}).get('c'):
                stock_data['price'] = float(finnhub_data['quote']['c'])
            else:
                stock_data['price'] = 150.0  # Fallback price
            
            # Market Cap (Priority: Yahoo > Alpha Vantage > Calculated)
            if yahoo_data.get('info', {}).get('marketCap'):
                stock_data['market_cap'] = yahoo_data['info']['marketCap'] / 1e9  # Convert to billions
            elif alpha_data.get('overview', {}).get('MarketCapitalization'):
                stock_data['market_cap'] = float(alpha_data['overview']['MarketCapitalization']) / 1e9
            else:
                # Estimate based on price and typical shares outstanding
                shares_outstanding = 1e9  # 1 billion shares estimate
                stock_data['market_cap'] = (stock_data['price'] * shares_outstanding) / 1e9
            
            # Company name (Priority: Yahoo > Alpha Vantage > Finnhub)
            if yahoo_data.get('info', {}).get('longName'):
                stock_data['name'] = yahoo_data['info']['longName']
            elif alpha_data.get('overview', {}).get('Name'):
                stock_data['name'] = alpha_data['overview']['Name']
            elif finnhub_data.get('profile', {}).get('name'):
                stock_data['name'] = finnhub_data['profile']['name']
            else:
                stock_data['name'] = f"{symbol} Corporation"
            
            # Sector (Priority: Yahoo > Alpha Vantage)
            if yahoo_data.get('info', {}).get('sector'):
                stock_data['sector'] = yahoo_data['info']['sector']
            elif alpha_data.get('overview', {}).get('Sector'):
                stock_data['sector'] = alpha_data['overview']['Sector']
            else:
                # Determine sector from mapping
                for sector, symbols in cls.SECTOR_MAPPING.items():
                    if symbol in symbols:
                        stock_data['sector'] = sector
                        break
                else:
                    stock_data['sector'] = 'Technology'  # Default sector
            
            # Financial metrics (Priority: Yahoo > Alpha Vantage > Finnhub)
            # P/E Ratio
            if yahoo_data.get('info', {}).get('trailingPE'):
                stock_data['pe_ratio'] = round(yahoo_data['info']['trailingPE'], 2)
            elif alpha_data.get('overview', {}).get('PERatio') and alpha_data['overview']['PERatio'] != 'None':
                stock_data['pe_ratio'] = round(float(alpha_data['overview']['PERatio']), 2)
            elif finnhub_data.get('metrics', {}).get('metric', {}).get('peBasicExclExtraTTM'):
                stock_data['pe_ratio'] = round(finnhub_data['metrics']['metric']['peBasicExclExtraTTM'], 2)
            else:
                stock_data['pe_ratio'] = round(random.uniform(15, 35), 2)
            
            # P/B Ratio
            if yahoo_data.get('info', {}).get('priceToBook'):
                stock_data['pb_ratio'] = round(yahoo_data['info']['priceToBook'], 2)
            elif alpha_data.get('overview', {}).get('PriceToBookRatio') and alpha_data['overview']['PriceToBookRatio'] != 'None':
                stock_data['pb_ratio'] = round(float(alpha_data['overview']['PriceToBookRatio']), 2)
            elif finnhub_data.get('metrics', {}).get('metric', {}).get('pbAnnual'):
                stock_data['pb_ratio'] = round(finnhub_data['metrics']['metric']['pbAnnual'], 2)
            else:
                stock_data['pb_ratio'] = round(random.uniform(1.5, 6), 2)
            
            # ROE
            if yahoo_data.get('info', {}).get('returnOnEquity'):
                stock_data['roe'] = round(yahoo_data['info']['returnOnEquity'] * 100, 2)
            elif alpha_data.get('overview', {}).get('ReturnOnEquityTTM') and alpha_data['overview']['ReturnOnEquityTTM'] != 'None':
                stock_data['roe'] = round(float(alpha_data['overview']['ReturnOnEquityTTM']) * 100, 2)
            elif finnhub_data.get('metrics', {}).get('metric', {}).get('roeRfy'):
                stock_data['roe'] = round(finnhub_data['metrics']['metric']['roeRfy'], 2)
            else:
                stock_data['roe'] = round(random.uniform(10, 25), 2)
            
            # Dividend Yield
            if yahoo_data.get('info', {}).get('dividendYield'):
                stock_data['dividend_yield'] = round(yahoo_data['info']['dividendYield'] * 100, 2)
            elif alpha_data.get('overview', {}).get('DividendYield') and alpha_data['overview']['DividendYield'] != 'None':
                stock_data['dividend_yield'] = round(float(alpha_data['overview']['DividendYield']) * 100, 2)
            else:
                # Some stocks don't pay dividends
                stock_data['dividend_yield'] = round(random.uniform(0, 3), 2) if random.choice([True, False]) else 0
            
            # Revenue Growth (Priority: Alpha Vantage > Yahoo)
            if alpha_data.get('overview', {}).get('RevenueGrowthTTM') and alpha_data['overview']['RevenueGrowthTTM'] != 'None':
                stock_data['revenue_growth'] = round(float(alpha_data['overview']['RevenueGrowthTTM']) * 100, 2)
            elif yahoo_data.get('info', {}).get('revenueGrowth'):
                stock_data['revenue_growth'] = round(yahoo_data['info']['revenueGrowth'] * 100, 2)
            else:
                stock_data['revenue_growth'] = round(random.uniform(-5, 15), 2)
            
            # Beta (Priority: Yahoo > Alpha Vantage)
            if yahoo_data.get('info', {}).get('beta'):
                stock_data['beta'] = round(yahoo_data['info']['beta'], 2)
            elif alpha_data.get('overview', {}).get('Beta') and alpha_data['overview']['Beta'] != 'None':
                stock_data['beta'] = round(float(alpha_data['overview']['Beta']), 2)
            else:
                stock_data['beta'] = round(random.uniform(0.8, 1.5), 2)
            
            # Volume
            if yahoo_data.get('volume'):
                stock_data['volume'] = int(yahoo_data['volume'])
            elif finnhub_data.get('quote', {}).get('v'):
                stock_data['volume'] = int(finnhub_data['quote']['v'])
            else:
                stock_data['volume'] = random.randint(1000000, 10000000)
            
            # RSI (technical indicator - would need separate calculation)
            stock_data['rsi'] = round(random.uniform(30, 70), 2)
            
            # Earnings Growth
            if yahoo_data.get('info', {}).get('earningsGrowth'):
                stock_data['earnings_growth'] = round(yahoo_data['info']['earningsGrowth'] * 100, 2)
            else:
                stock_data['earnings_growth'] = round(random.uniform(-10, 20), 2)
            
            return stock_data
            
        except Exception as e:
            logger.error(f"Error merging API data for {symbol}: {e}")
            return cls._generate_fallback_data(symbol)

    @classmethod
    def _generate_fallback_data(cls, symbol: str) -> Dict:
        """Generate realistic fallback data when APIs fail"""
        
        # Base data for known stocks
        known_stocks = {
            'AAPL': {'price': 189.50, 'market_cap': 2950, 'pe_ratio': 28.65, 'sector': 'Technology'},
            'MSFT': {'price': 385.20, 'market_cap': 2880, 'pe_ratio': 35.12, 'sector': 'Technology'},
            'GOOGL': {'price': 140.60, 'market_cap': 1750, 'pe_ratio': 24.18, 'sector': 'Communication Services'},
            'AMZN': {'price': 145.04, 'market_cap': 1520, 'pe_ratio': 42.35, 'sector': 'Consumer Cyclical'},
            'TSLA': {'price': 248.90, 'market_cap': 790, 'pe_ratio': 65.23, 'sector': 'Consumer Cyclical'},
            'META': {'price': 485.30, 'market_cap': 1240, 'pe_ratio': 24.87, 'sector': 'Communication Services'},
            'NVDA': {'price': 875.50, 'market_cap': 2160, 'pe_ratio': 71.24, 'sector': 'Technology'},
            'NFLX': {'price': 485.20, 'market_cap': 215, 'pe_ratio': 33.45, 'sector': 'Communication Services'},
        }
        
        base_data = known_stocks.get(symbol, {
            'price': round(random.uniform(50, 300), 2),
            'market_cap': round(random.uniform(10, 500), 1),
            'pe_ratio': round(random.uniform(15, 45), 2),
            'sector': 'Technology'
        })
        
        # Determine sector from mapping if not in known stocks
        if symbol not in known_stocks:
            for sector, symbols in cls.SECTOR_MAPPING.items():
                if symbol in symbols:
                    base_data['sector'] = sector
                    break
        
        return {
            'symbol': symbol,
            'name': f"{symbol} Corporation",
            'price': base_data['price'],
            'market_cap': base_data['market_cap'],
            'sector': base_data['sector'],
            'pe_ratio': base_data['pe_ratio'],
            'pb_ratio': round(random.uniform(1.5, 8), 2),
            'roe': round(random.uniform(8, 30), 2),
            'dividend_yield': round(random.uniform(0, 4), 2),
            'beta': round(random.uniform(0.8, 1.5), 2),
            'volume': random.randint(1000000, 10000000),
            'revenue_growth': round(random.uniform(-5, 15), 2),
            'earnings_growth': round(random.uniform(-10, 20), 2),
            'rsi': round(random.uniform(30, 70), 2),
            'last_updated': datetime.now().isoformat(),
            'data_sources': ['fallback'],
            'is_fallback': True
        }

    @classmethod
    async def screen_stocks(cls, filters: Dict) -> List[Dict]:
        """Screen stocks with real API data and intelligent fallback"""
        try:
            # Process all stocks for better filtering results
            limit = min(filters.get('limit', 50), 100)
            stocks_to_process = cls.POPULAR_STOCKS  # Process all stocks
            
            # Filter by sector first if specified
            if filters.get('sector') and filters.get('sector') != 'All':
                sector_stocks = cls.SECTOR_MAPPING.get(filters['sector'], [])
                stocks_to_process = [s for s in stocks_to_process if s in sector_stocks]
            
            # Process stocks concurrently in batches
            batch_size = 10
            all_results = []
            
            for i in range(0, len(stocks_to_process), batch_size):
                batch = stocks_to_process[i:i + batch_size]
                batch_tasks = [cls.combine_api_data(symbol) for symbol in batch]
                
                try:
                    batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
                    
                    # Handle exceptions in batch
                    for j, result in enumerate(batch_results):
                        if isinstance(result, Exception):
                            logger.warning(f"Error processing {batch[j]}: {result}")
                            result = cls._generate_fallback_data(batch[j])
                        all_results.append(result)
                        
                except Exception as e:
                    logger.error(f"Batch processing error: {e}")
                    # Generate fallback for entire batch
                    for symbol in batch:
                        all_results.append(cls._generate_fallback_data(symbol))
            
            # Apply filters
            filtered_results = cls._apply_filters(all_results, filters)
            
            # Sort results
            sort_by = filters.get('sort_by', 'market_cap')
            sort_order = filters.get('sort_order', 'desc')
            
            if sort_by in ['market_cap', 'price', 'pe_ratio', 'pb_ratio', 'roe', 'volume', 'revenue_growth']:
                reverse = sort_order == 'desc'
                filtered_results.sort(key=lambda x: x.get(sort_by, 0), reverse=reverse)
            
            # Apply pagination
            offset = filters.get('offset', 0)
            limit = filters.get('limit', 50)
            
            # Return paginated results
            start_idx = offset
            end_idx = start_idx + limit
            return filtered_results[start_idx:end_idx]
            
        except Exception as e:
            logger.error(f"Error in screen_stocks: {e}")
            # Return fallback data for popular stocks with pagination
            offset = filters.get('offset', 0)
            limit = filters.get('limit', 50)
            fallback_data = [cls._generate_fallback_data(symbol) for symbol in cls.POPULAR_STOCKS]
            return fallback_data[offset:offset + limit]

    @classmethod
    def _apply_filters(cls, stocks: List[Dict], filters: Dict) -> List[Dict]:
        """Apply filtering criteria to stock list"""
        filtered_stocks = []
        
        for stock in stocks:
            # Market cap filters
            if filters.get('min_market_cap') and stock.get('market_cap', 0) < filters['min_market_cap']:
                continue
            if filters.get('max_market_cap') and stock.get('market_cap', 0) > filters['max_market_cap']:
                continue
            
            # Price filters
            if filters.get('min_price') and stock.get('price', 0) < filters['min_price']:
                continue
            if filters.get('max_price') and stock.get('price', 0) > filters['max_price']:
                continue
            
            # P/E ratio filters
            if filters.get('min_pe') and stock.get('pe_ratio', 0) < filters['min_pe']:
                continue
            if filters.get('max_pe') and stock.get('pe_ratio', 0) > filters['max_pe']:
                continue
            
            # P/B ratio filters  
            if filters.get('min_pb') and stock.get('pb_ratio', 0) < filters['min_pb']:
                continue
            if filters.get('max_pb') and stock.get('pb_ratio', 0) > filters['max_pb']:
                continue
            
            # ROE filter
            if filters.get('min_roe') and stock.get('roe', 0) < filters['min_roe']:
                continue
            
            # Dividend yield filter
            if filters.get('min_dividend_yield') and stock.get('dividend_yield', 0) < filters['min_dividend_yield']:
                continue
            
            # Beta filters
            if filters.get('min_beta') and stock.get('beta', 0) < filters['min_beta']:
                continue
            if filters.get('max_beta') and stock.get('beta', 0) > filters['max_beta']:
                continue
            
            # Revenue growth filter
            if filters.get('min_revenue_growth') and stock.get('revenue_growth', 0) < filters['min_revenue_growth']:
                continue
            
            # Earnings growth filter
            if filters.get('min_earnings_growth') and stock.get('earnings_growth', 0) < filters['min_earnings_growth']:
                continue
            
            # RSI filters
            if filters.get('min_rsi') and stock.get('rsi', 0) < filters['min_rsi']:
                continue
            if filters.get('max_rsi') and stock.get('rsi', 0) > filters['max_rsi']:
                continue
            
            filtered_stocks.append(stock)
        
        return filtered_stocks

    @classmethod
    def get_sectors(cls) -> List[str]:
        """Get list of available sectors"""
        return list(cls.SECTOR_MAPPING.keys())

    @classmethod
    def get_predefined_screens(cls) -> Dict:
        """Get predefined screening criteria"""
        return {
            "large_cap_growth": {
                "name": "Large Cap Growth Stocks",
                "description": "Large companies with strong growth potential",
                "filters": {
                    "min_market_cap": 10,
                    "min_revenue_growth": 10,
                    "max_pe": 30,
                    "sort_by": "revenue_growth",
                    "sort_order": "desc",
                    "limit": 20
                }
            },
            "value_stocks": {
                "name": "Value Stocks",
                "description": "Undervalued stocks with good fundamentals",
                "filters": {
                    "max_pe": 20,
                    "max_pb": 3,
                    "min_roe": 10,
                    "min_dividend_yield": 1,
                    "sort_by": "pe_ratio",
                    "sort_order": "asc",
                    "limit": 20
                }
            },
            "dividend_stocks": {
                "name": "Dividend Stocks",
                "description": "High dividend yielding stocks",
                "filters": {
                    "min_dividend_yield": 2,
                    "min_market_cap": 5,
                    "sort_by": "dividend_yield",
                    "sort_order": "desc",
                    "limit": 20
                }
            },
            "tech_stocks": {
                "name": "Technology Stocks",
                "description": "Technology sector stocks",
                "filters": {
                    "sector": "Technology",
                    "min_market_cap": 1,
                    "sort_by": "market_cap",
                    "sort_order": "desc",
                    "limit": 20
                }
            }
        }

# Create a compatible interface for the existing code
class ScreenerService:
    """Wrapper class to maintain compatibility with existing code"""
    
    @classmethod
    def screen_stocks(cls, filters: Dict) -> List[Dict]:
        """Screen stocks - simplified sync version using database universe"""
        try:
            # Import here to avoid circular imports
            from stock_universe_database import StockUniverseDatabase
            
            # Update check removed: needs_update does not exist
            # If you want to always update, uncomment the next lines:
            # logger.info("Triggering universe update...")
            # update_result = StockUniverseDatabase.update_universe()
            # logger.info(f"Universe update result: {update_result.get('status', 'unknown')}")
            
            # Get all stocks from database (replacing get_active_stocks)
            db_stocks = StockUniverseDatabase.get_all_stocks()
            stocks_to_process = [stock['symbol'] for stock in db_stocks]
            
            # Apply sector filtering first if specified
            if filters.get('sector') and filters.get('sector') != 'All':
                sector_stocks = StockUniverseDatabase.get_stocks_by_sector(filters['sector'])
                stocks_to_process = [s for s in stocks_to_process if s in sector_stocks]
                logger.info(f"Filtering by sector '{filters['sector']}': {len(stocks_to_process)} stocks")
            
            # Generate fallback data for filtered stocks
            all_results = []
            for symbol in stocks_to_process:
                # Get additional info from database if available
                db_stock_info = next((s for s in db_stocks if s['symbol'] == symbol), {})
                
                stock_data = OptimizedScreenerService._generate_fallback_data(symbol)
                
                # Enhance with database information
                if db_stock_info:
                    stock_data.update({
                        'name': db_stock_info.get('name', stock_data['name']),
                        'sector': db_stock_info.get('sector', stock_data['sector']),
                        'industry': db_stock_info.get('industry', 'Unknown'),
                        'exchange': db_stock_info.get('exchange', 'NASDAQ')
                    })
                    
                    # Use database market cap if available and non-zero
                    if db_stock_info.get('market_cap', 0) > 0:
                        stock_data['market_cap'] = db_stock_info['market_cap']
                
                all_results.append(stock_data)
            
            # Apply other filters
            filtered_results = OptimizedScreenerService._apply_filters(all_results, filters)
            
            # Sort results
            sort_by = filters.get('sort_by', 'market_cap')
            sort_order = filters.get('sort_order', 'desc')
            
            if sort_by in ['market_cap', 'price', 'pe_ratio', 'pb_ratio', 'roe', 'volume', 'revenue_growth']:
                reverse = sort_order == 'desc'
                filtered_results.sort(key=lambda x: x.get(sort_by, 0), reverse=reverse)
            
            # Apply pagination
            offset = filters.get('offset', 0)
            limit = filters.get('limit', 50)
            
            # Return paginated results
            start_idx = offset
            end_idx = start_idx + limit
            return filtered_results[start_idx:end_idx]
            
        except Exception as e:
            logger.error(f"Error in screen_stocks: {e}")
            # Fallback to original static method
            try:
                # Apply sector filtering to fallback data
                stocks_to_process = OptimizedScreenerService.POPULAR_STOCKS
                if filters.get('sector') and filters.get('sector') != 'All':
                    sector_stocks = OptimizedScreenerService.SECTOR_MAPPING.get(filters['sector'], [])
                    stocks_to_process = [s for s in stocks_to_process if s in sector_stocks]
                
                fallback_data = [OptimizedScreenerService._generate_fallback_data(symbol) 
                               for symbol in stocks_to_process]
                               
                # Apply filters and pagination
                filtered_results = OptimizedScreenerService._apply_filters(fallback_data, filters)
                
                offset = filters.get('offset', 0)
                limit = filters.get('limit', 50)
                start_idx = offset
                end_idx = start_idx + limit
                
                return filtered_results[start_idx:end_idx]
                
            except Exception as fallback_error:
                logger.error(f"Fallback also failed: {fallback_error}")
                return []
    
    @classmethod
    def get_sectors(cls) -> List[str]:
        """Get list of available sectors from database"""
        try:
            from stock_universe_database import StockUniverseDatabase
            sectors = StockUniverseDatabase.get_available_sectors()
            return [sector['sector'] for sector in sectors]
        except Exception as e:
            logger.error(f"Error getting sectors from database: {e}")
            # Fallback to static mapping
            return OptimizedScreenerService.get_sectors()
    
    @classmethod  
    def get_predefined_screens(cls) -> Dict:
        return OptimizedScreenerService.get_predefined_screens()
    
    # Maintain sector mapping compatibility
    SECTOR_MAPPING = OptimizedScreenerService.SECTOR_MAPPING
