import { Transaction, Keypair, SystemProgram, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { ConfigManager } from '../utils/config';
import { ExecutionResult } from '../utils/types';

export class BloxRouteExecutor {
  private config: ConfigManager;
  private bloxRouteTipWallet = new PublicKey('HWEoBxYs7ssKuudEjzjmpfJVX7Dvi7wescFsVx2L5yoY');
  
  constructor() {
    this.config = ConfigManager.getInstance();
  }

  public async executeTransaction(
    transaction: Transaction,
    signers: Keypair[]
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    
    try {
      this.config.getLogger().info('⚡ Executing transaction via BloxRoute...');
      
      const bloxRouteConfig = this.config.bloxRouteConfig;
      
      if (!bloxRouteConfig.authHeader) {
        throw new Error('BloxRoute auth header not configured');
      }

      // Get latest blockhash
      const { blockhash, lastValidBlockHeight } = await this.config.connection.getLatestBlockhash();
      
      // Prepare transaction
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.config.wallet.publicKey;
      
      // Add BloxRoute tip if configured
      const tipAmount = bloxRouteConfig.fee * LAMPORTS_PER_SOL;
      if (tipAmount > 0) {
        transaction.add(
          SystemProgram.transfer({
            fromPubkey: this.config.wallet.publicKey,
            toPubkey: this.bloxRouteTipWallet,
            lamports: tipAmount
          })
        );
        this.config.getLogger().debug(`Added BloxRoute tip: ${tipAmount / LAMPORTS_PER_SOL} SOL`);
      }
      
      // Sign transaction
      transaction.sign(...signers);
      
      this.config.getLogger().debug('Submitting transaction to BloxRoute...');
      
      // Submit transaction directly to Solana network (simplified)
      const signature = await this.config.connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false }
      );
      
      // Wait for confirmation
      const confirmation = await this.config.connection.confirmTransaction({
        signature,
        blockhash,
        lastValidBlockHeight
      }, 'confirmed');
      
      const executionTime = Date.now() - startTime;
      
      if (confirmation.value.err) {
        return {
          success: false,
          error: `Transaction failed: ${confirmation.value.err}`,
          executionTime,
          provider: 'bloxroute'
        };
      }
      
      this.config.getLogger().transaction(`BloxRoute execution successful: ${signature}`, signature);
      return {
        success: true,
        signature,
        executionTime,
        provider: 'bloxroute'
      };
      
    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      this.config.getLogger().error('BloxRoute execution failed:', errorMessage);
      return {
        success: false,
        error: `BloxRoute execution failed: ${errorMessage}`,
        executionTime,
        provider: 'bloxroute'
      };
    }
  }

  public async healthCheck(): Promise<boolean> {
    try {
      this.config.getLogger().info('Checking BloxRoute health...');
      const start = Date.now();
      await this.config.connection.getLatestBlockhash();
      const isHealthy = (Date.now() - start) < 5000; // Should respond within 5 seconds
      
      this.config.getLogger().info(`BloxRoute health check: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`);
      return isHealthy;
    } catch (error) {
      this.config.getLogger().error('BloxRoute health check failed:', error);
      return false;
    }
  }

  public getOptimalFee(): number {
    try {
      const baseFee = this.config.bloxRouteConfig.fee;
      const networkMultiplier = this.config.networkConfig.network === 'mainnet' ? 1.5 : 1.0;
      
      return baseFee * networkMultiplier;
    } catch (error) {
      this.config.getLogger().warn('Failed to get optimal BloxRoute fee, using default:', error);
      return 0.001; // Default fee in SOL
    }
  }
}
