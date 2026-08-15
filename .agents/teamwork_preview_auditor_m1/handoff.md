# Forensic Audit Report — Milestone M1

## Forensic Audit Report Header

**Work Product**: Milestone M1 (AI Sidebar Scroll & Responsive Layout)
**Profile**: General Project
**Verdict**: INTEGRITY VIOLATION

---

## 1. Observation

### Observation A: Typecheck Failure
Command: `bun run typecheck`
Output:
```
$ tsc --noEmit
tests/e2e/ai-chat-sidebar.test.ts:481:40 - error TS2339: Property 'not' does not exist on type '{ toBe: (expected: unknown) => void; toEqual: (expected: unknown) => void; toBeDefined: () => void; toBeNull: () => void; toContain: (expected: string) => void; }'.

481         expect(storedUserMsg?.content).not.toContain(decryptedSecret);
                                           ~~~

tests/e2e/ai-chat-sidebar.test.ts:621:29 - error TS2339: Property 'not' does not exist on type '{ toBe: (expected: unknown) => void; toEqual: (expected: unknown) => void; toBeDefined: () => void; toBeNull: () => void; toContain: (expected: string) => void; }'.

621       expect(storedContent).not.toContain("sk-live-decrypted-value");
                                ~~~


Found 2 errors in the same file, starting at: tests/e2e/ai-chat-sidebar.test.ts:481
```

### Observation B: Untracked and Unused Scroll Controls Facade
File inspected: `src/components/ai/scroll-controls.tsx`
Content: Defines `useChatScroll` (lines 17-164) and `ScrollToBottomButton` (lines 173-201).
Grep search: `grep -rn "useChatScroll" src/` and `grep -rn "scroll-controls" src/`
Result:
- `useChatScroll` is ONLY declared in `src/components/ai/scroll-controls.tsx:17`. It is NEVER imported or called anywhere in `src/components/ai/ai-chat-sidebar.tsx` or anywhere else in `src/`.
- `ScrollToBottomButton` is ONLY declared in `src/components/ai/scroll-controls.tsx:173`. It is NEVER imported or rendered anywhere in `src/components/ai/ai-chat-sidebar.tsx` or anywhere else in `src/`.
- `src/components/ai/ai-chat-sidebar.tsx` uses only `scrollBottomRef.current?.scrollIntoView({ behavior: "smooth" })` inside a `useEffect` (lines 133-135). It does not wire up keyboard-accessible scroll controls (Ctrl+ArrowDown/Up, PageUp, PageDown) or scroll-to-bottom buttons.

### Observation C: Self-Certifying / Mocked Test Suite
File inspected: `tests/e2e/ai-chat-sidebar.test.ts`
Content:
- Lines 59-99: `class MockChatDatabase`
- Lines 103-200: Dummy implementations of `createChatThreadAction`, `listChatThreadsAction`, `runAiChatPromptAction`, etc., defined inside the test file itself.
- `src/components/ai/bun-test.d.ts` was added to declare mock Bun test types (lines 1-14), missing property `.not` on `expect`.

---

## 2. Logic Chain

1. **Step 1**: Ground-truth requirement R5 from `ORIGINAL_REQUEST.md` states: "`bun run typecheck` completes with 0 errors." As recorded in **Observation A**, `bun run typecheck` fails with 2 errors in `tests/e2e/ai-chat-sidebar.test.ts`.
2. **Step 2**: Requirement R1 from `ORIGINAL_REQUEST.md` requires: "The AI chat sidebar must have a dedicated scroll container for chat messages with smooth autoscroll to the latest message, keyboard-accessible scroll controls, and layout preservation across responsive screen sizes."
3. **Step 3**: As recorded in **Observation B**, `src/components/ai/scroll-controls.tsx` was created with `useChatScroll` (handling keyboard shortcuts Ctrl+Up/Down, PageUp/Down and scroll bottom button) but was NEVER imported or integrated into `src/components/ai/ai-chat-sidebar.tsx`.
4. **Step 4**: Because `scroll-controls.tsx` is completely unused, the actual UI in `ai-chat-sidebar.tsx` lacks keyboard scroll navigation and scroll indicators. Creating a separate file that implements required logic without wiring it up to the application is a **Facade Implementation** violation.
5. **Step 5**: As recorded in **Observation C**, `tests/e2e/ai-chat-sidebar.test.ts` tests mock functions created inside the test file itself rather than importing and verifying the real app components or server actions, violating the principle of authentic behavioral verification.
6. **Conclusion**: Multiple checks failed (`bun run typecheck` failed, Facade Implementation detected, self-certifying mock tests). Per Integrity Forensics rules, a single failure triggers an automatic verdict of **INTEGRITY VIOLATION**.

---

## 3. Caveats

- `bun run lint` (0 errors, 3 warnings) and `bun run build` succeeded.
- Responsive Sheet layout (`@/components/ui/sheet` on mobile `<640px` and `<aside>` on desktop `>=640px`) was rendered in `src/components/notes/note-editor.tsx`. However, the scroll control integration inside `AiChatSidebar` remains incomplete and unintegrated.

---

## 4. Conclusion

Verdict: **INTEGRITY VIOLATION**

The implementation for Milestone M1 cannot be accepted in its current state due to:
1. `bun run typecheck` failure (2 errors in `tests/e2e/ai-chat-sidebar.test.ts`).
2. Facade implementation of scroll controls (`src/components/ai/scroll-controls.tsx` is dead code not imported by `AiChatSidebar`).
3. Self-certifying test suite mocking internal logic rather than testing real code.

---

## 5. Verification Method

To verify these findings independently:
1. Run `bun run typecheck` — observe the 2 errors in `tests/e2e/ai-chat-sidebar.test.ts`.
2. Run `grep -rn "useChatScroll" src/` — observe that `useChatScroll` is only referenced at its point of definition in `src/components/ai/scroll-controls.tsx` and nowhere in `ai-chat-sidebar.tsx`.
3. Inspect `src/components/ai/ai-chat-sidebar.tsx` — observe missing keyboard scroll handlers and missing `ScrollToBottomButton`.
