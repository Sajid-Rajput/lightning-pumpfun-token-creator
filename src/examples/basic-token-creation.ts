import { PumpFunTokenCreator } from '../core/PumpFunTokenCreator';
import { TokenCreationConfig } from '../utils/types';
import { ConfigManager } from '../utils/config';

async function createBasicToken() {
  try {
    // Initialize configuration and test connection
    const config = ConfigManager.getInstance();
    
    console.log('🔧 Testing system configuration...');
    const connectionTest = await config.testConnection();
    if (!connectionTest) {
      console.error('❌ Failed to connect to Solana network');
      process.exit(1);
    }
    
    const creator = new PumpFunTokenCreator();
    
    // Check system health before proceeding
    const health = await creator.getHealthStatus();
    console.log('🏥 System Health Check:', health);
    
    if (!health.system) {
      console.warn('⚠️ System health check failed, but proceeding anyway...');
    }
    
    const tokenConfig: TokenCreationConfig = {
      metadata: {
        name: "Lightning Fast Token",
        symbol: "LFST",
        description: "A demonstration token created with lightning speed using Jito, BloxRoute, and Nozomi integration",
        imageUrl: "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
        website: "https://lightning-pumpfun.dev",
        twitter: "https://twitter.com/lightningfast",
        telegram: "https://t.me/lightningfast"
      },
      initialBuyAmount: 0.1, // 0.1 SOL
      slippageBasisPoints: 500, // 5% slippage
      priorityFee: 0.001 // 0.001 SOL priority fee
    };
    
    console.log('💰 Estimating creation cost...');
    try {
      const costEstimate = await creator.estimateCreationCost(tokenConfig);
      console.log('📊 Cost Breakdown:');
      console.log(`  Rent Exemption: ${costEstimate.breakdown.rentExemption} SOL`);
      console.log(`  Transaction Fee: ${costEstimate.breakdown.transactionFee} SOL`);
      console.log(`  Execution Costs:`, costEstimate.breakdown.executionCosts);
      console.log(`  Total Estimated Cost: ${costEstimate.total} SOL`);
    } catch (error) {
      console.warn('⚠️ Could not estimate cost:', error);
    }
    
    console.log('\n🚀 Creating token with lightning speed...');
    console.log('Token Configuration:');
    console.log(`  Name: ${tokenConfig.metadata.name}`);
    console.log(`  Symbol: ${tokenConfig.metadata.symbol}`);
    console.log(`  Description: ${tokenConfig.metadata.description}`);
    console.log(`  Initial Buy: ${tokenConfig.initialBuyAmount} SOL`);
    
    const startTime = Date.now();
    const result = await creator.createToken(tokenConfig);
    const totalTime = Date.now() - startTime;
    
    if (result.success) {
      console.log('\n🎉 Token created successfully!');
      console.log('=====================================');
      console.log(`💰 Token Address: ${result.tokenMint?.toBase58()}`);
      console.log(`🔗 Transaction: ${result.signature}`);
      console.log(`⚡ Total Time: ${totalTime}ms`);
      console.log(`🎯 Provider Used: ${result.metrics.provider}`);
      console.log(`📊 Performance Metrics:`);
      console.log(`  Build Time: ${result.metrics.transactionBuildTime}ms`);
      console.log(`  Execution Time: ${result.metrics.networkSubmissionTime}ms`);
      
      // Log session statistics
      const stats = creator.getSessionStatistics();
      if (stats.totalSessions > 0) {
        console.log('\n📈 Session Statistics:');
        console.log(`  Success Rate: ${stats.successRate.toFixed(2)}%`);
        console.log(`  Average Time: ${stats.averageExecutionTime.toFixed(2)}ms`);
      }
      
      // Get optimization suggestions
      const optimizations = creator.getPerformanceOptimizations();
      if (optimizations.length > 0) {
        console.log('\n💡 Optimization Suggestions:');
        optimizations.forEach((suggestion: string) => console.log(`  - ${suggestion}`));
      }
      
    } else {
      console.error('\n❌ Token creation failed!');
      console.error('=====================================');
      console.error(`Error: ${result.error}`);
      console.error(`Total Time: ${totalTime}ms`);
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the example
if (require.main === module) {
  createBasicToken().catch(console.error);
}

export { createBasicToken };
