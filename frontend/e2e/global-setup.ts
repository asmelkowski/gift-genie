import { FullConfig } from '@playwright/test';
import { mkdir, access, constants, stat } from 'fs/promises';
import { resolve, dirname } from 'path';

/**
 * Global setup that runs once before all E2E tests
 * Only handles environment preparation (directories, basic setup)
 * User registration and login are now handled by 01-auth-setup.spec.ts
 */
async function globalSetup(config: FullConfig) {
  const { baseURL } = config.projects[0].use;
  const isCI = !!process.env.CI;

  console.log('='.repeat(80));
  console.log('🚀 Starting E2E Global Setup');
  console.log('='.repeat(80));

  // Log comprehensive environment information
  console.log(`📍 Environment: ${isCI ? 'CI' : 'Local'}`);
  console.log(`📍 Base URL: ${baseURL}`);
  console.log(`📍 Timestamp: ${new Date().toISOString()}`);
  console.log(`📍 Node Version: ${process.version}`);
  console.log(`📍 Platform: ${process.platform} (${process.arch})`);
  console.log(`📍 Current Working Directory: ${process.cwd()}`);
  console.log(`📍 Process ID: ${process.pid}`);

  if (isCI) {
    console.log(`📍 CI Provider: ${process.env.GITHUB_ACTIONS ? 'GitHub Actions' : 'Unknown'}`);
    console.log(`📍 GitHub SHA: ${process.env.GITHUB_SHA || 'N/A'}`);
    console.log(`📍 GitHub Run ID: ${process.env.GITHUB_RUN_ID || 'N/A'}`);
  }

  console.log('='.repeat(80));

  /**
   * Ensures a directory exists and is writable
   */
  async function ensureDirectory(dirPath: string, description: string): Promise<void> {
    const absolutePath = resolve(dirPath);

    try {
      // Try to create directory with recursive option first
      await mkdir(absolutePath, { recursive: true });
      console.log(`   📁 Directory created/ensured: ${absolutePath}`);
    } catch (error) {
      // If creation fails, check parent directory permissions for better error message
      const parentDir = dirname(absolutePath);
      try {
        await access(parentDir, constants.R_OK | constants.W_OK);
        console.log(`   ✅ Parent directory accessible: ${parentDir}`);
      } catch (parentError) {
        throw new Error(
          `Parent directory not accessible: ${parentDir}. Original error: ${error}. Parent access error: ${parentError}`
        );
      }
      throw new Error(
        `Failed to create ${description} directory: ${absolutePath}. Error: ${error}`
      );
    }

    try {
      // Verify directory exists and is writable
      const stats = await stat(absolutePath);
      if (!stats.isDirectory()) {
        throw new Error(`${absolutePath} exists but is not a directory`);
      }

      // Test write permissions
      await access(absolutePath, constants.W_OK);

      console.log(`   ✅ Directory verified writable: ${absolutePath}`);
      console.log(`   📊 Directory permissions: ${stats.mode.toString(8)}`);
      console.log(`   📊 Directory owner: ${stats.uid}:${stats.gid}`);

      if (isCI) {
        console.log(`   🔍 CI Debug - Directory details:`);
        console.log(`      Path: ${absolutePath}`);
        console.log(`      Size: ${stats.size} bytes`);
        console.log(`      Modified: ${stats.mtime.toISOString()}`);
        console.log(`      Created: ${stats.birthtime?.toISOString() || 'N/A'}`);
      }
    } catch (error) {
      throw new Error(
        `Directory verification failed for ${description}: ${absolutePath}. Error: ${error}`
      );
    }
  }

  // Ensure screenshot directory exists and is writable
  const screenshotDir = 'test-results/screenshots';
  try {
    await ensureDirectory(screenshotDir, 'screenshot');
    console.log(`   🎯 Screenshot directory ready: ${resolve(screenshotDir)}`);
  } catch (error) {
    console.error(`   ❌ Screenshot directory setup failed: ${error}`);
    throw error; // Re-throw to fail the setup
  }

  // Ensure playwright auth directory exists and is writable
  const authDir = 'playwright/.auth';
  try {
    await ensureDirectory(authDir, 'auth');
    console.log(`   🔐 Auth directory ready: ${resolve(authDir)}`);
  } catch (error) {
    console.error(`   ❌ Auth directory setup failed: ${error}`);
    throw error; // Re-throw to fail the setup
  }

  console.log('='.repeat(80));
  console.log('✅ Environment preparation complete');
  console.log('ℹ️  User authentication will be handled by 01-auth-setup.spec.ts');
  console.log('='.repeat(80));
}

export default globalSetup;
