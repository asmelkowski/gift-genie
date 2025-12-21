import { describe, it, expect } from 'vitest';
import { GROUP_OPERATIONS, groupOperationsByCategory } from './groupOperations';

describe('groupOperations', () => {
  describe('GROUP_OPERATIONS', () => {
    it('should have a valid structure for all operations', () => {
      for (const op of GROUP_OPERATIONS) {
        expect(op).toHaveProperty('code');
        expect(op).toHaveProperty('label');
        expect(op).toHaveProperty('category');
        expect(op).toHaveProperty('description');
        expect(typeof op.code).toBe('string');
        expect(typeof op.label).toBe('string');
        expect(typeof op.category).toBe('string');
        expect(typeof op.description).toBe('string');
      }
    });

    it('should have unique operation codes', () => {
      const codes = GROUP_OPERATIONS.map((op) => op.code);
      const uniqueCodes = new Set(codes);
      expect(codes.length).toBe(uniqueCodes.size);
    });

    it('should have draws:notify marked as privileged', () => {
      const notifyOp = GROUP_OPERATIONS.find((op) => op.code === 'draws:notify');
      expect(notifyOp).toBeDefined();
      expect(notifyOp?.privileged).toBe(true);
    });

    it('should not have non-privileged operations with privileged flag', () => {
      const nonPrivileged = GROUP_OPERATIONS.filter((op) => op.code !== 'draws:notify');
      for (const op of nonPrivileged) {
        expect(op.privileged).toBeUndefined();
      }
    });

    it('should have operations in multiple categories', () => {
      const categories = new Set(GROUP_OPERATIONS.map((op) => op.category));
      expect(categories.size).toBeGreaterThan(1);
    });
  });

  describe('groupOperationsByCategory', () => {
    it('should return a Map', () => {
      const result = groupOperationsByCategory();
      expect(result).toBeInstanceOf(Map);
    });

    it('should group all operations by category', () => {
      const result = groupOperationsByCategory();
      const allOps = Array.from(result.values()).flat();
      expect(allOps.length).toBe(GROUP_OPERATIONS.length);
    });

    it('should have all category keys present', () => {
      const result = groupOperationsByCategory();
      const expectedCategories = new Set(GROUP_OPERATIONS.map((op) => op.category));
      expect(result.size).toBe(expectedCategories.size);
      for (const category of expectedCategories) {
        expect(result.has(category)).toBe(true);
      }
    });

    it('should maintain operation data integrity', () => {
      const result = groupOperationsByCategory();
      for (const ops of result.values()) {
        for (const op of ops) {
          const originalOp = GROUP_OPERATIONS.find((o) => o.code === op.code);
          expect(op).toEqual(originalOp);
        }
      }
    });

    it('should have specific categories', () => {
      const result = groupOperationsByCategory();
      const categories = Array.from(result.keys());
      expect(categories).toContain('Group Management');
      expect(categories).toContain('Member Management');
      expect(categories).toContain('Draw Management');
      expect(categories).toContain('Exclusion Management');
    });

    it('should have correct number of operations per category', () => {
      const result = groupOperationsByCategory();
      expect(result.get('Group Management')?.length).toBe(3);
      expect(result.get('Member Management')?.length).toBe(4);
      expect(result.get('Draw Management')?.length).toBe(5);
      expect(result.get('Exclusion Management')?.length).toBe(3);
    });
  });
});
