/**
 * Lightning Fast PumpFun Token Creator - Configuration Manager
 * 
 * Professional configuration management with environment variable loading,
 * validation, and provider-specific configurations.
 */

import { Connection, Keypair } from '@solana/web3.js';
import { config } from 'dotenv';
import { 
  NetworkConfig, 
  ExecutorConfig, 
  JitoConfig, 
  BloxRouteConfig, 
  NozomiConfig,
  ConfigurationError,
  DEFAULT_JITO_TIP,
  DEFAULT_NOZOMI_TIP,
  DEFAULT_BLOXROUTE_FEE,
  DEFAULT_PRIORITY_FEE,
  DEFAULT_TIMEOUT,
  MAX_RETRY_ATTEMPTS
} from './types';
import { getLogger } from './logger';
import bs58 from 'bs58';

// Load environment variables
config();

export class ConfigManager {
  private static instance: ConfigManager;
  private logger = getLogger();
  
  // Public access to logger
  public getLogger() {
    return this.logger;
  }
  
  public readonly networkConfig: NetworkConfig;
  public readonly executorConfig: ExecutorConfig;
  public readonly jitoConfig: JitoConfig;
  public readonly bloxRouteConfig: BloxRouteConfig;
  public readonly nozomiConfig: NozomiConfig;
  public readonly wallet: Keypair;
  public readonly connection: Connection;

  private constructor() {
    this.logger.info('🔧 Initializing Configuration Manager...');
    
    try {
      // Validate required environment variables
      this.validateRequiredEnvVars();
      
      // Initialize configurations
      this.networkConfig = this.initializeNetworkConfig();
      this.executorConfig = this.initializeExecutorConfig();
      this.jitoConfig = this.initializeJitoConfig();
      this.bloxRouteConfig = this.initializeBloxRouteConfig();
      this.nozomiConfig = this.initializeNozomiConfig();
      
      // Initialize wallet and connection
      this.wallet = this.initializeWallet();
      this.connection = this.initializeConnection();
      
      this.logger.success('Configuration Manager initialized successfully');
      this.logConfiguration();
      
    } catch (error) {
      this.logger.failure('Failed to initialize Configuration Manager');
      throw error;
    }
  }

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  private validateRequiredEnvVars(): void {
    const requiredVars = ['PRIVATE_KEY'];
    const missingVars: string[] = [];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    });

    if (missingVars.length > 0) {
      throw new ConfigurationError(
        `Missing required environment variables: ${missingVars.join(', ')}`,
        'MISSING_ENV_VARS'
      );
    }
  }

  private initializeNetworkConfig(): NetworkConfig {
    const network = (process.env.NETWORK as 'devnet' | 'mainnet' | 'testnet') || 'devnet';
    
    return {
      network,
      rpcEndpoint: process.env.RPC_ENDPOINT || this.getDefaultRpcEndpoint(network),
      wsEndpoint: process.env.WS_ENDPOINT,
      commitment: (process.env.COMMITMENT as 'finalized' | 'confirmed' | 'processed') || 'confirmed'
    };
  }

  private initializeExecutorConfig(): ExecutorConfig {
    return {
      useJito: process.env.USE_JITO === 'true',
      useBloxRoute: process.env.USE_BLOXROUTE === 'true',
      useNozomi: process.env.USE_NOZOMI === 'true',
      jitoTipAmount: parseFloat(process.env.JITO_TIP_AMOUNT || String(DEFAULT_JITO_TIP)),
      bloxRouteFee: parseFloat(process.env.BLOXROUTE_FEE || String(DEFAULT_BLOXROUTE_FEE)),
      nozomiTipAmount: parseFloat(process.env.NOZOMI_TIP_AMOUNT || String(DEFAULT_NOZOMI_TIP)),
      maxRetries: parseInt(process.env.MAX_RETRY_ATTEMPTS || String(MAX_RETRY_ATTEMPTS)),
      timeout: parseInt(process.env.TRANSACTION_TIMEOUT || String(DEFAULT_TIMEOUT))
    };
  }

  private initializeJitoConfig(): JitoConfig {
    const network = this.networkConfig.network;
    
    return {
      endpoints: this.getJitoEndpoints(network),
      validators: this.getJitoValidators(),
      tipAmount: this.executorConfig.jitoTipAmount,
      timeout: this.executorConfig.timeout || DEFAULT_TIMEOUT
    };
  }

  private initializeBloxRouteConfig(): BloxRouteConfig {
    return {
      authHeader: process.env.BLOXROUTE_AUTH_HEADER || '',
      endpoint: process.env.BLOXROUTE_ENDPOINT || this.getDefaultBloxRouteEndpoint(),
      fee: this.executorConfig.bloxRouteFee,
      useStakedRPCs: process.env.BLOXROUTE_USE_STAKED_RPCS === 'true'
    };
  }

  private initializeNozomiConfig(): NozomiConfig {
    return {
      apiKey: process.env.NOZOMI_API_KEY || '',
      endpoint: process.env.NOZOMI_ENDPOINT || this.getDefaultNozomiEndpoint(),
      validators: this.getNozomiValidators(),
      tipAmount: this.executorConfig.nozomiTipAmount
    };
  }

  private initializeWallet(): Keypair {
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new ConfigurationError('PRIVATE_KEY environment variable is required', 'PRIVATE_KEY');
    }

    try {
      return Keypair.fromSecretKey(bs58.decode(privateKey));
    } catch (error) {
      throw new ConfigurationError(
        'Invalid PRIVATE_KEY format. Expected base58 encoded private key.',
        'PRIVATE_KEY'
      );
    }
  }

  private initializeConnection(): Connection {
    const options = {
      commitment: this.networkConfig.commitment,
      confirmTransactionInitialTimeout: 60000,
      wsEndpoint: this.networkConfig.wsEndpoint,
      httpHeaders: {
        'User-Agent': 'Lightning-PumpFun-Creator/1.0.0'
      }
    };

    return new Connection(this.networkConfig.rpcEndpoint, options);
  }

  // === Default Configuration Getters ===

  private getDefaultRpcEndpoint(network: string): string {
    switch (network) {
      case 'mainnet':
        return 'https://api.mainnet-beta.solana.com';
      case 'testnet':
        return 'https://api.testnet.solana.com';
      case 'devnet':
      default:
        return 'https://api.devnet.solana.com';
    }
  }

  private getDefaultBloxRouteEndpoint(): string {
    return this.networkConfig.network === 'mainnet'
      ? 'https://virginia.solana.dex.blxrbdn.com'
      : 'https://serum-nlb-7d4cfbdeba2f3d0e.elb.us-east-1.amazonaws.com';
  }

  private getDefaultNozomiEndpoint(): string {
    return 'https://ams1.secure.nozomi.temporal.xyz/?c=';
  }

  public getJitoEndpoints(network: string): string[] {
    if (network === 'devnet') {
      return ['https://devnet.block-engine.jito.wtf/api/v1/bundles'];
    }
    
    return [
      'https://mainnet.block-engine.jito.wtf/api/v1/bundles',
      'https://amsterdam.mainnet.block-engine.jito.wtf/api/v1/bundles',
      'https://ny.mainnet.block-engine.jito.wtf/api/v1/bundles',
      'https://tokyo.mainnet.block-engine.jito.wtf/api/v1/bundles'
    ];
  }

  private getJitoValidators(): string[] {
    return [
      'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
      'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
      '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
      'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe'
    ];
  }

  private getNozomiValidators(): string[] {
    return [
      'TEMPaMeCRFAS9EKF53Jd6KpHxgL47uWLcpFArU1Fanq',
      'noz3jAjPiHuBPqiSPkkugaJDkJscPuRhYnSpbi8UvC4',
      'noz3str9KXfpKknefHji8L1mPgimezaiUyCHYMDv1GE',
      'noz6uoYCDijhu1V7cutCpwxNiSovEwLdRHPwmgCGDNo'
    ];
  }

  // === Validation Methods ===

  public async testConnection(): Promise<boolean> {
    try {
      this.logger.info('🔗 Testing network connection...');
      const version = await this.connection.getVersion();
      this.logger.success(`Connected to Solana ${this.networkConfig.network} (v${version['solana-core']})`);
      return true;
    } catch (error) {
      this.logger.failure(`Network connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return false;
    }
  }

  public async getWalletBalance(): Promise<number> {
    try {
      const balance = await this.connection.getBalance(this.wallet.publicKey);
      return balance / 1e9; // Convert lamports to SOL
    } catch (error) {
      this.logger.error(`Failed to get wallet balance: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return 0;
    }
  }

  public async getCurrentBlockHeight(): Promise<number | null> {
    try {
      return await this.connection.getBlockHeight();
    } catch (error) {
      this.logger.error(`Failed to get block height: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return null;
    }
  }

  /**
   * Validate current configuration
   */
  public validateConfiguration(): boolean {
    try {
      // Check wallet
      if (!this.wallet) {
        this.logger.error('Wallet not initialized');
        return false;
      }

      // Check connection
      if (!this.connection) {
        this.logger.error('Connection not initialized');
        return false;
      }

      // Check network config
      if (!this.networkConfig.rpcEndpoint) {
        this.logger.error('RPC URL not configured');
        return false;
      }

      this.logger.info('Configuration validation passed');
      return true;
    } catch (error) {
      this.logger.error('Configuration validation failed:', error);
      return false;
    }
  }

  // === Provider Availability Checks ===

  public isJitoEnabled(): boolean {
    return this.executorConfig.useJito && this.jitoConfig.tipAmount > 0;
  }

  public isBloxRouteEnabled(): boolean {
    return this.executorConfig.useBloxRoute && 
           this.bloxRouteConfig.authHeader !== '' && 
           this.bloxRouteConfig.fee > 0;
  }

  public isNozomiEnabled(): boolean {
    return this.executorConfig.useNozomi && 
           this.nozomiConfig.apiKey !== '' && 
           this.nozomiConfig.tipAmount > 0;
  }

  public getEnabledProviders(): string[] {
    const providers: string[] = [];
    if (this.isJitoEnabled()) providers.push('Jito');
    if (this.isBloxRouteEnabled()) providers.push('BloxRoute');
    if (this.isNozomiEnabled()) providers.push('Nozomi');
    return providers;
  }

  // === Configuration Logging ===

  private logConfiguration(): void {
    this.logger.section('⚙️ Configuration Summary');
    
    this.logger.info(`Network: ${this.networkConfig.network}`);
    this.logger.info(`RPC Endpoint: ${this.networkConfig.rpcEndpoint}`);
    this.logger.info(`Wallet Address: ${this.wallet.publicKey.toBase58()}`);
    
    const enabledProviders = this.getEnabledProviders();
    this.logger.info(`Enabled Providers: ${enabledProviders.length > 0 ? enabledProviders.join(', ') : 'None'}`);
    
    if (this.isJitoEnabled()) {
      this.logger.info(`Jito Tip Amount: ${this.jitoConfig.tipAmount} SOL`);
    }
    
    if (this.isBloxRouteEnabled()) {
      this.logger.info(`BloxRoute Fee: ${this.bloxRouteConfig.fee} SOL`);
    }
    
    if (this.isNozomiEnabled()) {
      this.logger.info(`Nozomi Tip Amount: ${this.nozomiConfig.tipAmount} SOL`);
    }
    
    this.logger.info(`Max Retries: ${this.executorConfig.maxRetries}`);
    this.logger.info(`Transaction Timeout: ${this.executorConfig.timeout}ms`);
  }

  // === Cost Estimation ===

  public estimateTransactionCost(): {
    baseFee: number;
    priorityFee: number;
    jitoTip: number;
    bloxRouteFee: number;
    nozomiTip: number;
    total: number;
  } {
    const baseFee = 0.000005; // 5000 lamports
    const priorityFee = DEFAULT_PRIORITY_FEE;
    
    let jitoTip = 0;
    let bloxRouteFee = 0;
    let nozomiTip = 0;
    
    if (this.isJitoEnabled()) jitoTip = this.jitoConfig.tipAmount;
    if (this.isBloxRouteEnabled()) bloxRouteFee = this.bloxRouteConfig.fee;
    if (this.isNozomiEnabled()) nozomiTip = this.nozomiConfig.tipAmount;
    
    const total = baseFee + priorityFee + jitoTip + bloxRouteFee + nozomiTip;
    
    return {
      baseFee,
      priorityFee,
      jitoTip,
      bloxRouteFee,
      nozomiTip,
      total
    };
  }

  // === Environment Info ===

  public getEnvironmentInfo(): Record<string, any> {
    return {
      network: this.networkConfig.network,
      nodeVersion: process.version,
      platform: process.platform,
      enabledProviders: this.getEnabledProviders(),
      walletAddress: this.wallet.publicKey.toBase58(),
      rpcEndpoint: this.networkConfig.rpcEndpoint,
      commitment: this.networkConfig.commitment,
      maxRetries: this.executorConfig.maxRetries,
      timeout: this.executorConfig.timeout
    };
  }
}

export default ConfigManager;
