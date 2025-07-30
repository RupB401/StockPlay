const API_BASE_URL = import.meta.env.VITE_API_URL;

export const earningsService = {
  // Fetch earnings calendar data
  async getEarningsCalendar() {
    try {
      const response = await fetch(`${API_BASE_URL}/earnings/calendar`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching earnings calendar:", error);
      throw error;
    }
  },

  // Fetch detailed earnings analysis for a specific stock
  async getEarningsAnalysis(symbol) {
    try {
      const response = await fetch(`${API_BASE_URL}/earnings/analysis/${symbol}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.error(`Error fetching earnings analysis for ${symbol}:`, error);
      throw error;
    }
  },

  // Calculate earnings surprise percentage
  calculateSurprise(actual, estimated) {
    if (!estimated || estimated === 0) return 0;
    return ((actual - estimated) / estimated) * 100;
  },

  // Format market cap display
  formatMarketCap(marketCap) {
    if (typeof marketCap === 'string') return marketCap;
    
    if (marketCap >= 1e12) {
      return `${(marketCap / 1e12).toFixed(1)}T`;
    } else if (marketCap >= 1e9) {
      return `${(marketCap / 1e9).toFixed(0)}B`;
    } else if (marketCap >= 1e6) {
      return `${(marketCap / 1e6).toFixed(0)}M`;
    }
    return marketCap?.toString() || '0';
  },

  // Format date for display
  formatDate(dateString) {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  },

  // Calculate days until earnings
  getDaysUntilEarnings(dateString) {
    try {
      const earningsDate = new Date(dateString);
      const today = new Date();
      const diffTime = earningsDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return "Today";
      if (diffDays === 1) return "Tomorrow";
      if (diffDays > 0) return `${diffDays} days`;
      return `${Math.abs(diffDays)} days ago`;
    } catch (error) {
      return dateString;
    }
  },

  // Get earnings sentiment based on surprise
  getEarningsSentiment(surprise) {
    if (surprise > 10) return { text: "Strong Beat", color: "green" };
    if (surprise > 0) return { text: "Beat", color: "green" };
    if (surprise === 0) return { text: "Met", color: "gray" };
    if (surprise > -5) return { text: "Slight Miss", color: "orange" };
    return { text: "Miss", color: "red" };
  }
};
