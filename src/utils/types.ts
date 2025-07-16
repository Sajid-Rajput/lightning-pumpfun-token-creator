/**
 * Lightning Fast PumpFun Token Creator - Type Definitions
 * 
 * Professional TypeScript type definitions for the token creator system
 * with comprehensive interfaces for all components.
 */

import { Keypair, PublicKey, Transaction } from '@solana/web3.js';

// === Core Interfaces ===

export interface TokenMetadata {
  name: string;
  symbol: string;
  description: string;
  imageUrl?: string;
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
}

export interface TokenCreationConfig {
  metadata: TokenMetadata;
  initialBuyAmount: number; // SOL amount
  slippageBasisPoints: number;
  priorityFee: number;
  decimals?: number; // Default: 6 (PumpFun standard)
  initialSupply?: bigint; // Default: 1B tokens
}

export interface ExecutorConfig {
  useJito: boolean;
  useBloxRoute: boolean;
  useNozomi: boolean;
  jitoTipAmount: number;
  bloxRouteFee: number;
  nozomiTipAmount: number;
  maxRetries?: number;
  timeout?: number;
  transactionTimeout?: number;
}

export interface NetworkConfig {
  rpcEndpoint: string;
  wsEndpoint?: string;
  network: 'devnet' | 'mainnet' | 'testnet';
  commitment?: 'finalized' | 'confirmed' | 'processed';
}

export interface PerformanceMetrics {
  totalExecutionTime: number;
  transactionBuildTime: number;
  networkSubmissionTime: number;
  confirmationTime: number;
  metadataUploadTime?: number;
  success: boolean;
  signature?: string;
  error?: string;
  strategy?: ExecutionStrategy;
  provider?: string;
  retryCount?: number;
}

export interface HealthCheckResult {
  system: boolean;
  network: boolean;
  wallet: boolean;
  jito: boolean;
  bloxRoute: boolean;
  nozomi: boolean;
  rpcEndpoint: boolean;
  blockHeight?: number;
  walletBalance?: number;
  timestamp: number;
}

export interface CostEstimation {
  estimatedCost: number; // in SOL
  breakdown: {
    baseFee: number;
    priorityFee: number;
    jitoTip: number;
    bloxRouteFee: number;
    nozomiTip: number;
    metadataUpload: number;
  };
  currency: 'SOL' | 'USD';
}

export interface ValidatorTip {
  validator: string;
  amount: number;
}

// === Enums ===

export enum ExecutionStrategy {
  JITO_ONLY = 'jito',
  BLOXROUTE_ONLY = 'bloxroute',
  NOZOMI_ONLY = 'nozomi',
  HYBRID = 'hybrid',
  FALLBACK = 'fallback',
  AUTO = 'auto'
}

export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  VERBOSE = 'verbose'
}

export enum TokenCreationStatus {
  INITIALIZING = 'initializing',
  UPLOADING_METADATA = 'uploading_metadata',
  BUILDING_TRANSACTION = 'building_transaction',
  SUBMITTING = 'submitting',
  CONFIRMING = 'confirming',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// === Result Types ===

export interface ExecutionResult {
  success: boolean;
  signature?: string;
  error?: string;
  strategy?: ExecutionStrategy;
  executionTime?: number;
  retryCount?: number;
  provider?: string;
}

export interface TokenCreationResult {
  success: boolean;
  tokenMint?: PublicKey;
  signature?: string;
  metrics: PerformanceMetrics;
  error?: string;
  status: TokenCreationStatus;
  metadata?: TokenMetadata;
  costEstimation?: CostEstimation;
}

export interface MetadataUploadResult {
  success: boolean;
  uri?: string;
  error?: string;
  uploadTime?: number;
  provider?: string;
}

// === Configuration Types ===

export interface JitoConfig {
  endpoints: string[];
  validators: string[];
  tipAmount: number;
  timeout: number;
}

export interface BloxRouteConfig {
  authHeader: string;
  endpoint: string;
  fee: number;
  useStakedRPCs: boolean;
}

export interface NozomiConfig {
  apiKey: string;
  endpoint: string;
  validators: string[];
  tipAmount: number;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  filePath?: string;
  enablePerformanceLogging: boolean;
  enableColoredOutput: boolean;
}

// === Provider Interfaces ===

export interface ITransactionExecutor {
  executeTransaction(
    transaction: Transaction,
    signers: Keypair[]
  ): Promise<ExecutionResult>;
}

export interface IMetadataUploader {
  uploadMetadata(metadata: TokenMetadata): Promise<MetadataUploadResult>;
}

export interface IPerformanceMonitor {
  startTracking(operation: string): void;
  endTracking(operation: string): void;
  getMetrics(): Record<string, number>;
  reset(): void;
  logPerformance(): void;
}

export interface IHealthChecker {
  checkSystemHealth(): Promise<HealthCheckResult>;
  checkNetworkHealth(): Promise<boolean>;
  checkWalletHealth(): Promise<boolean>;
  checkProviderHealth(provider: string): Promise<boolean>;
}

// === Error Types ===

export class TokenCreationError extends Error {
  public readonly code: string;
  public readonly details?: Record<string, any>;

  constructor(message: string, code: string, details?: Record<string, any>) {
    super(message);
    this.name = 'TokenCreationError';
    this.code = code;
    this.details = details;
  }
}

export class ExecutorError extends Error {
  public readonly provider: string;
  public readonly strategy: ExecutionStrategy;
  public readonly retryCount: number;

  constructor(
    message: string,
    provider: string,
    strategy: ExecutionStrategy,
    retryCount: number = 0
  ) {
    super(message);
    this.name = 'ExecutorError';
    this.provider = provider;
    this.strategy = strategy;
    this.retryCount = retryCount;
  }
}

export class ConfigurationError extends Error {
  public readonly field: string;

  constructor(message: string, field: string) {
    super(message);
    this.name = 'ConfigurationError';
    this.field = field;
  }
}

// === Event Types ===

export interface TokenCreationEvent {
  type: 'status_change' | 'progress' | 'error' | 'completion';
  timestamp: number;
  data: any;
}

export interface ProgressEvent extends TokenCreationEvent {
  type: 'progress';
  data: {
    status: TokenCreationStatus;
    progress: number; // 0-100
    message: string;
  };
}

export interface ErrorEvent extends TokenCreationEvent {
  type: 'error';
  data: {
    error: Error;
    strategy?: ExecutionStrategy;
    provider?: string;
    retryCount?: number;
  };
}

export interface CompletionEvent extends TokenCreationEvent {
  type: 'completion';
  data: TokenCreationResult;
}

// === Utility Types ===

export type EventHandler<T extends TokenCreationEvent> = (event: T) => void;
export type ProviderHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
export type NetworkStatus = 'online' | 'offline' | 'degraded';

// === Constants ===

export const DEFAULT_TOKEN_DECIMALS = 6;
export const DEFAULT_INITIAL_SUPPLY = BigInt(1_000_000_000); // 1B tokens
export const DEFAULT_SLIPPAGE_BASIS_POINTS = 500; // 5%
export const DEFAULT_PRIORITY_FEE = 0.001; // 0.001 SOL
export const DEFAULT_JITO_TIP = 0.0001; // 0.0001 SOL
export const DEFAULT_NOZOMI_TIP = 0.0001; // 0.0001 SOL
export const DEFAULT_BLOXROUTE_FEE = 0.001; // 0.001 SOL

export const MAX_RETRY_ATTEMPTS = 3;
export const DEFAULT_TIMEOUT = 30000; // 30 seconds
export const CONFIRMATION_TIMEOUT = 60000; // 60 seconds
