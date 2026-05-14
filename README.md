# Pulse

A mobile-first microblogging SPA — frontend for the [micro-blogging](http://localhost:8080) like Twitter Go backend.

Built with React 19, TypeScript, and Vite. Designed for wrapping as a native iOS/Android app via Capacitor (zero code changes needed, just wrap the Vite build).

## Stack

| Layer | Tech |
|---|---|
| UI | React 19 + TypeScript |
| Build | Vite 8 + React Compiler |
| Routing | react-router-dom v7 |
| Styling | CSS Nesting (native), no preprocessor |
| Tests | Vitest + Testing Library + Playwright (Python) |

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Requires the Go backend running at `http://localhost:8080` (or set `VITE_API_URL`).

## Scripts

```bash
npm run dev        # Vite dev server with HMR
npm run build      # Type-check + production build → /dist
npm run preview    # Serve the production build locally
npm run lint       # ESLint
npm run test       # Vitest unit/integration (single run)
npm run test:watch # Vitest in watch mode
npm run test:e2e   # Playwright E2E (requires backend + Python)
```

## Features

- Signup / login flow (username → UUID-based identity, no passwords)
- Timeline with infinite scroll (IntersectionObserver)
- Tweet composer (280 chars + media URLs)
- User profiles (own and others')
- Follow / unfollow with persistent state
- Explore: find any user by UUID
- Generated avatars (initials + deterministic color from UUID)
- Mobile-first layout with bottom navigation
- Safe area insets for Capacitor / iOS notch

## Design

"Ink Dark" theme — `#0c0c10` background, `#e8874a` accent. Fonts: Syne (headings), Lexend (body), JetBrains Mono (usernames / timestamps).