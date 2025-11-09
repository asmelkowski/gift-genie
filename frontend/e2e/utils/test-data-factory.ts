/**
 * Test Data Factory
 * Generates unique test user data for each test run
 * Handles both CI and local environments with consistent patterns
 * Enhanced for parallel execution with worker-specific uniqueness
 */

import { ParallelExecutionHelpers } from './parallel-execution-helpers';

export interface TestUserData {
  email: string;
  password: string;
  name: string;
  testId: string;
}

export interface TestCredentials {
  email: string;
  password: string;
}

/**
 * Generates unique test user data for each test run
 * Uses timestamp, process ID, worker ID, and test context to ensure uniqueness
 * Thread-safe for parallel execution across multiple workers
 */
export class TestDataFactory {
  private static readonly BASE_PASSWORD = '09%#3@0#rH3ksOqbL#qg8LAnT8c*35Vfa&5Q';
  private static readonly BASE_NAME = 'Test User';

  // Cache worker-specific data to avoid repeated calculations
  private static workerId: string | null = null;
  private static processId: string | null = null;
  private static sequenceCounter = 0;

  /**
   * Detects if running in CI environment
   */
  static isCI(): boolean {
    return !!process.env.CI;
  }

  /**
   * Gets the current worker ID for parallel execution
   * Uses Playwright's TEST_WORKER_INDEX or falls back to process-based uniqueness
   */
  static getWorkerId(): string {
    if (this.workerId === null) {
      // Try to get Playwright worker index
      const workerIndex = process.env.TEST_WORKER_INDEX || process.env.PLAYWRIGHT_WORKER_INDEX;
      if (workerIndex) {
        this.workerId = `w${workerIndex}`;
      } else {
        // Fallback: use a combination of PID and random seed for uniqueness
        const pid = process.pid.toString();
        const randomSeed = Math.random().toString(36).substring(2, 6);
        this.workerId = `p${pid}-${randomSeed}`;
      }
    }
    return this.workerId;
  }

  /**
   * Gets the process ID for additional uniqueness
   */
  private static getProcessId(): string {
    if (this.processId === null) {
      this.processId = process.pid.toString(36);
    }
    return this.processId;
  }

  /**
   * Gets the next sequence number for this worker (thread-safe within worker)
   */
  private static getNextSequence(): number {
    return ++this.sequenceCounter;
  }

  /**
   * Generates a unique test identifier with high precision and worker isolation
   * Format: timestamp-workerId-processId-sequence-randomSuffix
   */
  static generateTestId(suffix?: string): string {
    const timestamp = Date.now();
    const microtime = process.hrtime.bigint().toString().slice(-6); // Last 6 digits of high-res time
    const workerId = this.getWorkerId();
    const processId = this.getProcessId();
    const sequence = this.getNextSequence();
    const randomSuffix = Math.random().toString(36).substring(2, 8);

    const parts = [
      timestamp.toString(),
      microtime,
      workerId,
      processId,
      sequence.toString(),
      randomSuffix,
    ];

    if (suffix) {
      parts.push(suffix.replace(/[^a-zA-Z0-9-_]/g, '-')); // Sanitize suffix
    }

    return parts.join('-');
  }

  /**
   * Creates unique test user data for a specific test
   * Enhanced for parallel execution with worker-specific uniqueness
   * In CI: uses worker-specific emails to avoid conflicts between parallel workers
   * Locally: uses unique emails to avoid conflicts between test runs
   */
  static createTestUser(testName?: string): TestUserData {
    const testId = this.generateTestId(testName);
    const isCI = this.isCI();
    const workerId = this.getWorkerId();

    // In CI, use worker-specific emails to avoid conflicts between parallel workers
    // Locally, use unique emails to avoid conflicts between test runs
    const email = isCI ? `test-${workerId}@example.com` : `test-${testId}@example.com`;

    // Use a shorter name to avoid backend validation limits (max 100 chars)
    const shortId = testId.substring(0, 20); // Take first 20 chars of testId
    const name = `${this.BASE_NAME} ${shortId}`;

    const logPrefix = ParallelExecutionHelpers.getLogPrefix();
    console.log(`${logPrefix} 🔧 Generated test user data:`);
    console.log(`${logPrefix}    📧 Email: ${email}`);
    console.log(`${logPrefix}    👤 Name: ${name}`);
    console.log(`${logPrefix}    🏷️  Test ID: ${testId}`);
    console.log(`${logPrefix}    🌍 Environment: ${isCI ? 'CI' : 'Local'}`);

    return {
      email,
      password: this.BASE_PASSWORD,
      name,
      testId,
    };
  }

  /**
   * Creates test credentials for existing user scenarios
   * Enhanced for parallel execution with worker-specific credentials
   * Useful when testing login with pre-existing users
   */
  static createTestCredentials(testId?: string): TestCredentials {
    const isCI = this.isCI();
    const workerId = this.getWorkerId();

    // In CI, use worker-specific credentials to avoid conflicts between parallel workers
    // Locally, can use specific test IDs if provided
    const email = isCI
      ? `test-${workerId}@example.com`
      : testId
        ? `test-${testId}@example.com`
        : `test-${workerId}@example.com`;

    return {
      email,
      password: this.BASE_PASSWORD,
    };
  }

  /**
   * Generates a unique group name for testing
   */
  static createTestGroupName(testId?: string): string {
    const id = testId || this.generateTestId();
    return `Test Group ${id}`;
  }

  /**
   * Generates a unique draw name for testing
   */
  static createTestDrawName(testId?: string): string {
    const id = testId || this.generateTestId();
    return `Test Draw ${id}`;
  }

  /**
   * Creates test member data for group testing
   */
  static createTestMemberData(testId?: string): { name: string; email: string } {
    const id = testId || this.generateTestId();
    return {
      name: `Test Member ${id}`,
      email: `member-${id}@example.com`,
    };
  }

  /**
   * Logs test data generation for debugging
   */
  static logTestData(testData: TestUserData): void {
    console.log('📊 Test Data Summary:');
    console.log(`   🆔 Test ID: ${testData.testId}`);
    console.log(`   👤 Name: ${testData.name}`);
    console.log(`   📧 Email: ${testData.email}`);
    console.log(`   🔒 Password: ${'*'.repeat(testData.password.length)}`);
  }
}
