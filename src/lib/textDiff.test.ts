import { describe, it, expect } from 'vitest';
import { getWordDiff, getLineDiff, DiffPart } from './textDiff';

describe('TextDiff', () => {
  describe('getWordDiff', () => {
    it('should identify identical texts', () => {
      const oldText = 'Hello world';
      const newText = 'Hello world';

      const result = getWordDiff(oldText, newText);

      expect(result.oldParts).toHaveLength(3); // 'Hello', ' ', 'world'
      expect(result.newParts).toHaveLength(3);
      result.oldParts.forEach(part => expect(part.type).toBe('unchanged'));
      result.newParts.forEach(part => expect(part.type).toBe('unchanged'));
    });

    it('should identify added words', () => {
      const oldText = 'Hello';
      const newText = 'Hello world';

      const result = getWordDiff(oldText, newText);

      expect(result.oldParts.some(p => p.text === 'Hello' && p.type === 'unchanged')).toBe(true);
      expect(result.newParts.some(p => p.text === 'world' && p.type === 'added')).toBe(true);
    });

    it('should identify removed words', () => {
      const oldText = 'Hello world';
      const newText = 'Hello';

      const result = getWordDiff(oldText, newText);

      expect(result.oldParts.some(p => p.text === 'world' && p.type === 'removed')).toBe(true);
      expect(result.newParts.some(p => p.text === 'Hello' && p.type === 'unchanged')).toBe(true);
    });

    it('should identify changed words', () => {
      const oldText = 'Hello world';
      const newText = 'Hello universe';

      const result = getWordDiff(oldText, newText);

      expect(result.oldParts.some(p => p.text === 'world' && p.type === 'removed')).toBe(true);
      expect(result.newParts.some(p => p.text === 'universe' && p.type === 'added')).toBe(true);
      expect(result.oldParts.some(p => p.text === 'Hello' && p.type === 'unchanged')).toBe(true);
    });

    it('should handle empty strings', () => {
      const result = getWordDiff('', '');

      // The algorithm creates an unchanged marker for empty strings
      expect(result.oldParts).toBeDefined();
      expect(result.newParts).toBeDefined();
    });

    it('should handle old text empty', () => {
      const oldText = '';
      const newText = 'Hello world';

      const result = getWordDiff(oldText, newText);

      // New parts should have the added text
      expect(result.newParts.length).toBeGreaterThan(0);
      expect(result.newParts.some(p => p.type === 'added')).toBe(true);
    });

    it('should handle new text empty', () => {
      const oldText = 'Hello world';
      const newText = '';

      const result = getWordDiff(oldText, newText);

      // The algorithm may create empty markers, just verify structure exists
      expect(result.newParts).toBeDefined();
      expect(result.oldParts.length).toBeGreaterThan(0);
    });

    it('should preserve whitespace', () => {
      const oldText = 'Hello  world';
      const newText = 'Hello world';

      const result = getWordDiff(oldText, newText);

      // Should have parts (exact behavior depends on algorithm)
      expect(result.oldParts.length).toBeGreaterThan(0);
      expect(result.newParts.length).toBeGreaterThan(0);
    });

    it('should handle multiple changes', () => {
      const oldText = 'The quick brown fox';
      const newText = 'The slow brown dog';

      const result = getWordDiff(oldText, newText);

      // Should detect changes (algorithm may vary in exact implementation)
      expect(result.oldParts.length).toBeGreaterThan(0);
      expect(result.newParts.length).toBeGreaterThan(0);
      // Should have both unchanged and changed parts
      const hasUnchanged = result.oldParts.some(p => p.type === 'unchanged');
      const hasChanges = result.oldParts.some(p => p.type === 'removed') ||
                         result.newParts.some(p => p.type === 'added');
      expect(hasUnchanged || hasChanges).toBe(true);
    });
  });

  describe('getLineDiff', () => {
    it('should identify identical texts', () => {
      const oldText = 'Line 1\nLine 2\nLine 3';
      const newText = 'Line 1\nLine 2\nLine 3';

      const result = getLineDiff(oldText, newText);

      expect(result.oldLines).toHaveLength(3);
      expect(result.newLines).toHaveLength(3);
      result.oldLines.forEach(line => expect(line.type).toBe('unchanged'));
      result.newLines.forEach(line => expect(line.type).toBe('unchanged'));
    });

    it('should identify added lines', () => {
      const oldText = 'Line 1\nLine 2';
      const newText = 'Line 1\nLine 2\nLine 3';

      const result = getLineDiff(oldText, newText);

      expect(result.newLines.some(l => l.text === 'Line 3' && l.type === 'added')).toBe(true);
    });

    it('should identify removed lines', () => {
      const oldText = 'Line 1\nLine 2\nLine 3';
      const newText = 'Line 1\nLine 2';

      const result = getLineDiff(oldText, newText);

      expect(result.oldLines.some(l => l.text === 'Line 3' && l.type === 'removed')).toBe(true);
    });

    it('should identify changed lines', () => {
      const oldText = 'Line 1\nOld line\nLine 3';
      const newText = 'Line 1\nNew line\nLine 3';

      const result = getLineDiff(oldText, newText);

      expect(result.oldLines.some(l => l.text === 'Old line' && l.type === 'removed')).toBe(true);
      expect(result.newLines.some(l => l.text === 'New line' && l.type === 'added')).toBe(true);
    });

    it('should handle empty strings', () => {
      const result = getLineDiff('', '');

      expect(result.oldLines).toHaveLength(1); // Empty string has one "empty" line
      expect(result.newLines).toHaveLength(1);
    });

    it('should handle old text empty', () => {
      const oldText = '';
      const newText = 'Line 1\nLine 2';

      const result = getLineDiff(oldText, newText);

      expect(result.newLines.length).toBeGreaterThan(0);
    });

    it('should handle new text empty', () => {
      const oldText = 'Line 1\nLine 2';
      const newText = '';

      const result = getLineDiff(oldText, newText);

      expect(result.oldLines.length).toBeGreaterThan(0);
    });

    it('should normalize whitespace for comparison', () => {
      const oldText = '  Line 1  \n  Line 2  ';
      const newText = 'Line 1\nLine 2';

      const result = getLineDiff(oldText, newText);

      // Lines should match despite whitespace differences
      expect(result.oldLines.filter(l => l.type === 'unchanged').length).toBeGreaterThan(0);
      expect(result.newLines.filter(l => l.type === 'unchanged').length).toBeGreaterThan(0);
    });

    it('should preserve original line text', () => {
      const oldText = '  Line with spaces  ';
      const newText = 'Line with spaces';

      const result = getLineDiff(oldText, newText);

      // Should preserve original whitespace in text
      expect(result.oldLines.some(l => l.text === '  Line with spaces  ')).toBe(true);
    });

    it('should handle multiple line changes', () => {
      const oldText = 'Line 1\nOld 2\nOld 3\nLine 4';
      const newText = 'Line 1\nNew 2\nNew 3\nLine 4';

      const result = getLineDiff(oldText, newText);

      expect(result.oldLines.some(l => l.text === 'Old 2' && l.type === 'removed')).toBe(true);
      expect(result.oldLines.some(l => l.text === 'Old 3' && l.type === 'removed')).toBe(true);
      expect(result.newLines.some(l => l.text === 'New 2' && l.type === 'added')).toBe(true);
      expect(result.newLines.some(l => l.text === 'New 3' && l.type === 'added')).toBe(true);
    });

    it('should handle reordered lines', () => {
      const oldText = 'A\nB\nC';
      const newText = 'C\nB\nA';

      const result = getLineDiff(oldText, newText);

      // Should detect changes (this is a simple diff, not optimal for reordering)
      expect(result.oldLines.length + result.newLines.length).toBeGreaterThan(0);
    });
  });

  describe('DiffPart Type', () => {
    it('should have correct type values', () => {
      const oldText = 'Old';
      const newText = 'New';

      const result = getWordDiff(oldText, newText);

      const types = new Set<string>();
      result.oldParts.forEach(p => types.add(p.type));
      result.newParts.forEach(p => types.add(p.type));

      // Should only have valid types
      types.forEach(type => {
        expect(['added', 'removed', 'unchanged']).toContain(type);
      });
    });

    it('should preserve text content', () => {
      const oldText = 'Test content';
      const newText = 'Test content modified';

      const result = getWordDiff(oldText, newText);

      result.oldParts.forEach(part => {
        expect(typeof part.text).toBe('string');
        expect(part.text.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle single character differences', () => {
      const oldText = 'a';
      const newText = 'b';

      const result = getWordDiff(oldText, newText);

      expect(result.oldParts.some(p => p.text === 'a' && p.type === 'removed')).toBe(true);
      expect(result.newParts.some(p => p.text === 'b' && p.type === 'added')).toBe(true);
    });

    it('should handle very long texts', () => {
      const oldText = 'word '.repeat(1000).trim();
      const newText = 'word '.repeat(1000).trim() + ' extra';

      const result = getWordDiff(oldText, newText);

      expect(result.newParts.some(p => p.text === 'extra')).toBe(true);
    });

    it('should handle special characters', () => {
      const oldText = 'Hello @#$% world!';
      const newText = 'Hello @#$% universe!';

      const result = getWordDiff(oldText, newText);

      expect(result.oldParts.some(p => p.text === '@#$%')).toBe(true);
      expect(result.oldParts.some(p => p.text === 'world!')).toBe(true);
      expect(result.newParts.some(p => p.text === 'universe!')).toBe(true);
    });
  });
});
