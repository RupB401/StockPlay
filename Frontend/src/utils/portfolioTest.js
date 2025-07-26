/**
 * Portfolio Test Script
 * Run this in the browser console to test the portfolio fixes
 */

async function testPortfolioFix() {
  console.log('🔧 Testing Portfolio Fix...');
  
  // Check if user is logged in
  const token = localStorage.getItem('access_token');
  if (!token) {
    console.log('❌ Please login first to test the portfolio');
    return;
  }
  
  console.log('✅ Access token found, testing portfolio endpoint...');
  
  try {
    // Test the new portfolio endpoint
    const response = await fetch('http://localhost:8000/trading/portfolio', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 Portfolio response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Portfolio loaded successfully:', data);
      
      if (data.warning) {
        console.log('⚠️ Portfolio warning:', data.warning);
      }
      
      return data;
    } else {
      const errorText = await response.text();
      console.log('❌ Portfolio failed:', response.status, errorText);
      
      // Test if our fallback logic works
      if (response.status === 500) {
        console.log('🔄 Testing fallback data handling...');
        return {
          success: true,
          data: {
            wallet_balance: 0,
            total_portfolio_value: 0,
            total_invested: 0,
            total_gain_loss: 0,
            total_gain_loss_percent: 0,
            number_of_holdings: 0,
            diversification_score: 0,
            holdings: []
          }
        };
      }
    }
  } catch (error) {
    console.error('❌ Portfolio test error:', error);
  }
}

// Test wallet endpoint too
async function testWalletFix() {
  console.log('💰 Testing Wallet Fix...');
  
  const token = localStorage.getItem('access_token');
  if (!token) {
    console.log('❌ Please login first to test the wallet');
    return;
  }
  
  try {
    const response = await fetch('http://localhost:8000/trading/wallet', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('💰 Wallet response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Wallet loaded successfully:', data);
      
      if (data.warning) {
        console.log('⚠️ Wallet warning:', data.warning);
      }
      
      return data;
    } else {
      const errorText = await response.text();
      console.log('❌ Wallet failed:', response.status, errorText);
    }
  } catch (error) {
    console.error('❌ Wallet test error:', error);
  }
}

// Test wallet component directly
async function testWalletComponent() {
  console.log('🔧 Testing Wallet Component Behavior...');
  
  // Check if wallet icon is visible
  const walletButton = document.querySelector('[title="QuantZ Wallet"]');
  if (walletButton) {
    console.log('✅ Wallet button found in DOM');
    
    // Check current state
    const spinner = walletButton.querySelector('.loading-spinner');
    const errorIcon = walletButton.querySelector('.text-red-500');
    const successDot = walletButton.querySelector('.bg-green-400, .bg-green-500');
    
    console.log('🔍 Current wallet button state:');
    console.log('  - Loading spinner:', !!spinner);
    console.log('  - Error icon:', !!errorIcon);
    console.log('  - Success indicator:', !!successDot);
    
    // Test click functionality
    console.log('🖱️ Testing wallet button click...');
    walletButton.click();
    
    setTimeout(() => {
      const dropdown = document.querySelector('.absolute.right-0.top-full');
      console.log('  - Dropdown opened:', !!dropdown);
      
      if (dropdown) {
        console.log('✅ Wallet dropdown is working!');
        // Close it
        walletButton.click();
      } else {
        console.log('❌ Wallet dropdown did not open');
      }
    }, 100);
    
  } else {
    console.log('❌ Wallet button not found in DOM');
  }
}

// Run comprehensive test
async function runComprehensiveTest() {
  console.log('🚀 Running Comprehensive Portfolio & Wallet Test...');
  console.log('='.repeat(50));
  
  await testWalletFix();
  console.log('-'.repeat(30));
  await testPortfolioFix();
  
  console.log('='.repeat(50));
  console.log('✅ Test completed! Check the portfolio page now.');
}

// Export functions for console use
window.testPortfolioFix = testPortfolioFix;
window.testWalletFix = testWalletFix;
window.testWalletComponent = testWalletComponent;
window.runComprehensiveTest = runComprehensiveTest;

console.log('📋 Portfolio test functions loaded!');
console.log('Run: window.runComprehensiveTest() to test both portfolio and wallet');
console.log('Or run: window.testPortfolioFix() to test just portfolio');
console.log('Or run: window.testWalletFix() to test just wallet');
console.log('Or run: window.testWalletComponent() to test wallet UI behavior');

export { testPortfolioFix, testWalletFix, testWalletComponent, runComprehensiveTest };
