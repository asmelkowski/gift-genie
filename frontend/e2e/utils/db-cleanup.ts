/**
 * Database Cleanup Utility
 * Handles cleanup of test data after e2e tests
 * Works with both local and CI database environments
 */

import { TestUserData, TestDataFactory } from './test-data-factory';
import { TestHelpers } from './test-helpers';
import { ParallelExecutionHelpers } from './parallel-execution-helpers';

interface Group {
  id: string;
  name: string;
}

interface Draw {
  id: string;
}

interface Exclusion {
  id: string;
}

export interface CleanupOptions {
  userData?: TestUserData;
  skipUserCleanup?: boolean;
  skipGroupCleanup?: boolean;
  skipDrawCleanup?: boolean;
  skipExclusionCleanup?: boolean;
}

/**
 * Database Cleanup Utility for e2e tests
 * Handles cleanup of test data including users, groups, draws, and exclusions
 */
export class DatabaseCleanup {
  private static readonly API_BASE_URL = TestHelpers.isCI()
    ? 'http://backend:8000'
    : 'http://localhost:8000';

  private static readonly CLEANUP_TIMEOUT = 30000;

  // Static mutex to prevent concurrent cleanup operations
  private static cleanupMutex = new Set<string>();

  /**
   * Cleans up all test data for a specific user
   * Uses API endpoints to delete related data
   * Thread-safe with mutex to prevent race conditions in parallel execution
   */
  static async cleanupTestData(
    userData: TestUserData,
    options: CleanupOptions = {}
  ): Promise<void> {
    const {
      skipUserCleanup = false,
      skipGroupCleanup = false,
      skipDrawCleanup = false,
      skipExclusionCleanup = false,
    } = options;

    const logPrefix = ParallelExecutionHelpers.getLogPrefix();
    const mutexKey = `${userData.email}-${TestDataFactory.getWorkerId()}`;

    console.log(`${logPrefix} 🧹 Starting database cleanup...`);
    console.log(`${logPrefix}    👤 User: ${userData.email}`);
    console.log(`${logPrefix}    🏷️  Test ID: ${userData.testId}`);

    // Prevent concurrent cleanup for the same user
    if (this.cleanupMutex.has(mutexKey)) {
      console.log(`${logPrefix} 🔒 Cleanup already in progress for ${userData.email}, skipping`);
      return;
    }

    this.cleanupMutex.add(mutexKey);

    try {
      // First authenticate to get access token with retry logic
      const accessToken = await this.authenticateUserWithRetry(userData);

      if (!accessToken) {
        console.warn(
          `${logPrefix} ⚠️  Could not authenticate for cleanup, skipping API-based cleanup`
        );
        return;
      }

      // Clean up in reverse dependency order with error resilience
      const cleanupPromises = [];

      if (!skipDrawCleanup) {
        cleanupPromises.push(
          this.cleanupDraws(accessToken).catch(error => {
            console.error(`${logPrefix} ❌ Draws cleanup failed:`, error);
          })
        );
      }

      if (!skipExclusionCleanup) {
        cleanupPromises.push(
          this.cleanupExclusions(accessToken).catch(error => {
            console.error(`${logPrefix} ❌ Exclusions cleanup failed:`, error);
          })
        );
      }

      if (!skipGroupCleanup) {
        cleanupPromises.push(
          this.cleanupGroups(accessToken).catch(error => {
            console.error(`${logPrefix} ❌ Groups cleanup failed:`, error);
          })
        );
      }

      // Wait for all cleanup operations to complete
      await Promise.all(cleanupPromises);

      // Note: User cleanup is not implemented as there's no user delete API
      // Users persist between test runs in CI environment
      if (!skipUserCleanup) {
        console.log(
          `${logPrefix} ℹ️  User cleanup not available via API - users persist between tests`
        );
      }

      console.log(`${logPrefix} ✅ Database cleanup completed`);
    } catch (error) {
      console.error(`${logPrefix} ❌ Database cleanup failed:`, error);
      // Don't throw - cleanup failures shouldn't break tests
    } finally {
      // Always release the mutex
      this.cleanupMutex.delete(mutexKey);
    }
  }

  /**
   * Authenticates a user and returns access token with retry logic
   */
  private static async authenticateUserWithRetry(
    userData: TestUserData,
    maxRetries: number = 3
  ): Promise<string | null> {
    const logPrefix = ParallelExecutionHelpers.getLogPrefix();

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `${logPrefix} 🔐 Authenticating for cleanup (attempt ${attempt}/${maxRetries})...`
        );

        const response = await fetch(`${this.API_BASE_URL}/api/v1/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: userData.email,
            password: userData.password,
          }),
        });

        if (!response.ok) {
          if (response.status === 429) {
            // Rate limited, wait and retry
            console.warn(
              `${logPrefix} ⚠️  Rate limited (attempt ${attempt}), waiting before retry...`
            );
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
            continue;
          }

          if (attempt === maxRetries) {
            console.warn(
              `${logPrefix} ⚠️  Authentication failed: ${response.status} ${response.statusText}`
            );
            return null;
          }

          // Wait before retry for other errors
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
          continue;
        }

        const data = await response.json();
        const accessToken = data.access_token;

        if (!accessToken) {
          console.warn(`${logPrefix} ⚠️  No access token in response`);
          return null;
        }

        console.log(`${logPrefix} ✅ Authenticated for cleanup`);
        return accessToken;
      } catch (error) {
        if (attempt === maxRetries) {
          console.error(
            `${logPrefix} ❌ Authentication failed after ${maxRetries} attempts:`,
            error
          );
          return null;
        }

        console.log(`${logPrefix} ⚠️  Authentication attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }

    return null;
  }

  /**
   * Legacy method for backward compatibility
   */
  private static async authenticateUser(userData: TestUserData): Promise<string | null> {
    return this.authenticateUserWithRetry(userData);
  }

  /**
   * Cleans up all draws for the authenticated user
   */
  private static async cleanupDraws(accessToken: string): Promise<void> {
    try {
      console.log('🎯 Cleaning up draws...');

      // Get all groups first
      const groups = await this.getUserGroups(accessToken);

      for (const group of groups) {
        const draws = await this.getGroupDraws(accessToken, group.id);

        for (const draw of draws) {
          await this.deleteDraw(accessToken, draw.id);
        }
      }

      console.log('✅ Draws cleanup completed');
    } catch (error) {
      console.error('❌ Draws cleanup failed:', error);
    }
  }

  /**
   * Cleans up all exclusions for the authenticated user
   */
  private static async cleanupExclusions(accessToken: string): Promise<void> {
    try {
      console.log('🚫 Cleaning up exclusions...');

      // Get all groups first
      const groups = await this.getUserGroups(accessToken);

      for (const group of groups) {
        const exclusions = await this.getGroupExclusions(accessToken, group.id);

        for (const exclusion of exclusions) {
          await this.deleteExclusion(accessToken, exclusion.id);
        }
      }

      console.log('✅ Exclusions cleanup completed');
    } catch (error) {
      console.error('❌ Exclusions cleanup failed:', error);
    }
  }

  /**
   * Cleans up all groups for the authenticated user
   */
  private static async cleanupGroups(accessToken: string): Promise<void> {
    try {
      console.log('👥 Cleaning up groups...');

      const groups = await this.getUserGroups(accessToken);

      for (const group of groups) {
        await this.deleteGroup(accessToken, group.id);
      }

      console.log('✅ Groups cleanup completed');
    } catch (error) {
      console.error('❌ Groups cleanup failed:', error);
    }
  }

  /**
   * Gets all groups for the authenticated user
   */
  private static async getUserGroups(accessToken: string): Promise<Group[]> {
    const response = await this.apiRequest(`${this.API_BASE_URL}/api/v1/groups`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    return data.groups || [];
  }

  /**
   * Gets all draws for a specific group
   */
  private static async getGroupDraws(accessToken: string, groupId: string): Promise<Draw[]> {
    const response = await this.apiRequest(`${this.API_BASE_URL}/api/v1/groups/${groupId}/draws`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();
    return data.draws || [];
  }

  /**
   * Gets all exclusions for a specific group
   */
  private static async getGroupExclusions(
    accessToken: string,
    groupId: string
  ): Promise<Exclusion[]> {
    const response = await this.apiRequest(
      `${this.API_BASE_URL}/api/v1/groups/${groupId}/exclusions`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    return data.exclusions || [];
  }

  /**
   * Deletes a specific draw
   */
  private static async deleteDraw(accessToken: string, drawId: string): Promise<void> {
    await this.apiRequest(`${this.API_BASE_URL}/api/v1/draws/${drawId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  /**
   * Deletes a specific exclusion
   */
  private static async deleteExclusion(accessToken: string, exclusionId: string): Promise<void> {
    await this.apiRequest(`${this.API_BASE_URL}/api/v1/exclusions/${exclusionId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  /**
   * Deletes a specific group
   */
  private static async deleteGroup(accessToken: string, groupId: string): Promise<void> {
    await this.apiRequest(`${this.API_BASE_URL}/api/v1/groups/${groupId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  }

  /**
   * Makes an API request with error handling
   */
  private static async apiRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.CLEANUP_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`API request timeout: ${url}`);
      }

      throw error;
    }
  }

  /**
   * Performs a full cleanup for CI environment
   * More aggressive cleanup for shared test environments
   */
  static async cleanupCIEnvironment(): Promise<void> {
    if (!TestHelpers.isCI()) {
      console.log('ℹ️  CI cleanup skipped - not in CI environment');
      return;
    }

    console.log('🏭 Performing CI environment cleanup...');

    try {
      // In CI, we might want to clean up all test data
      // This is more aggressive and should be used carefully
      console.log('ℹ️  CI cleanup completed (no-op for now)');
    } catch (error) {
      console.error('❌ CI environment cleanup failed:', error);
    }
  }

  /**
   * Validates that cleanup was successful
   */
  static async validateCleanup(userData: TestUserData): Promise<boolean> {
    try {
      console.log('🔍 Validating cleanup...');

      const accessToken = await this.authenticateUser(userData);
      if (!accessToken) {
        console.warn('⚠️  Could not authenticate for validation');
        return false;
      }

      const groups = await this.getUserGroups(accessToken);
      const hasTestData = groups.some(
        group => group.name.includes('Test Group') || group.name.includes(userData.testId)
      );

      if (hasTestData) {
        console.warn('⚠️  Test data still exists after cleanup');
        return false;
      }

      console.log('✅ Cleanup validation passed');
      return true;
    } catch (error) {
      console.error('❌ Cleanup validation failed:', error);
      return false;
    }
  }
}
