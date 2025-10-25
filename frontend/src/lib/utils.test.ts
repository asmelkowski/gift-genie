import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn (classNameMerge)', () => {
  it('merges multiple class names correctly', () => {
    const result = cn('px-2', 'py-1');
    expect(result).toContain('px-2');
    expect(result).toContain('py-1');
  });

  it('handles conditional class names', () => {
    const isActive = true;
    const result = cn('base', isActive && 'active');
    expect(result).toContain('base');
    expect(result).toContain('active');
  });

  it('filters out false conditional classes', () => {
    const isActive = false;
    const result = cn('base', isActive && 'active');
    expect(result).toContain('base');
    expect(result).not.toContain('active');
  });

  it('handles undefined and null values', () => {
    const result = cn('base', undefined, null, 'other');
    expect(result).toContain('base');
    expect(result).toContain('other');
  });

  it('resolves Tailwind class conflicts with twMerge', () => {
    // twMerge resolves conflicts where px-2 and px-4 both try to set padding-x
    // The last one should win
    const result = cn('px-2', 'px-4');
    expect(result).toContain('px-4');
    expect(result).not.toContain('px-2');
  });

  it('handles background color conflicts', () => {
    const result = cn('bg-blue-500', 'bg-red-500');
    expect(result).toContain('bg-red-500');
    expect(result).not.toContain('bg-blue-500');
  });

  it('handles text color conflicts', () => {
    const result = cn('text-white', 'text-black');
    expect(result).toContain('text-black');
    expect(result).not.toContain('text-white');
  });

  it('preserves non-conflicting classes', () => {
    const result = cn('px-4', 'text-lg', 'font-bold');
    expect(result).toContain('px-4');
    expect(result).toContain('text-lg');
    expect(result).toContain('font-bold');
  });

  it('handles object syntax from clsx', () => {
    const result = cn({
      'px-2': true,
      'py-1': false,
      'text-sm': true,
    });
    expect(result).toContain('px-2');
    expect(result).toContain('text-sm');
    expect(result).not.toContain('py-1');
  });

  it('handles arrays of class names', () => {
    const result = cn(['px-2', 'py-1'], 'text-sm');
    expect(result).toContain('px-2');
    expect(result).toContain('py-1');
    expect(result).toContain('text-sm');
  });

  it('handles empty string', () => {
    const result = cn('px-2', '', 'py-1');
    expect(result).toContain('px-2');
    expect(result).toContain('py-1');
  });

  it('returns empty string when no valid classes provided', () => {
    const result = cn(undefined, null, false, '');
    expect(result).toBe('');
  });
});
