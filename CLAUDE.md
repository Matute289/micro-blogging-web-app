# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server (http://localhost:5173)
npm run build      # Type-check + production build (output: /dist)
npm run lint       # ESLint check
npm run preview    # Serve the production build locally
npm run test       # Run Vitest unit/integration tests (single run)
npm run test:watch # Run Vitest in watch mode
npm run test:e2e   # Run Playwright E2E tests (Python, requires backend at :8080)
```

## Architecture

React 19 + TypeScript + Vite SPA. Entry point: `index.html` → `src/main.tsx` → `src/App.tsx`.

**React Compiler is enabled** via `@rolldown/plugin-babel` in `vite.config.ts`. This means the compiler handles memoization automatically — avoid manual `useMemo`/`useCallback` unless profiling proves they're needed.

**TypeScript config is split into two references** (`tsconfig.app.json` for src, `tsconfig.node.json` for build tooling like `vite.config.ts`). Both target ES2023. Add new source files under `src/`; build-tool-only files should remain at the root and stay within the `tsconfig.node.json` include glob.

**ESLint uses the new flat config format** (`eslint.config.js`), not `.eslintrc`. Extend it by adding entries to the exported array.

**CSS approach:** Global variables and dark-mode theming live in `src/index.css` (using `prefers-color-scheme`). Component-scoped styles go in co-located `.css` files. CSS Nesting (native spec) is used — no preprocessor.

## Testing

- **Unit/integration:** Vitest + Testing Library + jsdom. Config lives in `vite.config.ts` (`test` block). Setup file: `src/test/setup.ts` (imports `@testing-library/jest-dom`).
- **E2E:** Python + Playwright (`tests/e2e/pulse.spec.py`). Requires the Go backend running at `http://localhost:8080`.
- **Caveat:** `localStorage.clear()` in Vitest 4.x jsdom requires a manual mock — see `src/test/setup.ts`.

## Project structure

```
src/
  api/
    types.ts          ← shared types: User, Tweet, MediaItem
    client.ts         ← base fetch wrapper (X-User-ID header, error handling)
    users.ts          ← createUser(), getUser()
    tweets.ts         ← postTweet(), getUserTweets()
    follows.ts        ← followUser(), unfollowUser()
  contexts/
    AuthContext.tsx   ← currentUser, login, logout (localStorage)
  components/
    TweetCard.tsx/.css
    TweetComposer.tsx/.css
    BottomNav.tsx/.css
    ErrorBoundary.tsx/.css
  hooks/
    useFollowToggle.ts ← follow/unfollow with localStorage persistence
  pages/
    LoginPage.tsx/.css
    HomePage.tsx/.css      ← timeline + composer, infinite scroll
    ProfilePage.tsx/.css   ← own or another user's profile
    ExplorePage.tsx/.css   ← find user by UUID, follow/unfollow
  utils/
    avatar.ts         ← initials + deterministic color from UUID
    time.ts           ← relativeTime()
  test/
    setup.ts          ← global test setup
  App.tsx             ← routing (react-router-dom v7)
  index.css           ← CSS variables, typography, dark theme
```

## Backend

Go service at `http://localhost:8080`. Configured via `VITE_API_URL` env var (falls back to `http://localhost:8080`).

Identity is header-based: `X-User-ID: <uuid>`. The UUID is persisted in `localStorage` under the key `pulse_user`.

WebSocket: `ws://localhost:8080/ws/timeline?user_id=<uuid>` — real-time timeline feed.

See `.claude/context.md` for full endpoint reference and login flow.