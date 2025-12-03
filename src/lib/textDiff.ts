/**
 * Simple text diff utility for highlighting changes between two strings
 */

export interface DiffPart {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

/**
 * Calculate diff between two texts at word level
 */
export function getWordDiff(oldText: string, newText: string): { oldParts: DiffPart[]; newParts: DiffPart[] } {
  const oldWords = oldText.split(/(\s+)/);
  const newWords = newText.split(/(\s+)/);

  const oldParts: DiffPart[] = [];
  const newParts: DiffPart[] = [];

  // Simple LCS-based diff
  const lcs = longestCommonSubsequence(oldWords, newWords);

  let oldIdx = 0;
  let newIdx = 0;
  let lcsIdx = 0;

  while (oldIdx < oldWords.length || newIdx < newWords.length) {
    if (lcsIdx < lcs.length && oldIdx < oldWords.length && oldWords[oldIdx] === lcs[lcsIdx]) {
      // Common word
      oldParts.push({ type: 'unchanged', text: oldWords[oldIdx] });
      newParts.push({ type: 'unchanged', text: newWords[newIdx] });
      oldIdx++;
      newIdx++;
      lcsIdx++;
    } else if (oldIdx < oldWords.length && (lcsIdx >= lcs.length || oldWords[oldIdx] !== lcs[lcsIdx])) {
      // Removed word
      oldParts.push({ type: 'removed', text: oldWords[oldIdx] });
      oldIdx++;
    } else if (newIdx < newWords.length && (lcsIdx >= lcs.length || newWords[newIdx] !== lcs[lcsIdx])) {
      // Added word
      newParts.push({ type: 'added', text: newWords[newIdx] });
      newIdx++;
    }
  }

  return { oldParts, newParts };
}

/**
 * Calculate diff between two texts at line level
 */
export function getLineDiff(oldText: string, newText: string): { oldLines: DiffPart[]; newLines: DiffPart[] } {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');

  // Normalize lines for comparison (trim whitespace) but keep original for display
  const normalizedOld = oldLines.map(line => line.trim());
  const normalizedNew = newLines.map(line => line.trim());

  const oldParts: DiffPart[] = [];
  const newParts: DiffPart[] = [];

  // Simple diff using a more flexible approach
  let oldIdx = 0;
  let newIdx = 0;

  while (oldIdx < oldLines.length || newIdx < newLines.length) {
    // If both lines exist and match (normalized), they're unchanged
    if (oldIdx < oldLines.length && newIdx < newLines.length &&
        normalizedOld[oldIdx] === normalizedNew[newIdx]) {
      oldParts.push({ type: 'unchanged', text: oldLines[oldIdx] });
      newParts.push({ type: 'unchanged', text: newLines[newIdx] });
      oldIdx++;
      newIdx++;
    }
    // Try to find if current old line exists further in new lines
    else if (oldIdx < oldLines.length) {
      const matchInNew = normalizedNew.slice(newIdx, newIdx + 5).findIndex(
        line => line === normalizedOld[oldIdx]
      );

      if (matchInNew >= 0) {
        // Found a match ahead, mark intermediate as added
        for (let i = 0; i < matchInNew; i++) {
          newParts.push({ type: 'added', text: newLines[newIdx + i] });
        }
        newIdx += matchInNew;
      } else {
        // Not found, mark as removed
        oldParts.push({ type: 'removed', text: oldLines[oldIdx] });
        oldIdx++;
      }
    }
    // Only new lines remaining
    else if (newIdx < newLines.length) {
      newParts.push({ type: 'added', text: newLines[newIdx] });
      newIdx++;
    }
  }

  return { oldLines: oldParts, newLines: newParts };
}

/**
 * Longest Common Subsequence algorithm
 */
function longestCommonSubsequence<T>(arr1: T[], arr2: T[]): T[] {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find the LCS
  const lcs: T[] = [];
  let i = m;
  let j = n;

  while (i > 0 && j > 0) {
    if (arr1[i - 1] === arr2[j - 1]) {
      lcs.unshift(arr1[i - 1]);
      i--;
      j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}
