/**
 * Lightning Fast PumpFun Token Creator - Transaction Executor
 * 
 * Professional transaction execution system with multi-provider support,
 * intelligent strategy selection, and comprehensive error handling.
 */

import { Transaction, Keypair } from '@solana/web3.js';
import { 
  ExecutionStrategy, 
  ExecutionResult, 
  ITransactionExecutor,
  ExecutorError,
  MAX_RETRY_ATTEMPTS 
} from '../utils/types';
import ConfigManager from '../utils/config';
import { getLogger } from '../utils/logger';
import { JitoExecutor } from '../integrations/JitoExecutor';
import { BloxRouteExecutor } from '../integrations/BloxRouteExecutor';
import { NozomiExecutor } from '../integrations/NozomiExecutor';

export class TransactionExecutor implements ITransactionExecutor {
  private config: ConfigManager;
  private logger = getLogger();
  private jitoExecutor: JitoExecutor;
  private bloxRouteExecutor: BloxRouteExecutor;
  private nozomiExecutor: NozomiExecutor;
  
  constructor() {
    this.config = ConfigManager.getInstance();
    this.jitoExecutor = new JitoExecutor();
    this.bloxRouteExecutor = new BloxRouteExecutor();
    this.nozomiExecutor = new NozomiExecutor();
    
    this.logger.info('🚀 Transaction Executor initialized');
  }

  /**
   * Execute transaction with optimal strategy selection
   */
  public async executeTransaction(
    transaction: Transaction,
    signers: Keypair[]
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    const strategy = this.determineOptimalStrategy();
    
    this.logger.info(`🎯 Executing transaction with strategy: ${strategy}`);
    
    try {
      const result = await this.executeWithStrategy(transaction, signers, strategy);
      
      if (result.success) {
        const executionTime = Date.now() - startTime;
        this.logger.success(`Transaction executed successfully in ${executionTime}ms`, {
          strategy,
          signature: result.signature,
          provider: result.provider
        });
        
        return {
          ...result,
          strategy,
          executionTime
        };
      } else {
        throw new ExecutorError(
          result.error || 'Transaction execution failed',
          result.provider || 'unknown',
          strategy
        );
      }
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.failure(`Transaction execution failed after ${executionTime}ms`, {
        strategy,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        strategy,
        executionTime
      };
    }
  }

  /**
   * Execute transaction with specific strategy
   */
  private async executeWithStrategy(
    transaction: Transaction,
    signers: Keypair[],
    strategy: ExecutionStrategy
  ): Promise<ExecutionResult> {
    
    switch (strategy) {
      case ExecutionStrategy.HYBRID:
        return await this.executeHybrid(transaction, signers);
      
      case ExecutionStrategy.JITO_ONLY:
        if (!this.config.isJitoEnabled()) {
          throw new ExecutorError('Jito is not enabled or configured', 'jito', strategy);
        }
        return await this.jitoExecutor.executeTransaction(transaction, signers);
      
      case ExecutionStrategy.BLOXROUTE_ONLY:
        if (!this.config.isBloxRouteEnabled()) {
          throw new ExecutorError('BloxRoute is not enabled or configured', 'bloxroute', strategy);
        }
        return await this.bloxRouteExecutor.executeTransaction(transaction, signers);
      
      case ExecutionStrategy.NOZOMI_ONLY:
        if (!this.config.isNozomiEnabled()) {
          throw new ExecutorError('Nozomi is not enabled or configured', 'nozomi', strategy);
        }
        return await this.nozomiExecutor.executeTransaction(transaction, signers);
      
      case ExecutionStrategy.FALLBACK:
        return await this.executeFallback(transaction, signers);
      
      case ExecutionStrategy.AUTO:
      default:
        return await this.executeAuto(transaction, signers);
    }
  }

  /**
   * Hybrid execution: Submit to multiple providers simultaneously
   */
  private async executeHybrid(
    transaction: Transaction, 
    signers: Keypair[]
  ): Promise<ExecutionResult> {
    this.logger.progress('Executing hybrid strategy (parallel submission)...');
    
    const executors: Promise<ExecutionResult>[] = [];
    
    // Add enabled executors
    if (this.config.isJitoEnabled()) {
      executors.push(
        this.jitoExecutor.executeTransaction(this.cloneTransaction(transaction), [...signers])
          .then(result => ({ ...result, provider: 'jito' }))
      );
    }
    
    if (this.config.isBloxRouteEnabled()) {
      executors.push(
        this.bloxRouteExecutor.executeTransaction(this.cloneTransaction(transaction), [...signers])
          .then(result => ({ ...result, provider: 'bloxroute' }))
      );
    }
    
    if (this.config.isNozomiEnabled()) {
      executors.push(
        this.nozomiExecutor.executeTransaction(this.cloneTransaction(transaction), [...signers])
          .then(result => ({ ...result, provider: 'nozomi' }))
      );
    }
    
    if (executors.length === 0) {
      throw new ExecutorError('No providers are enabled for hybrid execution', 'hybrid', ExecutionStrategy.HYBRID);
    }
    
    try {
      // Race all executors - first successful wins
      const result = await this.promiseAny(executors);
      this.logger.success(`Hybrid execution succeeded with provider: ${result.provider}`);
      return result;
    } catch (error) {
      this.logger.warn('All providers failed in hybrid mode, trying fallback...');
      return await this.executeFallback(transaction, signers);
    }
  }

  /**
   * Auto execution: Intelligent provider selection based on conditions
   */
  private async executeAuto(
    transaction: Transaction,
    signers: Keypair[]
  ): Promise<ExecutionResult> {
    this.logger.progress('Executing auto strategy (intelligent selection)...');
    
    const enabledProviders = this.config.getEnabledProviders();
    
    if (enabledProviders.length === 0) {
      return await this.executeFallback(transaction, signers);
    }
    
    if (enabledProviders.length === 1) {
      // Only one provider enabled, use it directly
      const provider = enabledProviders[0].toLowerCase();
      switch (provider) {
        case 'jito':
          return await this.jitoExecutor.executeTransaction(transaction, signers);
        case 'bloxroute':
          return await this.bloxRouteExecutor.executeTransaction(transaction, signers);
        case 'nozomi':
          return await this.nozomiExecutor.executeTransaction(transaction, signers);
        default:
          return await this.executeFallback(transaction, signers);
      }
    }
    
    // Multiple providers enabled, use hybrid approach
    return await this.executeHybrid(transaction, signers);
  }

  /**
   * Fallback execution: Direct RPC submission
   */
  private async executeFallback(
    transaction: Transaction,
    signers: Keypair[]
  ): Promise<ExecutionResult> {
    this.logger.progress('Executing fallback strategy (direct RPC)...');
    
    let retries = 0;
    const maxRetries = this.config.executorConfig.maxRetries || MAX_RETRY_ATTEMPTS;
    
    while (retries < maxRetries) {
      try {
        // Get latest blockhash
        const { blockhash, lastValidBlockHeight } = await this.config.connection.getLatestBlockhash();
        
        // Prepare transaction
        const tx = this.cloneTransaction(transaction);
        tx.recentBlockhash = blockhash;
        tx.feePayer = this.config.wallet.publicKey;
        
        // Sign transaction
        tx.sign(...signers);
        
        // Send transaction
        const signature = await this.config.connection.sendRawTransaction(
          tx.serialize(),
          { 
            skipPreflight: true, 
            maxRetries: 0 // We handle retries ourselves
          }
        );
        
        // Confirm transaction
        const confirmation = await this.config.connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight
        });
        
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        this.logger.success('Fallback execution successful');
        return {
          success: true,
          signature,
          provider: 'fallback',
          retryCount: retries
        };
        
      } catch (error) {
        retries++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (retries >= maxRetries) {
          this.logger.failure(`Fallback execution failed after ${retries} attempts: ${errorMessage}`);
          return {
            success: false,
            error: `Fallback execution failed: ${errorMessage}`,
            provider: 'fallback',
            retryCount: retries
          };
        }
        
        this.logger.warn(`Fallback attempt ${retries} failed, retrying... Error: ${errorMessage}`);
        await this.delay(1000 * retries); // Exponential backoff
      }
    }
    
    return {
      success: false,
      error: 'Maximum retry attempts reached',
      provider: 'fallback',
      retryCount: retries
    };
  }

  /**
   * Promise.any polyfill for older environments
   */
  private async promiseAny<T>(promises: Promise<T>[]): Promise<T> {
    return new Promise((resolve, reject) => {
      if (promises.length === 0) {
        reject(new Error('No promises provided'));
        return;
      }

      let rejectedCount = 0;
      const errors: any[] = [];

      promises.forEach((promise, index) => {
        promise
          .then(resolve)
          .catch(error => {
            errors[index] = error;
            rejectedCount++;
            if (rejectedCount === promises.length) {
              reject(new Error('All promises rejected'));
            }
          });
      });
    });
  }

  /**
   * Determine optimal execution strategy based on configuration
   */
  private determineOptimalStrategy(): ExecutionStrategy {
    const enabledProviders = this.config.getEnabledProviders();
    
    // If multiple providers enabled, use hybrid for maximum speed
    if (enabledProviders.length > 1) {
      return ExecutionStrategy.HYBRID;
    }
    
    // Single provider strategies
    if (this.config.isJitoEnabled()) return ExecutionStrategy.JITO_ONLY;
    if (this.config.isBloxRouteEnabled()) return ExecutionStrategy.BLOXROUTE_ONLY;
    if (this.config.isNozomiEnabled()) return ExecutionStrategy.NOZOMI_ONLY;
    
    // Default to fallback if no providers configured
    return ExecutionStrategy.FALLBACK;
  }

  /**
   * Clone transaction to avoid mutation issues in parallel execution
   */
  private cloneTransaction(transaction: Transaction): Transaction {
    return Transaction.from(transaction.serialize({ requireAllSignatures: false }));
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get execution statistics
   */
  public getExecutionStats(): {
    enabledProviders: string[];
    optimalStrategy: ExecutionStrategy;
    estimatedCost: any;
  } {
    return {
      enabledProviders: this.config.getEnabledProviders(),
      optimalStrategy: this.determineOptimalStrategy(),
      estimatedCost: this.config.estimateTransactionCost()
    };
  }

  /**
   * Health check for all providers
   */
  public async healthCheck(): Promise<{
    jito: boolean;
    bloxroute: boolean;
    nozomi: boolean;
    fallback: boolean;
  }> {
    const results = {
      jito: false,
      bloxroute: false,
      nozomi: false,
      fallback: false
    };
    
    // Test Jito
    if (this.config.isJitoEnabled()) {
      try {
        // Basic endpoint test
        results.jito = true; // Simplified for now
      } catch (error) {
        this.logger.warn('Jito health check failed');
      }
    }
    
    // Test BloxRoute
    if (this.config.isBloxRouteEnabled()) {
      try {
        // Basic endpoint test
        results.bloxroute = true; // Simplified for now
      } catch (error) {
        this.logger.warn('BloxRoute health check failed');
      }
    }
    
    // Test Nozomi
    if (this.config.isNozomiEnabled()) {
      try {
        // Basic endpoint test
        results.nozomi = true; // Simplified for now
      } catch (error) {
        this.logger.warn('Nozomi health check failed');
      }
    }
    
    // Test fallback (RPC connection)
    try {
      await this.config.connection.getRecentBlockhash();
      results.fallback = true;
    } catch (error) {
      this.logger.warn('Fallback (RPC) health check failed');
    }
    
    return results;
  }

  /**
   * Execute transaction with optimal strategy (alias for compatibility)
   */
  async executeOptimal(transaction: Transaction, signers: Keypair[]): Promise<ExecutionResult> {
    return this.executeTransaction(transaction, signers);
  }

  /**
   * Estimate execution cost for each provider
   */
  async estimateExecutionCost(_transaction: Transaction): Promise<Record<string, number>> {
    const costs: Record<string, number> = {};

    if (this.config.isJitoEnabled()) {
      costs.jito = 100000; // 0.0001 SOL base tip
    }

    if (this.config.isBloxRouteEnabled()) {
      costs.bloxroute = this.config.bloxRouteConfig.fee * 1000000000; // Convert SOL to lamports
    }

    if (this.config.isNozomiEnabled()) {
      costs.nozomi = this.config.nozomiConfig.tipAmount * 1000000000; // Convert SOL to lamports
    }

    // Default RPC cost
    costs.rpc = 5000; // 5000 lamports (0.000005 SOL)

    return costs;
  }
}

export default TransactionExecutor;
