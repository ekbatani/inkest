import {
  EditorView,
  type Panel,
  type ViewUpdate,
  runScopeHandlers,
} from "@codemirror/view";
import {
  SearchQuery,
  closeSearchPanel,
  findNext,
  findPrevious,
  getSearchQuery,
  replaceAll,
  replaceNext,
  selectMatches,
  setSearchQuery,
} from "@codemirror/search";
import { StateEffect } from "@codemirror/state";

// Track whether the replace drawer is expanded across panel open/close cycles
let globalReplaceExpanded = false;

// Custom effect to open the panel specifically in replace mode
export const openReplacePanelEffect = StateEffect.define<boolean>();

/**
 * Creates SVG icon elements with standard attributes
 */
function createSvgIcon(svgContent: string, className = "size-3.5"): SVGElement {
  const template = document.createElement("template");
  template.innerHTML = svgContent.trim();
  const svg = template.content.firstChild as SVGElement;
  if (svg) {
    svg.setAttribute("class", className);
    svg.setAttribute("aria-hidden", "true");
  }
  return svg;
}

const ICONS = {
  search: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  replace: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m14 4 4 4-4 4"/><path d="M4 8h14"/><path d="m10 20-4-4 4-4"/><path d="M20 16H6"/></svg>`,
  chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  arrowUp: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>`,
  arrowDown: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  close: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  clear: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  selectAll: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M7 7h10"/><path d="M7 12h10"/><path d="M7 17h10"/></svg>`,
};

/**
 * Creates the custom CodeMirror Find & Replace Panel
 */
export function createFindReplacePanel(view: EditorView): Panel {
  let isReplaceExpanded = globalReplaceExpanded;
  let currentQuery = getSearchQuery(view.state);
  let totalMatches = 0;
  let currentMatchIndex = 0;
  let regexError = false;

  // Root container
  const dom = document.createElement("div");
  dom.className = "cm-find-replace-panel";
  dom.setAttribute("role", "region");
  dom.setAttribute("aria-label", "Find and Replace");

  // Prevent editor from stealing focus on mousedown within panel
  dom.addEventListener("mousedown", (e) => {
    // Allow input elements to receive native focus
    const target = e.target as HTMLElement;
    if (target.tagName !== "INPUT" && target.tagName !== "BUTTON") {
      e.preventDefault();
    }
  });

  // --- Row 1: Find Row ---
  const findRow = document.createElement("div");
  findRow.className = "cm-find-replace-row cm-find-replace-find-row";

  // Expand / collapse replace toggle button
  const expandBtn = document.createElement("button");
  expandBtn.type = "button";
  expandBtn.className = "cm-find-replace-btn cm-find-replace-expand-btn";
  expandBtn.title = "Toggle Replace (Mod+H)";
  expandBtn.setAttribute("aria-label", "Toggle Replace");
  expandBtn.setAttribute("aria-expanded", String(isReplaceExpanded));
  expandBtn.appendChild(createSvgIcon(isReplaceExpanded ? ICONS.chevronDown : ICONS.chevronRight));

  // Search input wrapper
  const searchInputWrapper = document.createElement("div");
  searchInputWrapper.className = "cm-find-replace-input-wrapper";

  const searchIcon = createSvgIcon(ICONS.search, "cm-find-replace-input-icon");

  const searchInput = document.createElement("input");
  searchInput.type = "text";
  searchInput.className = "cm-find-replace-input";
  searchInput.placeholder = "Find in note...";
  searchInput.setAttribute("main-field", "true");
  searchInput.setAttribute("aria-label", "Find in note");
  searchInput.spellcheck = false;
  searchInput.autocomplete = "off";
  searchInput.value = currentQuery.search;

  // Match counter badge
  const matchBadge = document.createElement("span");
  matchBadge.className = "cm-find-replace-badge";
  matchBadge.setAttribute("role", "status");
  matchBadge.setAttribute("aria-live", "polite");

  // Search clear button
  const searchClearBtn = document.createElement("button");
  searchClearBtn.type = "button";
  searchClearBtn.className = "cm-find-replace-clear-btn";
  searchClearBtn.title = "Clear search";
  searchClearBtn.setAttribute("aria-label", "Clear search");
  searchClearBtn.appendChild(createSvgIcon(ICONS.clear));
  searchClearBtn.style.display = searchInput.value ? "flex" : "none";

  searchInputWrapper.appendChild(searchIcon);
  searchInputWrapper.appendChild(searchInput);
  searchInputWrapper.appendChild(matchBadge);
  searchInputWrapper.appendChild(searchClearBtn);

  // Search option toggles group
  const togglesGroup = document.createElement("div");
  togglesGroup.className = "cm-find-replace-group";

  // Match Case Toggle (Aa)
  const caseToggle = document.createElement("button");
  caseToggle.type = "button";
  caseToggle.className = `cm-find-replace-toggle ${currentQuery.caseSensitive ? "is-active" : ""}`;
  caseToggle.title = "Match Case (Alt+C)";
  caseToggle.setAttribute("aria-label", "Match Case");
  caseToggle.setAttribute("aria-pressed", String(currentQuery.caseSensitive));
  caseToggle.innerHTML = `<span class="cm-toggle-text">Aa</span>`;

  // Whole Word Toggle (\b)
  const wordToggle = document.createElement("button");
  wordToggle.type = "button";
  wordToggle.className = `cm-find-replace-toggle ${currentQuery.wholeWord ? "is-active" : ""}`;
  wordToggle.title = "Match Whole Word (Alt+W)";
  wordToggle.setAttribute("aria-label", "Match Whole Word");
  wordToggle.setAttribute("aria-pressed", String(currentQuery.wholeWord));
  wordToggle.innerHTML = `<span class="cm-toggle-text cm-toggle-mono">\\b</span>`;

  // Regular Expression Toggle (.*)
  const regexToggle = document.createElement("button");
  regexToggle.type = "button";
  regexToggle.className = `cm-find-replace-toggle ${currentQuery.regexp ? "is-active" : ""}`;
  regexToggle.title = "Use Regular Expression (Alt+R)";
  regexToggle.setAttribute("aria-label", "Use Regular Expression");
  regexToggle.setAttribute("aria-pressed", String(currentQuery.regexp));
  regexToggle.innerHTML = `<span class="cm-toggle-text cm-toggle-mono">.*</span>`;

  togglesGroup.appendChild(caseToggle);
  togglesGroup.appendChild(wordToggle);
  togglesGroup.appendChild(regexToggle);

  // Navigation buttons group
  const navGroup = document.createElement("div");
  navGroup.className = "cm-find-replace-group";

  const prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "cm-find-replace-btn";
  prevBtn.title = "Previous match (Shift+Enter / Shift+F3)";
  prevBtn.setAttribute("aria-label", "Previous match");
  prevBtn.appendChild(createSvgIcon(ICONS.arrowUp));

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "cm-find-replace-btn";
  nextBtn.title = "Next match (Enter / F3)";
  nextBtn.setAttribute("aria-label", "Next match");
  nextBtn.appendChild(createSvgIcon(ICONS.arrowDown));

  navGroup.appendChild(prevBtn);
  navGroup.appendChild(nextBtn);

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.type = "button";
  closeBtn.className = "cm-find-replace-btn cm-find-replace-close-btn";
  closeBtn.title = "Close (Escape)";
  closeBtn.setAttribute("aria-label", "Close find and replace");
  closeBtn.appendChild(createSvgIcon(ICONS.close));

  findRow.appendChild(expandBtn);
  findRow.appendChild(searchInputWrapper);
  findRow.appendChild(togglesGroup);
  findRow.appendChild(navGroup);
  findRow.appendChild(closeBtn);

  // --- Row 2: Replace Row ---
  const replaceRow = document.createElement("div");
  replaceRow.className = `cm-find-replace-row cm-find-replace-replace-row ${isReplaceExpanded ? "is-expanded" : "is-collapsed"}`;

  // Spacer aligning with expand button
  const replaceSpacer = document.createElement("div");
  replaceSpacer.className = "cm-find-replace-spacer";
  replaceSpacer.appendChild(createSvgIcon(ICONS.replace, "cm-find-replace-spacer-icon"));

  // Replace input wrapper
  const replaceInputWrapper = document.createElement("div");
  replaceInputWrapper.className = "cm-find-replace-input-wrapper";

  const replaceInput = document.createElement("input");
  replaceInput.type = "text";
  replaceInput.className = "cm-find-replace-input";
  replaceInput.placeholder = "Replace with...";
  replaceInput.setAttribute("aria-label", "Replace with");
  replaceInput.spellcheck = false;
  replaceInput.autocomplete = "off";
  replaceInput.value = currentQuery.replace;

  const replaceClearBtn = document.createElement("button");
  replaceClearBtn.type = "button";
  replaceClearBtn.className = "cm-find-replace-clear-btn";
  replaceClearBtn.title = "Clear replace text";
  replaceClearBtn.setAttribute("aria-label", "Clear replace text");
  replaceClearBtn.appendChild(createSvgIcon(ICONS.clear));
  replaceClearBtn.style.display = replaceInput.value ? "flex" : "none";

  replaceInputWrapper.appendChild(replaceInput);
  replaceInputWrapper.appendChild(replaceClearBtn);

  // Replace action buttons
  const replaceActionsGroup = document.createElement("div");
  replaceActionsGroup.className = "cm-find-replace-actions";

  const replaceBtn = document.createElement("button");
  replaceBtn.type = "button";
  replaceBtn.className = "cm-find-replace-action-btn";
  replaceBtn.textContent = "Replace";
  replaceBtn.title = "Replace next match (Enter in replace field)";
  replaceBtn.setAttribute("aria-label", "Replace next match");

  const replaceAllBtn = document.createElement("button");
  replaceAllBtn.type = "button";
  replaceAllBtn.className = "cm-find-replace-action-btn";
  replaceAllBtn.textContent = "Replace All";
  replaceAllBtn.title = "Replace all matches (Mod+Alt+Enter)";
  replaceAllBtn.setAttribute("aria-label", "Replace all matches");

  const selectAllBtn = document.createElement("button");
  selectAllBtn.type = "button";
  selectAllBtn.className = "cm-find-replace-action-btn cm-find-replace-action-btn-subtle";
  selectAllBtn.title = "Select all matches (Alt+Enter)";
  selectAllBtn.setAttribute("aria-label", "Select all matches");
  selectAllBtn.appendChild(createSvgIcon(ICONS.selectAll));

  replaceActionsGroup.appendChild(replaceBtn);
  replaceActionsGroup.appendChild(replaceAllBtn);
  replaceActionsGroup.appendChild(selectAllBtn);

  replaceRow.appendChild(replaceSpacer);
  replaceRow.appendChild(replaceInputWrapper);
  replaceRow.appendChild(replaceActionsGroup);

  dom.appendChild(findRow);
  dom.appendChild(replaceRow);

  // Helper to commit current state to CodeMirror SearchQuery
  function commitQuery() {
    searchClearBtn.style.display = searchInput.value ? "flex" : "none";
    replaceClearBtn.style.display = replaceInput.value ? "flex" : "none";

    // Validate regex before applying
    let isValidRegex = true;
    if (regexToggle.classList.contains("is-active") && searchInput.value) {
      try {
        new RegExp(searchInput.value);
      } catch {
        isValidRegex = false;
      }
    }
    regexError = !isValidRegex;

    const newQuery = new SearchQuery({
      search: searchInput.value,
      replace: replaceInput.value,
      caseSensitive: caseToggle.classList.contains("is-active"),
      wholeWord: wordToggle.classList.contains("is-active"),
      regexp: regexToggle.classList.contains("is-active") && isValidRegex,
    });

    if (!newQuery.eq(currentQuery)) {
      currentQuery = newQuery;
      view.dispatch({ effects: setSearchQuery.of(newQuery) });
    } else if (regexError) {
      updateMatchDisplay();
    }
  }

  // Update toggle button states
  function updateToggleUI() {
    caseToggle.classList.toggle("is-active", currentQuery.caseSensitive);
    caseToggle.setAttribute("aria-pressed", String(currentQuery.caseSensitive));

    wordToggle.classList.toggle("is-active", currentQuery.wholeWord);
    wordToggle.setAttribute("aria-pressed", String(currentQuery.wholeWord));

    regexToggle.classList.toggle("is-active", currentQuery.regexp);
    regexToggle.setAttribute("aria-pressed", String(currentQuery.regexp));
  }

  // Toggle replace drawer
  function setReplaceExpanded(expanded: boolean, focusInput = false) {
    isReplaceExpanded = expanded;
    globalReplaceExpanded = expanded;
    expandBtn.setAttribute("aria-expanded", String(expanded));
    expandBtn.innerHTML = "";
    expandBtn.appendChild(createSvgIcon(expanded ? ICONS.chevronDown : ICONS.chevronRight));

    replaceRow.classList.toggle("is-expanded", expanded);
    replaceRow.classList.toggle("is-collapsed", !expanded);

    if (expanded && focusInput) {
      setTimeout(() => {
        replaceInput.focus();
        replaceInput.select();
      }, 50);
    }
  }

  // Calculate and display matches count
  function updateMatchDisplay() {
    if (regexError) {
      matchBadge.textContent = "Invalid regex";
      matchBadge.className = "cm-find-replace-badge cm-find-replace-badge-error";
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      replaceBtn.disabled = true;
      replaceAllBtn.disabled = true;
      selectAllBtn.disabled = true;
      return;
    }

    if (!searchInput.value) {
      matchBadge.textContent = "";
      matchBadge.className = "cm-find-replace-badge";
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      replaceBtn.disabled = true;
      replaceAllBtn.disabled = true;
      selectAllBtn.disabled = true;
      return;
    }

    try {
      const cursor = currentQuery.getCursor(view.state.doc);
      const ranges: { from: number; to: number }[] = [];
      let match = cursor.next();
      while (!match.done && ranges.length < 1000) {
        ranges.push({ from: match.value.from, to: match.value.to });
        match = cursor.next();
      }
      totalMatches = ranges.length;
      const sel = view.state.selection.main;
      const activeIdx = ranges.findIndex(
        (r: { from: number; to: number }) => r.from === sel.from && r.to === sel.to,
      );
      currentMatchIndex = activeIdx >= 0 ? activeIdx + 1 : 0;
    } catch {
      totalMatches = 0;
      currentMatchIndex = 0;
    }

    const hasMatches = totalMatches > 0;
    prevBtn.disabled = !hasMatches;
    nextBtn.disabled = !hasMatches;
    replaceBtn.disabled = !hasMatches;
    replaceAllBtn.disabled = !hasMatches;
    selectAllBtn.disabled = !hasMatches;

    if (!hasMatches) {
      matchBadge.textContent = "No matches";
      matchBadge.className = "cm-find-replace-badge cm-find-replace-badge-muted";
    } else {
      matchBadge.textContent =
        currentMatchIndex > 0
          ? `${currentMatchIndex} of ${totalMatches}`
          : `${totalMatches} ${totalMatches === 1 ? "match" : "matches"}`;
      matchBadge.className = "cm-find-replace-badge cm-find-replace-badge-active";
    }
  }

  // --- Event Listeners ---

  // Input typing and clearing
  searchInput.addEventListener("input", commitQuery);
  replaceInput.addEventListener("input", commitQuery);

  searchClearBtn.addEventListener("click", () => {
    searchInput.value = "";
    commitQuery();
    searchInput.focus();
  });

  replaceClearBtn.addEventListener("click", () => {
    replaceInput.value = "";
    commitQuery();
    replaceInput.focus();
  });

  // Expand / collapse replace toggle
  expandBtn.addEventListener("click", () => {
    setReplaceExpanded(!isReplaceExpanded, !isReplaceExpanded);
  });

  // Search option toggles
  caseToggle.addEventListener("click", () => {
    caseToggle.classList.toggle("is-active");
    commitQuery();
    updateToggleUI();
  });

  wordToggle.addEventListener("click", () => {
    wordToggle.classList.toggle("is-active");
    commitQuery();
    updateToggleUI();
  });

  regexToggle.addEventListener("click", () => {
    regexToggle.classList.toggle("is-active");
    commitQuery();
    updateToggleUI();
  });

  // Navigation
  prevBtn.addEventListener("click", () => {
    findPrevious(view);
    updateMatchDisplay();
  });

  nextBtn.addEventListener("click", () => {
    findNext(view);
    updateMatchDisplay();
  });

  closeBtn.addEventListener("click", () => {
    closeSearchPanel(view);
  });

  // Replace actions
  replaceBtn.addEventListener("click", () => {
    replaceNext(view);
    updateMatchDisplay();
  });

  replaceAllBtn.addEventListener("click", () => {
    replaceAll(view);
    updateMatchDisplay();
  });

  selectAllBtn.addEventListener("click", () => {
    selectMatches(view);
  });

  // Keyboard navigation inside panel
  dom.addEventListener("keydown", (e: KeyboardEvent) => {
    if (runScopeHandlers(view, e, "search-panel")) {
      e.preventDefault();
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      closeSearchPanel(view);
      return;
    }

    // Alt+C: Toggle case
    if (e.altKey && (e.key === "c" || e.key === "C" || e.key === "ç")) {
      e.preventDefault();
      caseToggle.click();
      return;
    }

    // Alt+W: Toggle whole word
    if (e.altKey && (e.key === "w" || e.key === "W" || e.key === "∑")) {
      e.preventDefault();
      wordToggle.click();
      return;
    }

    // Alt+R: Toggle regex
    if (e.altKey && (e.key === "r" || e.key === "R" || e.key === "®")) {
      e.preventDefault();
      regexToggle.click();
      return;
    }

    // Mod+H: Toggle replace drawer
    if ((e.metaKey || e.ctrlKey) && (e.key === "h" || e.key === "H")) {
      e.preventDefault();
      setReplaceExpanded(!isReplaceExpanded, !isReplaceExpanded);
      return;
    }

    // Enter in search field
    if (e.key === "Enter" && e.target === searchInput) {
      e.preventDefault();
      if (e.altKey) {
        selectMatches(view);
      } else if (e.shiftKey) {
        findPrevious(view);
      } else {
        findNext(view);
      }
      updateMatchDisplay();
      return;
    }

    // Enter in replace field
    if (e.key === "Enter" && e.target === replaceInput) {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey || e.altKey) {
        replaceAll(view);
      } else {
        replaceNext(view);
      }
      updateMatchDisplay();
      return;
    }

    // Arrow down from search field to replace field
    if (e.key === "ArrowDown" && e.target === searchInput && isReplaceExpanded) {
      e.preventDefault();
      replaceInput.focus();
      replaceInput.select();
      return;
    }

    // Arrow up from replace field to search field
    if (e.key === "ArrowUp" && e.target === replaceInput) {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
      return;
    }
  });

  // Initial calculation
  updateMatchDisplay();

  return {
    dom,
    top: true,
    mount() {
      // Focus the search input by default and select contents
      requestAnimationFrame(() => {
        searchInput.focus();
        if (searchInput.value) {
          searchInput.select();
        }
        updateMatchDisplay();
      });
    },
    update(update: ViewUpdate) {
      for (const effect of update.transactions.flatMap((t) => t.effects)) {
        if (effect.is(openReplacePanelEffect)) {
          setReplaceExpanded(true, true);
        }
      }

      const nextQuery = getSearchQuery(update.state);
      if (!nextQuery.eq(currentQuery)) {
        currentQuery = nextQuery;
        if (searchInput.value !== nextQuery.search) {
          searchInput.value = nextQuery.search;
        }
        if (replaceInput.value !== nextQuery.replace) {
          replaceInput.value = nextQuery.replace;
        }
        updateToggleUI();
      }

      if (
        update.docChanged ||
        update.selectionSet ||
        update.viewportChanged ||
        !nextQuery.eq(currentQuery)
      ) {
        updateMatchDisplay();
      }
    },
  };
}
