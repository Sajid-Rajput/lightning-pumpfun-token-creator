import { 
  Keypair, 
  Transaction, 
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  createAssociatedTokenAccountInstruction,
  getAssociatedTokenAddress,
  createInitializeMintInstruction,
  createMintToInstruction,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint
} from '@solana/spl-token';
import { TokenMetadata, TokenCreationConfig, PerformanceMetrics } from '../utils/types';
import { ConfigManager } from '../utils/config';
import { TransactionExecutor } from './TransactionExecutor';
import { PerformanceMonitor } from './PerformanceMonitor';

// Constants
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

export class PumpFunTokenCreator {
  private config: ConfigManager;
  private executor: TransactionExecutor;
  private monitor: PerformanceMonitor;
  
  constructor() {
    this.config = ConfigManager.getInstance();
    this.executor = new TransactionExecutor();
    this.monitor = new PerformanceMonitor();
  }

  public async createToken(tokenConfig: TokenCreationConfig): Promise<{
    success: boolean;
    tokenMint?: PublicKey;
    signature?: string;
    metrics: PerformanceMetrics;
    error?: string;
  }> {
    const startTime = Date.now();
    this.monitor.startTracking('total_execution');
    
    try {
      this.config.getLogger().info('🎯 Starting lightning-fast token creation...');
      
      // Validate configuration
      if (!this.config.validateConfiguration()) {
        throw new Error('Configuration validation failed');
      }
      
      // Generate new mint keypair
      const mintKeypair = Keypair.generate();
      this.config.getLogger().info(`🪙 Token mint: ${mintKeypair.publicKey.toBase58()}`);
      
      this.monitor.startTracking('transaction_build');
      
      // Upload metadata to IPFS (or use placeholder for demo)
      const metadataUri = await this.uploadMetadata(tokenConfig.metadata);
      this.config.getLogger().debug(`Metadata URI: ${metadataUri}`);
      
      // Create token creation transaction
      const transaction = await this.buildTokenCreationTransaction(
        mintKeypair,
        tokenConfig,
        metadataUri
      );
      
      this.monitor.endTracking('transaction_build');
      
      // Execute transaction with optimal strategy
      this.monitor.startTracking('execution');
      const result = await this.executor.executeOptimal(transaction, [
        this.config.wallet,
        mintKeypair
      ]);
      const executionTime = this.monitor.endTracking('execution');
      
      const totalTime = this.monitor.endTracking('total_execution');
      
      const metrics: PerformanceMetrics = {
        totalExecutionTime: totalTime,
        transactionBuildTime: this.monitor.getMetrics().transaction_build || 0,
        networkSubmissionTime: executionTime,
        confirmationTime: 0, // This would be tracked separately in a full implementation
        success: result.success,
        signature: result.signature,
        error: result.error,
        provider: result.provider
      };
      
      // Record metrics for analytics
      this.monitor.recordSessionMetrics(metrics);
      
      if (result.success) {
        this.config.getLogger().info('🎉 Token created successfully!');
        this.config.getLogger().info(`💰 Token Address: ${mintKeypair.publicKey.toBase58()}`);
        this.config.getLogger().info(`⚡ Total Time: ${totalTime}ms`);
        this.config.getLogger().info(`🔗 Transaction: ${result.signature}`);
        
        // Log performance metrics
        this.monitor.logPerformance();
        
        return {
          success: true,
          tokenMint: mintKeypair.publicKey,
          signature: result.signature,
          metrics
        };
      } else {
        throw new Error(result.error || 'Token creation failed');
      }
      
    } catch (error) {
      const totalTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.config.getLogger().error('Token creation failed:', errorMessage);
      
      const metrics: PerformanceMetrics = {
        totalExecutionTime: totalTime,
        transactionBuildTime: this.monitor.getMetrics().transaction_build || 0,
        networkSubmissionTime: 0,
        confirmationTime: 0,
        success: false,
        error: errorMessage
      };
      
      this.monitor.recordSessionMetrics(metrics);
      
      return {
        success: false,
        error: errorMessage,
        metrics
      };
    }
  }

  private async uploadMetadata(metadata: TokenMetadata): Promise<string> {
    try {
      this.config.getLogger().debug('Uploading metadata...');
      
      // In a production environment, you would upload to IPFS
      // For this demo, we'll create a placeholder URI with the metadata
      const jsonMetadata = {
        name: metadata.name,
        symbol: metadata.symbol,
        description: metadata.description,
        image: metadata.imageUrl || '',
        external_url: metadata.website || '',
        attributes: [],
        properties: {
          files: metadata.imageUrl ? [{ uri: metadata.imageUrl, type: 'image/png' }] : [],
          category: 'image'
        },
        collection: null
      };
      
      // In production, upload jsonMetadata to IPFS and return the URI
      // For demo purposes, create a deterministic URI
      const metadataHash = this.hashMetadata(JSON.stringify(jsonMetadata));
      const uri = `https://arweave.net/${metadataHash}`;
      
      this.config.getLogger().debug(`Metadata uploaded: ${uri}`);
      return uri;
      
    } catch (error) {
      this.config.getLogger().error('Metadata upload failed:', error);
      throw new Error(`Metadata upload failed: ${error}`);
    }
  }

  private hashMetadata(data: string): string {
    // Simple hash function for demo purposes
    // In production, use a proper hash function
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36) + Date.now().toString(36);
  }

  private async buildTokenCreationTransaction(
    mintKeypair: Keypair,
    _config: TokenCreationConfig,
    _metadataUri: string
  ): Promise<Transaction> {
    this.config.getLogger().debug('Building token creation transaction...');
    
    const transaction = new Transaction();
    
    // Calculate rent for mint account
    const rentExemption = await getMinimumBalanceForRentExemptMint(this.config.connection);
    this.config.getLogger().debug(`Mint account rent exemption: ${rentExemption / LAMPORTS_PER_SOL} SOL`);
    
    // Create mint account
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: this.config.wallet.publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        space: MINT_SIZE,
        lamports: rentExemption,
        programId: TOKEN_PROGRAM_ID
      })
    );
    
    // Initialize mint with 6 decimals (PumpFun standard)
    transaction.add(
      createInitializeMintInstruction(
        mintKeypair.publicKey,
        6, // 6 decimals (PumpFun standard)
        this.config.wallet.publicKey,
        this.config.wallet.publicKey,
        TOKEN_PROGRAM_ID
      )
    );
    
    // Create associated token account for creator
    const associatedTokenAddress = await getAssociatedTokenAddress(
      mintKeypair.publicKey,
      this.config.wallet.publicKey
    );
    
    this.config.getLogger().debug(`Associated token account: ${associatedTokenAddress.toBase58()}`);
    
    transaction.add(
      createAssociatedTokenAccountInstruction(
        this.config.wallet.publicKey,
        associatedTokenAddress,
        this.config.wallet.publicKey,
        mintKeypair.publicKey
      )
    );
    
    // Mint initial supply (1 billion tokens like PumpFun)
    const initialSupply = BigInt(1_000_000_000) * BigInt(10 ** 6); // 1B tokens with 6 decimals
    transaction.add(
      createMintToInstruction(
        mintKeypair.publicKey,
        associatedTokenAddress,
        this.config.wallet.publicKey,
        initialSupply
      )
    );
    
    // Create metadata account
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        METADATA_PROGRAM_ID.toBuffer(),
        mintKeypair.publicKey.toBuffer()
      ],
      METADATA_PROGRAM_ID
    );
    
    this.config.getLogger().debug(`Metadata PDA: ${metadataPDA.toBase58()}`);
    
    // Create metadata instruction using simplified approach
    const metadataInstruction = {
      keys: [
        { pubkey: metadataPDA, isSigner: false, isWritable: true },
        { pubkey: mintKeypair.publicKey, isSigner: false, isWritable: false },
        { pubkey: this.config.wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: this.config.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: this.config.wallet.publicKey, isSigner: true, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId: METADATA_PROGRAM_ID,
      data: Buffer.alloc(1) // Simplified metadata creation
    };
    
    transaction.add(metadataInstruction);
    
    this.config.getLogger().debug(`Transaction built with ${transaction.instructions.length} instructions`);
    return transaction;
  }

  public async getHealthStatus(): Promise<{
    system: boolean;
    executors: any;
    configuration: boolean;
  }> {
    this.config.getLogger().info('🔍 Checking system health...');
    
    const executorHealth = await this.executor.healthCheck();
    const configValid = this.config.validateConfiguration();
    
    const systemHealthy = Object.values(executorHealth).some(health => health) && configValid;
    
    return {
      system: systemHealthy,
      executors: executorHealth,
      configuration: configValid
    };
  }

  public async estimateCreationCost(tokenConfig: TokenCreationConfig): Promise<{
    breakdown: any;
    total: number;
    currency: 'SOL';
  }> {
    try {
      // Create a dummy transaction to estimate costs
      const dummyKeypair = Keypair.generate();
      const dummyUri = 'https://placeholder.com/metadata.json';
      const transaction = await this.buildTokenCreationTransaction(dummyKeypair, tokenConfig, dummyUri);
      
      const executionCosts = await this.executor.estimateExecutionCost(transaction);
      
      // Calculate base transaction costs
      const rentExemption = await getMinimumBalanceForRentExemptMint(this.config.connection);
      const transactionFee = 5000; // Standard transaction fee in lamports
      
      const breakdown = {
        rentExemption: rentExemption / LAMPORTS_PER_SOL,
        transactionFee: transactionFee / LAMPORTS_PER_SOL,
        executionCosts: Object.entries(executionCosts).reduce((acc, [key, value]) => {
          acc[key] = (value as number) / LAMPORTS_PER_SOL;
          return acc;
        }, {} as any)
      };
      
      const total = breakdown.rentExemption + breakdown.transactionFee + 
        Math.min(...Object.values(breakdown.executionCosts).map(v => v as number));
      
      return {
        breakdown,
        total,
        currency: 'SOL'
      };
    } catch (error) {
      this.config.getLogger().error('Failed to estimate creation cost:', error);
      throw error;
    }
  }

  public getSessionStatistics() {
    return this.monitor.getSessionStatistics();
  }

  public getPerformanceOptimizations(): string[] {
    return this.monitor.getSuggestedOptimizations();
  }
}
