/**
 * Screener Service
 * Handles API communication for stock screening functionality
 */

const API_BASE_URL = 'http://localhost:8000';

export const screenerService = {
  /**
   * Screen stocks based on custom filters
   */
  async screenStocks(filters) {
    try {
      const params = new URLSearchParams();
      
      // Add all non-null filters to query params
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          params.append(key, value);
        }
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      const response = await fetch(`${API_BASE_URL}/screener/screen?${params}`, {
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error('Screener request timed out after 30 seconds');
        throw new Error('Request timed out. Please try again with fewer filters or reload the page.');
      }
      console.error('Error screening stocks:', error);
      throw error;
    }
  },

  /**
   * Get predefined screening options
   */
  async getPredefinedScreens() {
    try {
      const response = await fetch(`${API_BASE_URL}/screener/predefined`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data.screens;
    } catch (error) {
      console.error('Error fetching predefined screens:', error);
      throw error;
    }
  },

  /**
   * Run a predefined screen
   */
  async runPredefinedScreen(screenName) {
    try {
      const response = await fetch(`${API_BASE_URL}/screener/predefined/${screenName}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data;
    } catch (error) {
      console.error('Error running predefined screen:', error);
      throw error;
    }
  },

  /**
   * Get available sectors
   */
  async getSectors() {
    try {
      const response = await fetch(`${API_BASE_URL}/screener/sectors`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data.sectors;
    } catch (error) {
      console.error('Error fetching sectors:', error);
      throw error;
    }
  },

  /**
   * Get top gaining stocks
   */
  async getTopGainers(limit = 20) {
    try {
      const response = await fetch(`${API_BASE_URL}/screener/top-gainers?limit=${limit}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching top gainers:', error);
      throw error;
    }
  },

  /**
   * Get top losing stocks
   */
  async getTopLosers(limit = 20) {
    try {
      const response = await fetch(`${API_BASE_URL}/screener/top-losers?limit=${limit}`);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching top losers:', error);
      throw error;
    }
  },

  /**
   * Utility functions
   */
  formatMarketCap(marketCap) {
    if (marketCap >= 1e12) {
      return `$${(marketCap / 1e12).toFixed(1)}T`;
    } else if (marketCap >= 1e9) {
      return `$${(marketCap / 1e9).toFixed(1)}B`;
    } else if (marketCap >= 1e6) {
      return `$${(marketCap / 1e6).toFixed(1)}M`;
    } else {
      return `$${marketCap.toLocaleString()}`;
    }
  },

  formatNumber(num, decimals = 2) {
    if (num === null || num === undefined) return 'N/A';
    return Number(num).toFixed(decimals);
  },

  formatPercent(num, decimals = 1) {
    if (num === null || num === undefined) return 'N/A';
    return `${Number(num).toFixed(decimals)}%`;
  },

  getMarketCapCategory(marketCap) {
    if (marketCap >= 200e9) return 'Mega Cap';
    if (marketCap >= 10e9) return 'Large Cap';
    if (marketCap >= 2e9) return 'Mid Cap';
    if (marketCap >= 300e6) return 'Small Cap';
    return 'Micro Cap';
  },

  getPERating(pe) {
    if (!pe) return 'N/A';
    if (pe < 0) return 'Negative';
    if (pe < 15) return 'Undervalued';
    if (pe < 25) return 'Fair';
    if (pe < 35) return 'Expensive';
    return 'Very Expensive';
  },

  getRSISignal(rsi) {
    if (!rsi) return 'N/A';
    if (rsi < 30) return 'Oversold';
    if (rsi > 70) return 'Overbought';
    return 'Neutral';
  },

  getDividendCategory(yield_pct) {
    if (!yield_pct || yield_pct <= 0) return 'No Dividend';
    if (yield_pct < 2) return 'Low Yield';
    if (yield_pct < 4) return 'Moderate Yield';
    if (yield_pct < 6) return 'High Yield';
    return 'Very High Yield';
  },

  /**
   * Export results to CSV
   */
  exportToCSV(data, filename = 'stock_screen_results.csv') {
    if (!data || data.length === 0) return;

    const headers = [
      'Symbol', 'Company', 'Sector', 'Price', 'Market Cap', 'P/E Ratio',
      'P/B Ratio', 'Div Yield', 'Beta', 'ROE', 'Revenue Growth', 'Earnings Growth',
      '52W High', '52W Low', 'RSI'
    ];

    const csvContent = [
      headers.join(','),
      ...data.map(stock => [
        stock.symbol,
        `"${stock.company_name}"`,
        `"${stock.sector}"`,
        stock.price || stock.current_price || '',
        stock.market_cap,
        stock.pe_ratio || '',
        stock.pb_ratio || '',
        stock.dividend_yield || '',
        stock.beta || '',
        stock.roe || '',
        stock.revenue_growth || '',
        stock.earnings_growth || '',
        stock['52_week_high'],
        stock['52_week_low'],
        stock.rsi || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
