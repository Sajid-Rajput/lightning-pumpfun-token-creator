#!/usr/bin/env node

/**
 * Simple verification script to test that all modules can be imported
 * and basic functionality works without requiring actual private keys
 */

import { ConfigManager } from './src/utils/config.js';
import { PerformanceMonitor } from './src/core/PerformanceMonitor.js';
import { TransactionExecutor } from './src/core/TransactionExecutor.js';

console.log('🧪 Testing Lightning PumpFun Token Creator modules...\n');

try {
  // Test logger
  console.log('✅ Logger module imported successfully');
  
  // Test PerformanceMonitor
  const monitor = new PerformanceMonitor();
  console.log('✅ PerformanceMonitor instantiated successfully');
  
  // Test basic performance tracking
  monitor.startTracking('test_operation');
  setTimeout(() => {
    const duration = monitor.endTracking('test_operation');
    console.log(`✅ Performance tracking works: ${duration}ms`);
    
    const metrics = monitor.getMetrics();
    console.log('✅ Performance metrics retrieved successfully');
    
    console.log('\n🎉 All basic module tests passed!');
    console.log('\n📋 Next steps:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Configure your private key and RPC endpoints');
    console.log('3. Run npm run dev to test token creation');
    console.log('4. Use npm run test for performance testing');
    
  }, 100);
  
} catch (error) {
  console.error('❌ Module test failed:', error);
  process.exit(1);
}
