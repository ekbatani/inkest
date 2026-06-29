const arabicScriptRegex = /\p{Script=Arabic}/u;

export function containsArabicScript(value: string) {
  return arabicScriptRegex.test(value);
}

export function usesRtlTitleFont(value: string | null | undefined) {
  return containsArabicScript(value ?? "");
}
