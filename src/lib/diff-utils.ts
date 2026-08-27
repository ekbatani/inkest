export type DiffChangeType = "added" | "removed" | "unchanged";

export type DiffLine = {
  type: DiffChangeType;
  value: string;
  oldLineNumber?: number;
  newLineNumber?: number;
};

/**
 * Computes a simple line-by-line Myers-style or dynamic programming diff
 * between originalText and newText.
 */
export function computeLineDiff(originalText: string, newText: string): DiffLine[] {
  const origLines = (originalText ?? "").split("\n");
  const newLines = (newText ?? "").split("\n");

  const m = origLines.length;
  const n = newLines.length;

  // Longest common subsequence matrix
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0),
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (origLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to build diff lines
  const result: DiffLine[] = [];
  let i = m;
  let j = n;

  const rawDiff: { type: DiffChangeType; value: string; oldLine?: number; newLine?: number }[] = [];

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && origLines[i - 1] === newLines[j - 1]) {
      rawDiff.push({
        type: "unchanged",
        value: origLines[i - 1],
        oldLine: i,
        newLine: j,
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.push({
        type: "added",
        value: newLines[j - 1],
        newLine: j,
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      rawDiff.push({
        type: "removed",
        value: origLines[i - 1],
        oldLine: i,
      });
      i--;
    }
  }

  rawDiff.reverse();

  for (const item of rawDiff) {
    result.push({
      type: item.type,
      value: item.value,
      oldLineNumber: item.oldLine,
      newLineNumber: item.newLine,
    });
  }

  return result;
}

/**
 * Returns summary stats of a computed diff.
 */
export function getDiffStats(diff: DiffLine[]): { additions: number; deletions: number; unchanged: number } {
  let additions = 0;
  let deletions = 0;
  let unchanged = 0;

  for (const line of diff) {
    if (line.type === "added") additions++;
    else if (line.type === "removed") deletions++;
    else unchanged++;
  }

  return { additions, deletions, unchanged };
}
