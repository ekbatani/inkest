import { z } from "zod";

/**
 * Strips reasoning / thought tags returned by reasoning models
 * (e.g. DeepSeek R1, Qwen, Ollama, OpenAI reasoning models, etc.).
 */
export function stripReasoningTags(raw: string): string {
  if (!raw) return "";

  let cleaned = raw;

  // Strip complete reasoning blocks: <think>...</think>, <thought>...</thought>, etc.
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");
  cleaned = cleaned.replace(/<thought>[\s\S]*?<\/thought>/gi, "");
  cleaned = cleaned.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "");
  cleaned = cleaned.replace(/<reflection>[\s\S]*?<\/reflection>/gi, "");

  // Strip fenced thought blocks: ```thought ... ```
  cleaned = cleaned.replace(/```(?:thought|reasoning|thinking)[\s\S]*?```/gi, "");

  // If there's an unclosed leading <think> (e.g. truncated output)
  cleaned = cleaned.replace(/^<think>[\s\S]*?(?=\{|\n\n)/i, "");

  return cleaned.trim();
}

/**
 * Extracts balanced JSON substrings (both objects {...} and arrays [...])
 * scanning through characters while properly respecting string literals and escapes.
 */
export function extractBalancedJsonBlocks(text: string): string[] {
  const blocks: string[] = [];
  const chars = text;
  const len = chars.length;

  for (let i = 0; i < len; i++) {
    const startChar = chars[i];
    if (startChar !== "{" && startChar !== "[") continue;

    const closeChar = startChar === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let isEscaped = false;
    const startIndex = i;

    for (let j = i; j < len; j++) {
      const c = chars[j];

      if (inString) {
        if (isEscaped) {
          isEscaped = false;
        } else if (c === "\\") {
          isEscaped = true;
        } else if (c === '"') {
          inString = false;
        }
        continue;
      }

      if (c === '"') {
        inString = true;
        continue;
      }

      if (c === startChar) {
        depth++;
      } else if (c === closeChar) {
        depth--;
        if (depth === 0) {
          blocks.push(chars.slice(startIndex, j + 1));
          i = j; // Advance outer loop past this block
          break;
        }
      }
    }
  }

  return blocks;
}

/**
 * Extracts potential JSON candidates from a raw LLM output string
 * in order of priority (fenced code blocks, balanced blocks, trimmed raw).
 */
export function extractJsonCandidates(raw: string): string[] {
  const cleaned = stripReasoningTags(raw);
  if (!cleaned) return [];

  const candidates: string[] = [];
  const seen = new Set<string>();

  const addCandidate = (candidate: string) => {
    const trimmed = candidate.trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      candidates.push(trimmed);
    }
  };

  // 1. Fenced code blocks: ```json ... ``` or ``` ... ```
  const fenceRegex = /```(?:json|json5|javascript|js)?\s*([\s\S]*?)```/gi;
  let match: RegExpExecArray | null;
  while ((match = fenceRegex.exec(cleaned)) !== null) {
    if (match[1]) {
      addCandidate(match[1]);
    }
  }

  // 2. Balanced JSON blocks (both objects and arrays)
  const balancedBlocks = extractBalancedJsonBlocks(cleaned);
  for (const block of balancedBlocks) {
    addCandidate(block);
  }

  // 3. Fallback: Entire cleaned string
  addCandidate(cleaned);

  return candidates;
}

/**
 * Repairs unescaped newlines and control characters inside double-quoted string literals.
 */
function repairStringLiterals(jsonStr: string): string {
  let result = "";
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const c = jsonStr[i];

    if (inString) {
      if (isEscaped) {
        result += c;
        isEscaped = false;
        continue;
      }

      if (c === "\\") {
        isEscaped = true;
        result += c;
        continue;
      }

      if (c === '"') {
        inString = false;
        result += c;
        continue;
      }

      // Escape raw literal newlines, carriage returns, and tabs inside JSON string values
      if (c === "\n") {
        result += "\\n";
      } else if (c === "\r") {
        result += "\\r";
      } else if (c === "\t") {
        result += "\\t";
      } else {
        const code = c.charCodeAt(0);
        if (code < 0x20) {
          result += `\\u${code.toString(16).padStart(4, "0")}`;
        } else {
          result += c;
        }
      }
    } else {
      if (c === '"') {
        inString = true;
      }
      result += c;
    }
  }

  return result;
}

/**
 * Strips comments outside of string literals.
 */
function stripComments(jsonStr: string): string {
  let result = "";
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const c = jsonStr[i];
    const next = jsonStr[i + 1];

    if (inString) {
      result += c;
      if (isEscaped) {
        isEscaped = false;
      } else if (c === "\\") {
        isEscaped = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c === '"') {
      inString = true;
      result += c;
      continue;
    }

    // Line comment: //
    if (c === "/" && next === "/") {
      const nextNewline = jsonStr.indexOf("\n", i + 2);
      if (nextNewline === -1) {
        break;
      }
      i = nextNewline;
      result += "\n";
      continue;
    }

    // Block comment: /* ... */
    if (c === "/" && next === "*") {
      const closeComment = jsonStr.indexOf("*/", i + 2);
      if (closeComment === -1) {
        break;
      }
      i = closeComment + 1;
      continue;
    }

    result += c;
  }

  return result;
}

/**
 * Fixes trailing commas before closing braces/brackets outside of strings.
 */
function stripTrailingCommas(jsonStr: string): string {
  let result = "";
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < jsonStr.length; i++) {
    const c = jsonStr[i];

    if (inString) {
      result += c;
      if (isEscaped) {
        isEscaped = false;
      } else if (c === "\\") {
        isEscaped = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c === '"') {
      inString = true;
      result += c;
      continue;
    }

    if (c === ",") {
      // Look ahead to check if next non-whitespace char is closing bracket/brace
      let nextNonWhitespace = "";
      for (let j = i + 1; j < jsonStr.length; j++) {
        const nextChar = jsonStr[j];
        if (!/\s/.test(nextChar)) {
          nextNonWhitespace = nextChar;
          break;
        }
      }
      if (nextNonWhitespace === "}" || nextNonWhitespace === "]") {
        // Skip trailing comma
        continue;
      }
    }

    result += c;
  }

  return result;
}

/**
 * Normalizes Python/JS literals (True, False, None, undefined) to JSON equivalents.
 */
function normalizeLiterals(jsonStr: string): string {
  return jsonStr
    .replace(/:\s*True\b/g, ": true")
    .replace(/:\s*False\b/g, ": false")
    .replace(/:\s*None\b/g, ": null")
    .replace(/:\s*undefined\b/g, ": null")
    .replace(/:\s*NaN\b/g, ": null");
}

/**
 * Repairs common malformed JSON string issues (comments, unescaped newlines, trailing commas, literals).
 */
export function repairJsonString(candidate: string): string {
  let text = candidate.trim();
  if (!text) return text;

  // 1. Strip comments
  text = stripComments(text);

  // 2. Normalize literals
  text = normalizeLiterals(text);

  // 3. Escape literal newlines & control characters inside string literals
  text = repairStringLiterals(text);

  // 4. Strip trailing commas
  text = stripTrailingCommas(text);

  return text;
}

/**
 * Attempts to repair truncated JSON (e.g. when maxOutputTokens cut off mid-response)
 * by closing open strings, arrays, and objects.
 */
export function repairTruncatedJson(jsonStr: string): string {
  let inString = false;
  let isEscaped = false;
  const stack: Array<"{" | "["> = [];

  for (let i = 0; i < jsonStr.length; i++) {
    const c = jsonStr[i];

    if (inString) {
      if (isEscaped) {
        isEscaped = false;
      } else if (c === "\\") {
        isEscaped = true;
      } else if (c === '"') {
        inString = false;
      }
      continue;
    }

    if (c === '"') {
      inString = true;
      continue;
    }

    if (c === "{" || c === "[") {
      stack.push(c);
    } else if (c === "}") {
      if (stack[stack.length - 1] === "{") stack.pop();
    } else if (c === "]") {
      if (stack[stack.length - 1] === "[") stack.pop();
    }
  }

  let repaired = jsonStr;

  // If ended inside an unclosed string, close the quote
  if (inString) {
    repaired += '"';
  }

  // Remove any trailing comma before closing
  repaired = repaired.replace(/,\s*$/, "");

  // Close unclosed objects and arrays in reverse order
  while (stack.length > 0) {
    const openChar = stack.pop();
    repaired += openChar === "{" ? "}" : "]";
  }

  return repairJsonString(repaired);
}

/**
 * Tries to parse a JSON candidate with multiple repair strategies.
 */
export function tryParseJson(candidate: string): unknown | null {
  const trimmed = candidate.trim();
  if (!trimmed) return null;

  // 1. Direct standard parse
  try {
    return JSON.parse(trimmed);
  } catch {
    // Continue to repair
  }

  // 2. Repaired parse
  const repaired = repairJsonString(trimmed);
  try {
    return JSON.parse(repaired);
  } catch {
    // Continue to truncated repair
  }

  // 3. Truncated JSON repair
  try {
    const truncatedRepaired = repairTruncatedJson(repaired);
    return JSON.parse(truncatedRepaired);
  } catch {
    return null;
  }
}

/**
 * Universal JSON extractor, repairer, and validator against a Zod schema.
 */
export function parseAndValidateAiJson<T>(
  raw: string,
  schema: z.ZodType<T>,
  normalizer?: (val: unknown) => unknown,
): T | null {
  const candidates = extractJsonCandidates(raw);

  for (const candidate of candidates) {
    const parsed = tryParseJson(candidate);
    if (parsed !== null && parsed !== undefined) {
      const normalized = normalizer ? normalizer(parsed) : parsed;
      const result = schema.safeParse(normalized);
      if (result.success) {
        return result.data;
      }
    }
  }

  return null;
}
