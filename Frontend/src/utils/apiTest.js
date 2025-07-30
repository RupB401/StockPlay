/**
 * API Health Check and Test Script
 * Run this to test if all APIs are working correctly
 */

import { apiEndpoints } from './apiInterceptor.js';

const testAPI = async () => {
  console.log('🔍 Starting API health check...');
  
  // Check if user is logged in
  const token = localStorage.getItem('access_token');
  if (!token) {
    console.log('❌ No access token found. Please login first.');
    return;
  }
  
  console.log('✅ Access token found');
  
  // Test wallet endpoint
  try {
    console.log('🔍 Testing wallet endpoint...');
    const walletResponse = await apiEndpoints.wallet();
    if (walletResponse.ok) {
      const walletData = await walletResponse.json();
      console.log('✅ Wallet endpoint working:', walletData);
    } else {
      console.log('❌ Wallet endpoint failed:', walletResponse.status);
    }
  } catch (error) {
    console.log('❌ Wallet endpoint error:', error.message);
  }
  
  // Test portfolio endpoint
  try {
    console.log('🔍 Testing portfolio endpoint...');
    const portfolioResponse = await apiEndpoints.portfolio();
    if (portfolioResponse.ok) {
      const portfolioData = await portfolioResponse.json();
      console.log('✅ Portfolio endpoint working:', portfolioData);
    } else {
      console.log('❌ Portfolio endpoint failed:', portfolioResponse.status);
    }
  } catch (error) {
    console.log('❌ Portfolio endpoint error:', error.message);
  }
  
  // Test stock detail endpoint
  try {
    console.log('🔍 Testing stock detail endpoint with AAPL...');
    const stockResponse = await apiEndpoints.stockDetail('AAPL');
    if (stockResponse.ok) {
      const stockData = await stockResponse.json();
      console.log('✅ Stock detail endpoint working:', stockData);
    } else {
      console.log('❌ Stock detail endpoint failed:', stockResponse.status);
    }
  } catch (error) {
    console.log('❌ Stock detail endpoint error:', error.message);
  }
  
  console.log('✅ API health check complete');
};

// Export for use in console
window.testAPI = testAPI;

// Auto-run if in development mode
if (import.meta.env.DEV) {
  console.log('📋 API test function available as window.testAPI()');
}

export { testAPI };
