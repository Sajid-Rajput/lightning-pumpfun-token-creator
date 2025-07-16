/**
 * Lightning Fast PumpFun Token Creator - Performance Monitor
 * 
 * Professional performance monitoring system with detailed metrics tracking,
 * benchmarking capabilities, and statistical analysis.
 */

import { IPerformanceMonitor, PerformanceMetrics } from '../utils/types';
import { getLogger } from '../utils/logger';

interface OperationMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

interface PerformanceStats {
  totalOperations: number;
  averageDuration: number;
  minDuration: number;
  maxDuration: number;
  successRate: number;
  p95Duration: number;
  p99Duration: number;
}

export class PerformanceMonitor implements IPerformanceMonitor {
  private operations: Map<string, OperationMetric> = new Map();
  private completedOperations: OperationMetric[] = [];
  private logger = getLogger();
  private startTimestamp: number;

  constructor() {
    this.startTimestamp = Date.now();
    this.logger.debug('📊 Performance Monitor initialized');
  }

  /**
   * Start tracking an operation
   */
  public startTracking(operation: string, metadata?: Record<string, any>): void {
    const metric: OperationMetric = {
      name: operation,
      startTime: Date.now(),
      metadata
    };
    
    this.operations.set(operation, metric);
    this.logger.debug(`⏱️ Started tracking: ${operation}`);
  }

  /**
   * End tracking an operation
   */
  public endTracking(operation: string, metadata?: Record<string, any>): number {
    const metric = this.operations.get(operation);
    
    if (!metric) {
      this.logger.warn(`⚠️ Attempted to end tracking for unknown operation: ${operation}`);
      return 0;
    }

    const endTime = Date.now();
    const duration = endTime - metric.startTime;
    
    const completedMetric: OperationMetric = {
      ...metric,
      endTime,
      duration,
      metadata: { ...metric.metadata, ...metadata }
    };
    
    this.completedOperations.push(completedMetric);
    this.operations.delete(operation);
    
    this.logger.debug(`✅ Completed tracking: ${operation} (${duration}ms)`);
    
    return duration;
  }

  /**
   * Get metrics for all completed operations
   */
  public getMetrics(): Record<string, number> {
    const metrics: Record<string, number> = {};
    
    this.completedOperations.forEach(op => {
      if (op.duration !== undefined) {
        metrics[op.name] = op.duration;
      }
    });
    
    return metrics;
  }

  /**
   * Get detailed performance metrics
   */
  public getDetailedMetrics(): PerformanceMetrics {
    const totalTime = Date.now() - this.startTimestamp;
    const operations = this.completedOperations;
    
    const buildOps = operations.filter(op => op.name.includes('build') || op.name.includes('transaction_build'));
    const submitOps = operations.filter(op => op.name.includes('submit') || op.name.includes('execution'));
    const confirmOps = operations.filter(op => op.name.includes('confirm') || op.name.includes('confirmation'));
    const uploadOps = operations.filter(op => op.name.includes('upload') || op.name.includes('metadata'));
    
    return {
      totalExecutionTime: totalTime,
      transactionBuildTime: this.getAverageDuration(buildOps),
      networkSubmissionTime: this.getAverageDuration(submitOps),
      confirmationTime: this.getAverageDuration(confirmOps),
      metadataUploadTime: this.getAverageDuration(uploadOps),
      success: true // Will be set by caller based on overall success
    };
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.operations.clear();
    this.completedOperations = [];
    this.startTimestamp = Date.now();
    this.logger.debug('🔄 Performance metrics reset');
  }

  /**
   * Log performance summary
   */
  public logPerformance(): void {
    if (this.completedOperations.length === 0) {
      this.logger.info('📊 No performance data to display');
      return;
    }

    this.logger.section('📊 Performance Metrics Summary');
    
    const stats = this.calculateStats();
    this.logger.info(`Total Operations: ${stats.totalOperations}`);
    this.logger.info(`Average Duration: ${stats.averageDuration.toFixed(2)}ms`);
    this.logger.info(`Min Duration: ${stats.minDuration}ms`);
    this.logger.info(`Max Duration: ${stats.maxDuration}ms`);
    this.logger.info(`P95 Duration: ${stats.p95Duration}ms`);
    this.logger.info(`P99 Duration: ${stats.p99Duration}ms`);
    
    // Log individual operations
    const operationGroups = this.groupOperationsByName();
    Object.entries(operationGroups).forEach(([name, ops]) => {
      const avgDuration = this.getAverageDuration(ops);
      this.logger.info(`${name.padEnd(25)}: ${avgDuration.toFixed(2)}ms (${ops.length} ops)`);
    });
  }

  /**
   * Get performance statistics
   */
  public getStats(): PerformanceStats {
    return this.calculateStats();
  }

  /**
   * Log real-time performance data
   */
  public logRealTimeMetrics(): void {
    const currentTime = Date.now();
    const runningTime = currentTime - this.startTimestamp;
    
    this.logger.performance('System Runtime', runningTime);
    
    if (this.operations.size > 0) {
      this.logger.info('🔄 Active Operations:');
      this.operations.forEach((metric, name) => {
        const runningDuration = currentTime - metric.startTime;
        this.logger.info(`  ${name}: ${runningDuration}ms (running)`);
      });
    }
    
    if (this.completedOperations.length > 0) {
      const recentOps = this.completedOperations.slice(-5);
      this.logger.info('✅ Recent Completed Operations:');
      recentOps.forEach(op => {
        this.logger.info(`  ${op.name}: ${op.duration}ms`);
      });
    }
  }

  /**
   * Benchmark an operation
   */
  public async benchmark<T>(
    operationName: string,
    operation: () => Promise<T>,
    iterations: number = 1
  ): Promise<{
    results: T[];
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
  }> {
    this.logger.info(`🏃 Benchmarking ${operationName} (${iterations} iterations)...`);
    
    const results: T[] = [];
    const times: number[] = [];
    const totalStartTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      const iterationName = `${operationName}_iteration_${i + 1}`;
      
      this.startTracking(iterationName);
      try {
        const result = await operation();
        results.push(result);
        const duration = this.endTracking(iterationName);
        times.push(duration);
      } catch (error) {
        this.endTracking(iterationName);
        this.logger.error(`Benchmark iteration ${i + 1} failed:`, error);
        throw error;
      }
    }
    
    const totalTime = Date.now() - totalStartTime;
    const averageTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    this.logger.success(`Benchmark completed: ${operationName}`);
    this.logger.info(`Average: ${averageTime.toFixed(2)}ms`);
    this.logger.info(`Min: ${minTime}ms, Max: ${maxTime}ms`);
    this.logger.info(`Total time: ${totalTime}ms`);
    
    return {
      results,
      averageTime,
      minTime,
      maxTime,
      totalTime
    };
  }

  /**
   * Record session metrics
   */
  public recordSessionMetrics(metrics: PerformanceMetrics): void {
    this.logger.debug('📊 Recording session metrics', metrics);
    
    // Store the metrics for later analysis
    this.completedOperations.push({
      name: 'session_metrics',
      startTime: Date.now() - (metrics.totalExecutionTime || 0),
      endTime: Date.now(),
      duration: metrics.totalExecutionTime,
      metadata: {
        success: metrics.success,
        error: metrics.error,
        signature: metrics.signature,
        provider: metrics.provider
      }
    });
  }

  /**
   * Get session statistics
   */
  public getSessionStatistics(): {
    totalSessions: number;
    successfulSessions: number;
    failedSessions: number;
    successRate: number;
    averageExecutionTime: number;
    lastSessionTime?: number;
  } {
    const sessionOps = this.completedOperations.filter(op => op.name === 'session_metrics');
    const total = sessionOps.length;
    const successful = sessionOps.filter(op => op.metadata?.success === true).length;
    const failed = total - successful;
    const successRate = total > 0 ? (successful / total) * 100 : 0;
    
    const avgTime = total > 0 
      ? sessionOps.reduce((sum, op) => sum + (op.duration || 0), 0) / total 
      : 0;
    
    const lastSession = sessionOps.length > 0 
      ? sessionOps[sessionOps.length - 1].endTime 
      : undefined;

    return {
      totalSessions: total,
      successfulSessions: successful,
      failedSessions: failed,
      successRate,
      averageExecutionTime: avgTime,
      lastSessionTime: lastSession
    };
  }

  /**
   * Get suggested optimizations
   */
  public getSuggestedOptimizations(): string[] {
    const suggestions: string[] = [];
    const stats = this.getSessionStatistics();

    // Analyze performance and suggest optimizations
    if (stats.successRate < 95) {
      suggestions.push('Consider using hybrid execution strategy for better reliability');
    }

    if (stats.averageExecutionTime > 5000) {
      suggestions.push('High execution times detected - consider optimizing RPC endpoint');
    }

    if (stats.averageExecutionTime > 3000) {
      suggestions.push('Token creation is slow - consider using Jito bundles for faster execution');
    }

    if (stats.failedSessions > stats.successfulSessions * 0.1) {
      suggestions.push('High failure rate - check network conditions and provider configurations');
    }

    return suggestions;
  }

  // === Private Helper Methods ===

  private calculateStats(): PerformanceStats {
    const durations = this.completedOperations
      .map(op => op.duration)
      .filter((d): d is number => d !== undefined)
      .sort((a, b) => a - b);
    
    if (durations.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        successRate: 0,
        p95Duration: 0,
        p99Duration: 0
      };
    }
    
    const total = durations.reduce((a, b) => a + b, 0);
    const average = total / durations.length;
    const p95Index = Math.floor(durations.length * 0.95);
    const p99Index = Math.floor(durations.length * 0.99);
    
    return {
      totalOperations: this.completedOperations.length,
      averageDuration: average,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      successRate: 100, // Simplified - all completed operations are considered successful
      p95Duration: durations[p95Index] || 0,
      p99Duration: durations[p99Index] || 0
    };
  }

  private getAverageDuration(operations: OperationMetric[]): number {
    if (operations.length === 0) return 0;
    
    const total = operations.reduce((sum, op) => sum + (op.duration || 0), 0);
    return total / operations.length;
  }

  private groupOperationsByName(): Record<string, OperationMetric[]> {
    const groups: Record<string, OperationMetric[]> = {};
    
    this.completedOperations.forEach(op => {
      if (!groups[op.name]) {
        groups[op.name] = [];
      }
      groups[op.name].push(op);
    });
    
    return groups;
  }

  /**
   * Export metrics for external analysis
   */
  public exportMetrics(): {
    summary: PerformanceStats;
    operations: OperationMetric[];
    currentOperations: OperationMetric[];
    sessionDuration: number;
  } {
    return {
      summary: this.calculateStats(),
      operations: [...this.completedOperations],
      currentOperations: Array.from(this.operations.values()),
      sessionDuration: Date.now() - this.startTimestamp
    };
  }

  /**
   * Check if performance meets expectations
   */
  public checkPerformanceThresholds(thresholds: {
    maxAverageTime?: number;
    maxP95Time?: number;
    minSuccessRate?: number;
  }): {
    passed: boolean;
    issues: string[];
  } {
    const stats = this.calculateStats();
    const issues: string[] = [];
    
    if (thresholds.maxAverageTime && stats.averageDuration > thresholds.maxAverageTime) {
      issues.push(`Average time ${stats.averageDuration.toFixed(2)}ms exceeds threshold ${thresholds.maxAverageTime}ms`);
    }
    
    if (thresholds.maxP95Time && stats.p95Duration > thresholds.maxP95Time) {
      issues.push(`P95 time ${stats.p95Duration}ms exceeds threshold ${thresholds.maxP95Time}ms`);
    }
    
    if (thresholds.minSuccessRate && stats.successRate < thresholds.minSuccessRate) {
      issues.push(`Success rate ${stats.successRate}% below threshold ${thresholds.minSuccessRate}%`);
    }
    
    return {
      passed: issues.length === 0,
      issues
    };
  }
}

export default PerformanceMonitor;
