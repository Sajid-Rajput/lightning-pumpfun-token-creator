import { 
  Transaction, 
  Keypair, 
  SystemProgram, 
  PublicKey, 
  LAMPORTS_PER_SOL 
} from '@solana/web3.js';
import { ConfigManager } from '../utils/config';
import { ExecutionResult } from '../utils/types';
import axios from 'axios';

export class NozomiExecutor {
  private config: ConfigManager;
  private nozomiValidators: string[] = [
    'TEMPaMeCRFAS9EKF53Jd6KpHxgL47uWLcpFArU1Fanq',
    'noz3jAjPiHuBPqiSPkkugaJDkJscPuRhYnSpbi8UvC4',
    'noz3str9KXfpKknefHji8L1mPgimezaiUyCHYMDv1GE',
    'noz6uoYCDijhu1V7cutCpwxNiSovEwLdRHPwmgCGDNo'
  ];

  constructor() {
    this.config = ConfigManager.getInstance();
  }

  private getRandomValidator(): PublicKey {
    const randomIndex = Math.floor(Math.random() * this.nozomiValidators.length);
    return new PublicKey(this.nozomiValidators[randomIndex]);
  }

  public async executeTransaction(
    transaction: Transaction,
    signers: Keypair[]
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.config.getLogger().info('🚀 Executing transaction via Nozomi...');
      
      const validator = this.getRandomValidator();
      const tipAmount = this.config.executorConfig.nozomiTipAmount * LAMPORTS_PER_SOL;
      
      this.config.getLogger().debug(`Using Nozomi validator: ${validator.toBase58()}`);
      this.config.getLogger().debug(`Tip amount: ${tipAmount / LAMPORTS_PER_SOL} SOL`);
      
      // Clone transaction to avoid modifying original
      const nozomiTx = Transaction.from(transaction.serialize({ requireAllSignatures: false }));
      
      // Add tip instruction to the cloned transaction
      if (tipAmount > 0) {
        const tipInstruction = SystemProgram.transfer({
          fromPubkey: this.config.wallet.publicKey,
          toPubkey: validator,
          lamports: tipAmount
        });
        nozomiTx.add(tipInstruction);
      }
      
      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await this.config.connection.getLatestBlockhash();
      
      nozomiTx.recentBlockhash = blockhash;
      nozomiTx.lastValidBlockHeight = lastValidBlockHeight;
      nozomiTx.feePayer = this.config.wallet.publicKey;
      
      // Sign transaction
      nozomiTx.sign(...signers);
      
      // Serialize to base64
      const serializedTx = nozomiTx.serialize();
      const encodedTx = Buffer.from(serializedTx).toString('base64');
      
      // Submit to Nozomi
      const nozomiConfig = this.config.nozomiConfig;
      
      if (!nozomiConfig.apiKey) {
        return {
          success: false,
          error: 'Nozomi API key not configured',
          executionTime: Date.now() - startTime,
          provider: 'nozomi'
        };
      }
      
      const url = `${nozomiConfig.endpoint}${nozomiConfig.apiKey}`;
      
      this.config.getLogger().debug('Submitting transaction to Nozomi...');
      
      const response = await axios.post(url, {
        jsonrpc: '2.0',
        id: 1,
        method: 'sendTransaction',
        params: [encodedTx, { 
          encoding: 'base64',
          skipPreflight: false,
          preflightCommitment: 'confirmed'
        }]
      }, {
        timeout: this.config.executorConfig.transactionTimeout,
        headers: { 
          'Content-Type': 'application/json',
          'User-Agent': 'Lightning-PumpFun-Creator/1.0'
        }
      });
      
      const executionTime = Date.now() - startTime;
      
      if (response.data?.result) {
        const signature = response.data.result;
        this.config.getLogger().transaction(`Nozomi execution successful: ${signature}`, signature);
        
        return {
          success: true,
          signature,
          executionTime,
          provider: 'nozomi'
        };
      }
      
      const error = response.data?.error?.message || 'Nozomi submission failed';
      this.config.getLogger().error('Nozomi submission failed:', error);
      
      return {
        success: false,
        error: `Nozomi submission failed: ${error}`,
        executionTime,
        provider: 'nozomi'
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.config.getLogger().error('Nozomi execution failed:', errorMessage);
      return {
        success: false,
        error: `Nozomi execution failed: ${errorMessage}`,
        executionTime,
        provider: 'nozomi'
      };
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const nozomiConfig = this.config.nozomiConfig;
      
      if (!nozomiConfig.apiKey) {
        this.config.getLogger().warn('Nozomi API key not configured');
        return false;
      }
      
      const url = `${nozomiConfig.endpoint}${nozomiConfig.apiKey}`;
      
      // Test connectivity with a simple getHealth or getVersion call
      const response = await axios.post(url, {
        jsonrpc: '2.0',
        id: 1,
        method: 'getHealth'
      }, {
        timeout: 5000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      const isHealthy = response.status === 200;
      this.config.getLogger().info(`Nozomi health check: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      
      return isHealthy;
    } catch (error) {
      this.config.getLogger().error('Nozomi health check failed:', error);
      return false;
    }
  }

  public async getOptimalTip(): Promise<number> {
    try {
      // In a real implementation, you might query Nozomi for current tip recommendations
      // For now, we'll use a simple calculation based on network conditions
      const baseTip = this.config.executorConfig.nozomiTipAmount;
      const networkMultiplier = this.config.networkConfig.network === 'mainnet' ? 1.3 : 1.0;
      
      return baseTip * networkMultiplier;
    } catch (error) {
      this.config.getLogger().warn('Failed to get optimal Nozomi tip, using default:', error);
      return this.config.executorConfig.nozomiTipAmount;
    }
  }

  public async getValidatorPerformance(): Promise<Record<string, number>> {
    try {
      // This would query Nozomi for validator performance metrics
      // For now, return mock data
      const performance: Record<string, number> = {};
      
      this.nozomiValidators.forEach((validator) => {
        // Mock performance score (0-100)
        performance[validator] = 85 + Math.random() * 15;
      });
      
      return performance;
    } catch (error) {
      this.config.getLogger().error('Failed to get validator performance:', error);
      return {};
    }
  }

  public selectOptimalValidator(): PublicKey {
    // For now, just return random validator
    // In production, this would use performance metrics
    return this.getRandomValidator();
  }

  public isConfigured(): boolean {
    const config = this.config.nozomiConfig;
    return !!config.apiKey;
  }

  public async estimateTransactionCost(transaction: Transaction): Promise<number> {
    try {
      // Estimate the cost of executing this transaction through Nozomi
      const baseCost = 5000; // Base cost in lamports
      const instructionCost = transaction.instructions.length * 1000;
      const tipCost = this.config.executorConfig.nozomiTipAmount * LAMPORTS_PER_SOL;
      
      return baseCost + instructionCost + tipCost;
    } catch (error) {
      this.config.getLogger().error('Failed to estimate transaction cost:', error);
      return 0;
    }
  }
}
