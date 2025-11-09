/**
 * Parallel Execution Helpers
 * Utilities for monitoring and debugging parallel test execution
 * Provides worker-specific logging and coordination
 */

import { TestDataFactory } from './test-data-factory';

export interface WorkerInfo {
  workerId: string;
  processId: string;
  testCount: number;
  startTime: Date;
}

/**
 * Parallel Execution Helper Utilities
 * Provides utilities for managing parallel test execution
 */
export class ParallelExecutionHelpers {
  private static workerInfo: Map<string, WorkerInfo> = new Map();
  private static testStartTimes: Map<string, Date> = new Map();

  /**
   * Gets current worker information
   */
  static getWorkerInfo(): WorkerInfo {
    const workerId = TestDataFactory.getWorkerId();
    const processId = TestDataFactory['getProcessId'](); // Access private method

    if (!this.workerInfo.has(workerId)) {
      this.workerInfo.set(workerId, {
        workerId,
        processId,
        testCount: 0,
        startTime: new Date(),
      });
    }

    return this.workerInfo.get(workerId)!;
  }

  /**
   * Logs the start of a test with worker information
   */
  static logTestStart(testName: string): void {
    const workerInfo = this.getWorkerInfo();
    const startTime = new Date();

    this.testStartTimes.set(`${workerInfo.workerId}-${testName}`, startTime);
    workerInfo.testCount++;

    console.log(`🧪 Worker ${workerInfo.workerId}: Starting test "${testName}"`);
    console.log(`   📊 Test count: ${workerInfo.testCount}`);
    console.log(`   ⏰ Start time: ${startTime.toISOString()}`);
  }

  /**
   * Logs the completion of a test with duration
   */
  static logTestComplete(testName: string, success: boolean = true): void {
    const workerInfo = this.getWorkerInfo();
    const startTime = this.testStartTimes.get(`${workerInfo.workerId}-${testName}`);

    if (startTime) {
      const duration = Date.now() - startTime.getTime();
      console.log(
        `✅ Worker ${workerInfo.workerId}: Completed test "${testName}" (${success ? 'PASS' : 'FAIL'}) in ${duration}ms`
      );
    } else {
      console.log(
        `✅ Worker ${workerInfo.workerId}: Completed test "${testName}" (${success ? 'PASS' : 'FAIL'})`
      );
    }
  }

  /**
   * Logs worker statistics
   */
  static logWorkerStats(): void {
    const workerInfo = this.getWorkerInfo();
    const runtime = Date.now() - workerInfo.startTime.getTime();

    console.log(`📊 Worker ${workerInfo.workerId} Statistics:`);
    console.log(`   🧪 Tests executed: ${workerInfo.testCount}`);
    console.log(`   ⏱️  Runtime: ${runtime}ms`);
    console.log(
      `   📈 Average test time: ${workerInfo.testCount > 0 ? Math.round(runtime / workerInfo.testCount) : 0}ms`
    );
  }

  /**
   * Creates a worker-specific log prefix
   */
  static getLogPrefix(): string {
    const workerId = TestDataFactory.getWorkerId();
    return `👷 Worker ${workerId}:`;
  }

  /**
   * Delays execution to help with debugging race conditions
   */
  static async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets all active worker IDs (for debugging)
   */
  static getActiveWorkers(): string[] {
    return Array.from(this.workerInfo.keys());
  }

  /**
   * Resets worker tracking (useful for test isolation)
   */
  static resetWorkerTracking(): void {
    this.workerInfo.clear();
    this.testStartTimes.clear();
  }
}
