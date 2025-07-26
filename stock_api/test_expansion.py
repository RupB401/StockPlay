#!/usr/bin/env python3
"""
Test Auto Stock Expansion
This script demonstrates how the auto-expansion system works by temporarily lowering the threshold
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from auto_stock_expander import AutoStockExpander

def test_expansion():
    """Test the expansion system with a lower threshold"""
    print("🧪 Testing Auto Stock Database Expansion System")
    print("=" * 50)
    
    expander = AutoStockExpander()
    
    # Show current status
    current_count = expander.get_current_stock_count()
    print(f"📊 Current stock count: {current_count}")
    print(f"📝 Minimum threshold: {expander.min_stock_count}")
    print(f"🎯 Target stock count: {expander.target_stock_count}")
    
    if current_count >= expander.min_stock_count:
        print("\n💡 Database has sufficient stocks - temporarily lowering threshold for demo")
        # Temporarily raise the minimum to trigger expansion
        expander.min_stock_count = current_count + 20
        print(f"🔧 Demo threshold set to: {expander.min_stock_count}")
    
    print("\n🔄 Running expansion check...")
    result = expander.auto_expand_if_needed()
    
    if result:
        print("✅ Expansion completed!")
        final_count = expander.get_current_stock_count()
        print(f"📈 New stock count: {final_count}")
        print(f"📊 Added: {final_count - current_count} stocks")
    else:
        print("ℹ️ No expansion needed")
    
    print("\n" + "=" * 50)
    print("🎉 Test completed!")

if __name__ == "__main__":
    test_expansion()
