import { PumpFunTokenCreator } from '../core/PumpFunTokenCreator';
import { TokenCreationConfig } from '../utils/types';
import { ConfigManager } from '../utils/config';

async function performanceTest() {
  try {
    // Initialize configuration
    const config = ConfigManager.getInstance();
    
    console.log('🔬 Starting Performance Test Suite');
    console.log('===================================');
    
    // Test connection
    const connectionTest = await config.testConnection();
    if (!connectionTest) {
      console.error('❌ Failed to connect to Solana network');
      return;
    }
    
    const creator = new PumpFunTokenCreator();
    const iterations = 5;
    const results: Array<{
      success: boolean;
      time: number;
      provider?: string;
      error?: string;
    }> = [];
    
    console.log(`🧪 Running ${iterations} test iterations...\n`);
    
    for (let i = 0; i < iterations; i++) {
      const tokenConfig: TokenCreationConfig = {
        metadata: {
          name: `Test Token ${i + 1}`,
          symbol: `TEST${i + 1}`,
          description: `Performance test token #${i + 1} created with Lightning PumpFun Creator`,
          imageUrl: "https://via.placeholder.com/200x200.png",
          website: `https://test-token-${i + 1}.example.com`,
          twitter: `https://twitter.com/testtoken${i + 1}`
        },
        initialBuyAmount: 0.05, // Smaller amount for testing
        slippageBasisPoints: 500,
        priorityFee: 0.001
      };
      
      console.log(`🧪 Test ${i + 1}/${iterations}: Creating ${tokenConfig.metadata.name}...`);
      
      const startTime = Date.now();
      const result = await creator.createToken(tokenConfig);
      const endTime = Date.now();
      const executionTime = endTime - startTime;
      
      if (result.success) {
        console.log(`✅ Success in ${executionTime}ms via ${result.metrics.provider}`);
        console.log(`   Token: ${result.tokenMint?.toBase58()}`);
        console.log(`   Tx: ${result.signature}`);
        
        results.push({
          success: true,
          time: executionTime,
          provider: result.metrics.provider
        });
      } else {
        console.log(`❌ Failed in ${executionTime}ms: ${result.error}`);
        
        results.push({
          success: false,
          time: executionTime,
          error: result.error
        });
      }
      
      // Wait between tests to avoid rate limiting
      if (i < iterations - 1) {
        console.log('⏳ Waiting 3 seconds before next test...\n');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
    
    // Calculate and display statistics
    console.log('\n📈 Performance Test Results');
    console.log('============================');
    
    const successfulResults = results.filter(r => r.success);
    const failedResults = results.filter(r => !r.success);
    
    console.log(`Total Tests: ${results.length}`);
    console.log(`Successful: ${successfulResults.length}`);
    console.log(`Failed: ${failedResults.length}`);
    console.log(`Success Rate: ${((successfulResults.length / results.length) * 100).toFixed(2)}%`);
    
    if (successfulResults.length > 0) {
      const times = successfulResults.map(r => r.time);
      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const minTime = Math.min(...times);
      const maxTime = Math.max(...times);
      
      console.log('\n⏱️ Timing Statistics (Successful Tests):');
      console.log(`Average Time: ${avgTime.toFixed(2)}ms`);
      console.log(`Min Time: ${minTime}ms`);
      console.log(`Max Time: ${maxTime}ms`);
      
      // Provider distribution
      const providerStats = successfulResults.reduce((acc, result) => {
        const provider = result.provider || 'unknown';
        acc[provider] = (acc[provider] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log('\n📊 Provider Distribution:');
      Object.entries(providerStats).forEach(([provider, count]) => {
        const percentage = ((count / successfulResults.length) * 100).toFixed(1);
        console.log(`  ${provider}: ${count} tests (${percentage}%)`);
      });
    }
    
    if (failedResults.length > 0) {
      console.log('\n❌ Failed Test Analysis:');
      const errorStats = failedResults.reduce((acc, result) => {
        const error = result.error || 'unknown error';
        acc[error] = (acc[error] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      Object.entries(errorStats).forEach(([error, count]) => {
        console.log(`  "${error}": ${count} occurrences`);
      });
    }
    
    // Get overall session statistics
    const sessionStats = creator.getSessionStatistics();
    if (sessionStats.totalSessions > 0) {
      console.log('\n📊 Overall Session Statistics:');
      console.log(`Total Sessions: ${sessionStats.totalSessions}`);
      console.log(`Overall Success Rate: ${sessionStats.successRate.toFixed(2)}%`);
      console.log(`Overall Average Time: ${sessionStats.averageExecutionTime.toFixed(2)}ms`);
    }
    
    // Performance recommendations
    const optimizations = creator.getPerformanceOptimizations();
    if (optimizations.length > 0) {
      console.log('\n💡 Performance Recommendations:');
      optimizations.forEach((suggestion: string) => console.log(`  - ${suggestion}`));
    }
    
    // Performance rating
    const avgSuccessTime = successfulResults.length > 0 
      ? successfulResults.reduce((sum, r) => sum + r.time, 0) / successfulResults.length 
      : 0;
    const successRate = (successfulResults.length / results.length) * 100;
    
    console.log('\n🏆 Performance Rating:');
    if (successRate >= 90 && avgSuccessTime <= 1000) {
      console.log('🌟 EXCELLENT - Lightning fast and highly reliable!');
    } else if (successRate >= 80 && avgSuccessTime <= 2000) {
      console.log('⭐ GOOD - Fast and reliable performance');
    } else if (successRate >= 60 && avgSuccessTime <= 5000) {
      console.log('🔄 FAIR - Acceptable performance with room for improvement');
    } else {
      console.log('⚠️ NEEDS IMPROVEMENT - Consider optimizing configuration');
    }
    
  } catch (error) {
    console.error('❌ Performance test failed:', error);
  }
}

// Handle graceful shutdown
if (typeof process !== 'undefined') {
  process.on('SIGINT', () => {
    console.log('\n👋 Stopping performance test...');
    if (typeof process !== 'undefined') {
      process.exit(0);
    }
  });
}

// Run the test if this file is executed directly
if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
  performanceTest().catch(console.error);
}

export { performanceTest };
