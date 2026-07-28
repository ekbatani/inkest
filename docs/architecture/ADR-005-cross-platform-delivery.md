# Architectural Decision Record (ADR-005): Single-Codebase Cross-Platform Delivery Strategy

**Decision date:** 2026-07-28  
**Status:** Approved  
**Tasks:** P3-70 (Mobile delivery technology evaluation) & P3-71 (Cross-platform packaging & mobile experience)

---

## Context & Objectives

Inkest requires native desktop and mobile applications across **Windows, macOS, Linux, Android, and iOS** while maintaining a strict **100% single codebase**. Maintaining separate codebases (e.g. Next.js web + React Native mobile + Electron desktop) creates unsustainable maintenance overhead and risk of feature drift.

The objective of ADR-005 is to establish:
1. The cross-platform packaging technology stack.
2. The architectural boundary between web PWA assets and native runtime containers.
3. The automated CI/CD conversion pipeline via GitHub Actions.

---

## Decision

Inkest adopts a **Unified Next.js PWA + Capacitor (Mobile) + Tauri v2 (Desktop)** architecture:

1. **Progressive Web App (PWA) Foundation:**
   - Inkest implements a native Next.js 16 Web App Manifest (`src/app/manifest.ts`) and offline Service Worker (`src/sw.ts`).
   - The UI includes touch-optimized mobile navigation drawers, responsive viewports, and local storage / IndexedDB offline fallbacks for writing and viewing notes.

2. **Mobile Native Shells (Android & iOS): Capacitor v6**
   - Capacitor wraps the PWA web asset bundle into standard Android Studio (`android/`) and Xcode (`ios/`) projects without requiring React Native or Flutter rewrites.
   - Provides native access to native device storage, biometrics, and offline filesystem APIs.

3. **Desktop Native Shells (Windows, macOS, Linux): Tauri v2**
   - Tauri v2 wraps the web application in a lightweight (~10MB) Rust native shell using OS-native system webviews (WebView2 on Windows, WKWebView on macOS, WebKitGTK on Linux).
   - Provides native window management, native menus, tray icons, and OS notification integrations.

4. **100% Single Codebase & CI/CD Packaging Pipeline:**
   - All target platforms share the exact same UI components, server logic, and Markdown editor code.
   - GitHub Actions (`.github/workflows/build-apps.yml`) automates building Windows `.msi`/`.exe`, macOS `.dmg`/`.app`, Linux `.AppImage`/`.deb`, Android `.apk`/`.aab`, and iOS Xcode builds on tag release or manual dispatch.

---

## Comparison Matrix & Trade-off Analysis

| Framework Strategy | Target Platforms | Single Codebase? | Next.js Integration | Binary Overhead | CI/CD Automation | Decision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Capacitor + Tauri v2** *(Adopted)* | Android, iOS, Win, Mac, Linux | **Yes (100%)** | Native Web Shell / PWA | Very Low (~10-15MB) | Full Matrix (GitHub Actions) | **APPROVED** |
| **Electron + Capacitor** | Win, Mac, Linux, Android, iOS | Yes | Native | High (~150MB Desktop) | High | Rejected (Resource heavy) |
| **PWABuilder / TWA** | Android, Windows | Partial | Native | Low | Moderate | Rejected (iOS limitations) |
| **React Native / Expo** | Android, iOS | No (Rewrite) | Poor | Medium | High | Rejected (Violates single codebase) |

---

## Security & Data Isolation Boundaries

- Native wrappers inherit all security guarantees defined in `AGENTS.md` and `docs/ARCHITECTURE.md`.
- Network requests from native shells to self-hosted Inkest servers must respect HTTPS-only boundaries, cookie/session isolation, and private attachment handlers.
- Device storage utilized for offline draft caching is encrypted using platform-native secure storage primitives when biometrics or device passcodes are enabled.
