import { FullConfig } from '@playwright/test';
import { mkdir } from 'fs/promises';
import { resolve } from 'path';

/**
 * Enhanced global setup for parallel E2E tests
 * Handles essential directory creation and parallel execution preparation
 * Tests are now independent with worker-specific data isolation
 */
async function globalSetup(config: FullConfig) {
  const isCI = !!process.env.CI;
  const workerCount = config.workers || (isCI ? 4 : 2);

  console.log('🚀 E2E Global Setup - Enhanced Parallel Execution Mode');
  console.log(`📍 Environment: ${isCI ? 'CI' : 'Local'}`);
  console.log(`📍 Workers: ${workerCount}`);
  console.log(`📍 Timestamp: ${new Date().toISOString()}`);
  console.log(`📍 Process ID: ${process.pid}`);

  /**
   * Ensures a directory exists and is writable
   */
  async function ensureDirectory(dirPath: string): Promise<void> {
    try {
      await mkdir(dirPath, { recursive: true });
      console.log(`✅ Directory ready: ${resolve(dirPath)}`);
    } catch (error) {
      console.warn(`⚠️  Directory creation failed for ${dirPath}: ${error}`);
      // Don't throw - allow tests to continue and create directories as needed
    }
  }

  // Ensure essential directories exist
  await Promise.all([
    ensureDirectory('test-results'),
    ensureDirectory('test-results/screenshots'),
    ensureDirectory('test-results/traces'),
    ensureDirectory('test-results/videos'),
  ]);

  // Log parallel execution configuration
  console.log('🔧 Parallel Execution Configuration:');
  console.log(`   • Workers: ${workerCount}`);
  console.log(`   • Fully Parallel: ${config.fullyParallel ? 'Yes' : 'No'}`);
  console.log(`   • Retries: ${config.retries || 0}`);
  console.log(`   • Timeout: ${config.timeout || 30000}ms`);
  console.log(`   • Test Data: Worker-isolated with unique IDs`);

  console.log('✅ Global setup complete - Parallel tests ready to execute');
}

export default globalSetup;
