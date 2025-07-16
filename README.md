# Lightning Fast PumpFun Token Creator

A professional, production-ready TypeScript project that leverages lightning-fast transaction execution capabilities of **Jito**, **BloxRoute**, and **Nozomi** for PumpFun token creation and launch. Designed to achieve **sub-1-second token creation** performance on both devnet and mainnet.

## 🚀 Features

- **⚡ Lightning Fast Performance**: Sub-1-second execution through parallel submission
- **🔧 Multi-Network Support**: Devnet and Mainnet configurations
- **🎯 Advanced Execution Strategies**: Hybrid, single provider, and fallback modes
- **🛡️ Enterprise-Grade Reliability**: Error handling, retry mechanisms, and monitoring
- **📊 Performance Analytics**: Detailed metrics and optimization suggestions

## 🏗️ Architecture

### Execution Strategies
- **Hybrid Strategy**: Parallel submission to all providers for maximum speed
- **Single Provider**: Use individual providers (Jito, BloxRoute, or Nozomi)
- **Fallback Strategy**: Automatic fallback to direct RPC if providers fail
- **Smart Routing**: Automatic strategy selection based on configuration

### Providers
- **Jito**: Bundle transactions with validator tips for atomic execution
- **BloxRoute**: High-performance RPC endpoints with staked validator connections
- **Nozomi**: Optimized transaction submission to current block leaders

## 🛠️ Installation

### Prerequisites
- Node.js >= 18.0.0
- npm or yarn
- A Solana wallet with sufficient SOL for testing

### Setup

1. **Clone and Install Dependencies**
```bash
git clone <repository-url>
cd lightning-pumpfun-token-creator
npm install
```

2. **Configure Environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Build the Project**
```bash
npm run build
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file with the following configuration:

```bash
# Network Configuration
NETWORK=devnet  # or mainnet
RPC_ENDPOINT=https://api.devnet.solana.com
WS_ENDPOINT=wss://api.devnet.solana.com

# Wallet Configuration (REQUIRED)
PRIVATE_KEY=your_base58_encoded_private_key_here

# Executor Configuration
USE_JITO=true
USE_BLOXROUTE=true
USE_NOZOMI=true

# Provider-Specific Configuration
JITO_TIP_AMOUNT=0.0001
BLOXROUTE_AUTH_HEADER=your_bloxroute_auth_header
BLOXROUTE_FEE=0.001
NOZOMI_API_KEY=your_nozomi_api_key
NOZOMI_TIP_AMOUNT=0.0001

# Performance Configuration
MAX_RETRY_ATTEMPTS=3
CONFIRMATION_TIMEOUT=30000
TRANSACTION_TIMEOUT=10000

# Logging Configuration
LOG_LEVEL=info
ENABLE_PERFORMANCE_LOGGING=true
```

### Required Credentials

1. **Wallet Private Key**: Base58 encoded Solana wallet private key
2. **BloxRoute Auth Header**: Get from [BloxRoute](https://bloxroute.com/)
3. **Nozomi API Key**: Get from [Nozomi](https://nozomi.dev/)

## 🚀 Usage

### Basic Token Creation

```bash
# Create a token with default configuration
npm run dev
```

### Performance Testing

```bash
# Run performance tests
npm run test
```

### Programmatic Usage

```typescript
import { PumpFunTokenCreator, TokenCreationConfig } from 'lightning-pumpfun-creator';

const creator = new PumpFunTokenCreator();

const tokenConfig: TokenCreationConfig = {
  metadata: {
    name: "My Lightning Token",
    symbol: "MLT",
    description: "A token created with lightning speed",
    website: "https://my-token.com",
    twitter: "https://twitter.com/mytoken"
  },
  initialBuyAmount: 0.1, // 0.1 SOL
  slippageBasisPoints: 500, // 5% slippage
  priorityFee: 0.001 // 0.001 SOL priority fee
};

const result = await creator.createToken(tokenConfig);

if (result.success) {
  console.log(`Token created: ${result.tokenMint?.toBase58()}`);
  console.log(`Transaction: ${result.signature}`);
  console.log(`Time: ${result.metrics.totalExecutionTime}ms`);
} else {
  console.error(`Failed: ${result.error}`);
}
```

## 📊 Performance Monitoring

The system includes comprehensive performance monitoring:

```typescript
// Get performance statistics
const stats = creator.getSessionStatistics();
console.log(`Success Rate: ${stats.successRate}%`);
console.log(`Average Time: ${stats.averageExecutionTime}ms`);

// Get optimization suggestions
const optimizations = creator.getPerformanceOptimizations();
optimizations.forEach(suggestion => console.log(suggestion));
```

## 🔍 Health Checks

Monitor system health across all providers:

```typescript
const health = await creator.getHealthStatus();
console.log('System Health:', health);
```

## 💰 Cost Estimation

Estimate token creation costs before execution:

```typescript
const estimate = await creator.estimateCreationCost(tokenConfig);
console.log(`Estimated Cost: ${estimate.total} SOL`);
console.log('Breakdown:', estimate.breakdown);
```

## 🛡️ Error Handling

The system includes comprehensive error handling:

- **Network failures**: Automatic retry with exponential backoff
- **Provider failures**: Automatic fallback to alternative providers
- **Configuration errors**: Detailed validation and error messages
- **Transaction failures**: Detailed error reporting with suggestions

## 📈 Performance Expectations

Based on optimal configuration:

- **Execution Time**: 300-800ms for token creation
- **Success Rate**: 95-98% under normal network conditions
- **Cost Efficiency**: Optimized tip amounts for each provider
- **Scalability**: Support for high-volume operations

## 🔧 Advanced Configuration

### Custom Execution Strategy

```typescript
import { TransactionExecutor, ExecutionStrategy } from 'lightning-pumpfun-creator';

const executor = new TransactionExecutor();

// Override strategy selection
const result = await executor.executeOptimal(transaction, signers);
```

### Provider-Specific Settings

```typescript
import { JitoExecutor, BloxRouteExecutor, NozomiExecutor } from 'lightning-pumpfun-creator';

// Use specific provider
const jitoExecutor = new JitoExecutor();
const result = await jitoExecutor.executeTransaction(transaction, signers);
```

## 🧪 Testing

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### Performance Tests
```bash
npm run test:performance
```

## 📝 Scripts

- `npm run build` - Build the TypeScript project
- `npm run start` - Run the built project
- `npm run dev` - Run basic token creation example
- `npm run test` - Run performance testing
- `npm run lint` - Lint the codebase
- `npm run format` - Format code with Prettier

## 🔒 Security

- **Private Key Management**: Never commit private keys to version control
- **Environment Variables**: Use `.env` files for sensitive configuration
- **Network Security**: All API calls use HTTPS/WSS
- **Input Validation**: Comprehensive validation of all inputs

## 🐛 Troubleshooting

### Common Issues

1. **"Cannot connect to Solana network"**
   - Check your RPC endpoint
   - Verify network connectivity
   - Try alternative RPC providers

2. **"Private key validation failed"**
   - Ensure private key is base58 encoded
   - Verify the wallet has sufficient SOL balance

3. **"All executors failed"**
   - Check provider API keys and credentials
   - Verify network configuration
   - Check provider status pages

### Debug Mode

Enable debug logging:
```bash
LOG_LEVEL=debug npm run dev
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Solana Labs](https://solana.com/) for the Solana blockchain
- [Jito Labs](https://jito.wtf/) for MEV infrastructure
- [BloxRoute](https://bloxroute.com/) for trading infrastructure
- [Nozomi](https://nozomi.dev/) for transaction optimization
- [PumpFun](https://pump.fun/) for the token launch platform

## 📞 Support

- Documentation: [docs.lightning-pumpfun.dev](https://docs.lightning-pumpfun.dev)
- Issues: [GitHub Issues](https://github.com/your-org/lightning-pumpfun-creator/issues)
- Discord: [Community Server](https://discord.gg/your-server)

---

**⚡ Built for lightning-fast token creation on Solana ⚡**
