import { 
  Transaction, 
  VersionedTransaction, 
  TransactionMessage,
  SystemProgram,
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { ConfigManager } from '../utils/config';
import { ExecutionResult } from '../utils/types';
import axios, { AxiosResponse } from 'axios';
import bs58 from 'bs58';

export class JitoExecutor {
  private config: ConfigManager;
  private jitoValidators: string[] = [
    'DfXygSm4jCyNCybVYYK6DwvWqjKee8pbDmJGcLWNDXjh',
    'ADuUkR4vqLUMWXxW9gh6D6L8pMSawimctcNZ5pGwDcEt',
    '3AVi9Tg9Uo68tJfuvoKvqKNWKkC5wPdSSdeBnizKZ6jT',
    'HFqU5x63VTqvQss8hp11i4wVV8bD44PvwucfZ2bU7gRe'
  ];

  constructor() {
    this.config = ConfigManager.getInstance();
  }

  private getRandomValidator(): PublicKey {
    const randomIndex = Math.floor(Math.random() * this.jitoValidators.length);
    return new PublicKey(this.jitoValidators[randomIndex]);
  }

  private async createTipTransaction(
    validator: PublicKey,
    tipAmount: number,
    blockhash: string
  ): Promise<VersionedTransaction> {
    const tipTransaction = new VersionedTransaction(
      new TransactionMessage({
        payerKey: this.config.wallet.publicKey,
        recentBlockhash: blockhash,
        instructions: [
          SystemProgram.transfer({
            fromPubkey: this.config.wallet.publicKey,
            toPubkey: validator,
            lamports: tipAmount
          })
        ]
      }).compileToV0Message()
    );
    
    tipTransaction.sign([this.config.wallet]);
    return tipTransaction;
  }

  public async executeTransaction(
    transaction: Transaction,
    signers: Keypair[]
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.config.getLogger().info('🔥 Executing transaction via Jito bundles...');
      
      const tipValidator = this.getRandomValidator();
      const tipAmount = this.config.executorConfig.jitoTipAmount * LAMPORTS_PER_SOL;
      
      this.config.getLogger().debug(`Using Jito validator: ${tipValidator.toBase58()}`);
      this.config.getLogger().debug(`Tip amount: ${tipAmount / LAMPORTS_PER_SOL} SOL`);
      
      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await this.config.connection.getLatestBlockhash();
      
      // Create tip transaction
      const tipTransaction = await this.createTipTransaction(tipValidator, tipAmount, blockhash);
      
      // Prepare main transaction
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.config.wallet.publicKey;
      transaction.sign(...signers);
      
      // Serialize transactions
      const serializedTipTx = bs58.encode(tipTransaction.serialize());
      const serializedMainTx = bs58.encode(transaction.serialize());
      
      // Create bundle with tip first, then main transaction
      const bundle = [serializedTipTx, serializedMainTx];
      
      // Send to multiple Jito endpoints for better reliability
      const endpoints = this.config.getJitoEndpoints(this.config.networkConfig.network);
      const bundleResults = await this.submitToJitoEndpoints(bundle, endpoints);
      
      if (bundleResults.success) {
        // Wait for confirmation using the main transaction signature
        const mainTxSignature = bs58.encode(transaction.signature!);
        
        this.config.getLogger().info('⏳ Waiting for transaction confirmation...');
        const confirmation = await this.config.connection.confirmTransaction({
          signature: mainTxSignature,
          blockhash,
          lastValidBlockHeight
        }, 'confirmed');
        
        const executionTime = Date.now() - startTime;
        
        if (confirmation.value.err) {
          this.config.getLogger().error('Transaction failed:', confirmation.value.err);
          return {
            success: false,
            error: `Transaction failed: ${confirmation.value.err}`,
            executionTime,
            provider: 'jito'
          };
        }
        
        this.config.getLogger().transaction(`Jito execution successful: ${mainTxSignature}`, mainTxSignature);
        return {
          success: true,
          signature: mainTxSignature,
          executionTime,
          provider: 'jito'
        };
      }
      
      return {
        success: false,
        error: bundleResults.error || 'No Jito validators accepted the bundle',
        executionTime: Date.now() - startTime,
        provider: 'jito'
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.config.getLogger().error('Jito execution failed:', errorMessage);
      return {
        success: false,
        error: `Jito execution failed: ${errorMessage}`,
        executionTime,
        provider: 'jito'
      };
    }
  }

  private async submitToJitoEndpoints(
    bundle: string[],
    endpoints: string[]
  ): Promise<{ success: boolean; error?: string }> {
    this.config.getLogger().debug(`Submitting bundle to ${endpoints.length} Jito endpoints`);
    
    const requests = endpoints.map(endpoint =>
      axios.post(endpoint, {
        jsonrpc: '2.0',
        id: 1,
        method: 'sendBundle',
        params: [bundle]
      }, {
        timeout: this.config.executorConfig.transactionTimeout,
        headers: {
          'Content-Type': 'application/json'
        }
      }).catch(error => {
        this.config.getLogger().warn(`Jito endpoint ${endpoint} failed:`, error.message);
        return error;
      })
    );
    
    try {
      const responses = await Promise.allSettled(requests);
      const successfulResponses = responses.filter(
        (result): result is PromiseFulfilledResult<AxiosResponse> => 
          result.status === 'fulfilled' && 
          !(result.value instanceof Error) &&
          result.value.status === 200
      );
      
      if (successfulResponses.length > 0) {
        this.config.getLogger().info(`✅ Bundle accepted by ${successfulResponses.length}/${endpoints.length} Jito endpoints`);
        return { success: true };
      }
      
      // Log all failures for debugging
      const errors = responses
        .filter(result => result.status === 'rejected' || result.value instanceof Error)
        .map(result => result.status === 'rejected' ? result.reason : (result.value as Error).message);
      
      this.config.getLogger().warn('All Jito endpoints failed:', errors);
      return { 
        success: false, 
        error: `All Jito endpoints failed. Errors: ${errors.join(', ')}` 
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.config.getLogger().error('Failed to submit to Jito endpoints:', errorMessage);
      return { 
        success: false, 
        error: `Failed to submit to Jito: ${errorMessage}` 
      };
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const endpoints = this.config.getJitoEndpoints(this.config.networkConfig.network);
      const healthChecks = endpoints.map(endpoint =>
        axios.post(endpoint, {
          jsonrpc: '2.0',
          id: 1,
          method: 'getInflightBundleStatuses',
          params: [[]] // Empty array to just test connectivity
        }, { timeout: 5000 }).catch(() => false)
      );
      
      const results = await Promise.allSettled(healthChecks);
      const healthyEndpoints = results.filter(r => r.status === 'fulfilled' && r.value !== false).length;
      
      this.config.getLogger().info(`Jito health check: ${healthyEndpoints}/${endpoints.length} endpoints healthy`);
      return healthyEndpoints > 0;
    } catch (error) {
      this.config.getLogger().error('Jito health check failed:', error);
      return false;
    }
  }

  public getOptimalTipAmount(): number {
    // Dynamic tip calculation based on network conditions
    // This is a simplified version - in production, you might want to query
    // recent successful bundles to determine optimal tip amounts
    const baseTip = this.config.executorConfig.jitoTipAmount;
    const networkMultiplier = this.config.networkConfig.network === 'mainnet' ? 1.5 : 1.0;
    
    return baseTip * networkMultiplier;
  }
}
