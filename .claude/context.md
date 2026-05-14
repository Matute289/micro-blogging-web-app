# Chirp — Internal Context

> Archivo privado de contexto. Solo para Claude Code. Se actualiza con cada edición.

---

## 1. Qué es esto

Frontend para UalaTwitter (mini-Twitter backend en Go). El proyecto se llama **Chirp**.
- Browser-first SPA (Vite + React 19 + TypeScript)
- Preparado para envoltura nativa iOS/Android con **Capacitor** (sin cambios de código, wrap del build de Vite)

---

## 2. Backend: UalaTwitter

### Base URL
`http://localhost:8080`

### Identity
Header `X-User-ID: <uuid>` — sin auth real. El frontend almacena el UUID en `localStorage`.

### Endpoints

| Método | Path | Auth header | Notas |
|--------|------|-------------|-------|
| POST | /users | No | Body: `{username}`. Resp 201: User. 409: nombre tomado |
| GET | /users/:id | No | Resp 200: User. 404: no existe |
| POST | /tweets | Sí | Body: `{text, media?}`. Resp 201: Tweet |
| GET | /users/:id/tweets | No | Query: `limit`, `before`. Resp: Tweet[] |
| POST | /users/:id/follow | Sí | Resp 204 |
| DELETE | /users/:id/follow | Sí | Resp 204 |
| GET | /timeline | Sí | Query: `limit`, `before`. Resp: Tweet[] |

### Tipos

```ts
interface User {
  id: string;          // UUID
  username: string;
  created_at: string;  // ISO 8601
  last_seen_at: string;
}

interface Tweet {
  id: string;          // "{hex32}_{ms}"
  user_id: string;
  text: string;
  media?: MediaItem[];
  created_at: string;
}

interface MediaItem {
  type: 'image' | 'video' | 'music';
  url: string;
}
```

### Paginación (cursor)
- Params: `limit` (1–50, default 20), `before` (tweet ID, opcional)
- Orden: más reciente primero

### Errores
Plain text, HTTP status codes. Importante: no existe endpoint para buscar usuario por username — solo por UUID.

---

## 3. Login flow (limitación del API)

1. User ingresa username → `POST /users`
2. **201**: cuenta creada → guardar `{id, username}` en localStorage → redirect /home
3. **409**: username tomado → mostrar campo "Ingresá tu User ID" → `GET /users/{uuid}` → si existe → login
4. **GET 404**: ID no encontrado → error

---

## 4. Estructura del proyecto

```
src/
  api/
    types.ts        ← tipos compartidos User, Tweet, MediaItem
    client.ts       ← base fetch wrapper (maneja X-User-ID, errores)
    users.ts        ← createUser(), getUser()
    tweets.ts       ← postTweet(), getUserTweets()
    follows.ts      ← followUser(), unfollowUser()
    timeline.ts     ← getTimeline()
  contexts/
    AuthContext.tsx  ← currentUser, login, logout (localStorage)
  components/
    TweetCard.tsx/.css
    TweetComposer.tsx/.css
    BottomNav.tsx/.css
  pages/
    LoginPage.tsx/.css
    HomePage.tsx/.css      ← timeline + composer
    ProfilePage.tsx/.css   ← perfil propio o ajeno
    ExplorePage.tsx/.css   ← buscar usuario por UUID, follow
  App.tsx           ← routing (react-router-dom v6)
  index.css         ← variables globales, tipografía, dark theme
  App.css           ← (vacío/reset)
```

---

## 5. Diseño: "Ink Dark"

| Variable CSS | Valor |
|---|---|
| `--color-bg` | `#0c0c10` |
| `--color-surface` | `#141418` |
| `--color-surface-hover` | `#1a1a20` |
| `--color-border` | `#222228` |
| `--color-text` | `#e2e2ea` |
| `--color-text-muted` | `#6a6a82` |
| `--color-accent` | `#e8874a` |
| `--color-accent-hover` | `#f09458` |
| `--color-danger` | `#e05a5a` |

Fuentes (Google Fonts):
- **Syne** → brand, headings
- **Lexend** → body, UI
- **JetBrains Mono** → usernames, IDs, timestamps

---

## 6. Características MVP

- [x] Login/signup flow
- [x] Timeline con infinite scroll (IntersectionObserver)
- [x] Compositor de tweets (280 chars + media URLs)
- [x] Perfil de usuario (propios o ajenos)
- [x] Follow/unfollow desde tweets y perfil
- [x] Explorar: buscar usuario por UUID y seguirlo
- [x] Avatares generados (iniciales + color determinístico por UUID)
- [x] Bottom nav mobile-first
- [x] Safe area insets (Capacitor/iOS)

---

## 7. Historial de ediciones

### [Rename + Tests + Review] — Chirp → Pulse, testing setup, code review
- Renombrado: "Chirp" → "Pulse" en todos los archivos (storage key, botón, logo, copy)
- Extraídas utilidades compartidas: `src/utils/avatar.ts`, `src/utils/time.ts`
- Setup Vitest: `vite.config.ts test block`, `src/test/setup.ts`, scripts `test/test:watch/test:e2e`
- Tests unitarios: `src/utils/__tests__/avatar.test.ts`, `time.test.ts`
- Tests unitarios: `src/api/__tests__/client.test.ts`
- Tests de integración (mocks): `src/components/__tests__/TweetCard.test.tsx`, `TweetComposer.test.tsx`
- Tests de integración (mocks): `src/pages/__tests__/LoginPage.test.tsx`
- Tests de integración: `src/contexts/__tests__/AuthContext.test.tsx`
- Tests E2E Playwright: `tests/e2e/pulse.spec.py` (9 tests, todos passing)
- Resultado: 49/49 unit/integration + 9/9 E2E
- Workaround aplicado: `localStorage.clear()` de vitest 4.x jsdom necesita mock manual

### [Fixes] — Todos los issues del code review aplicados
**Críticos resueltos:**
- Observer ref pattern en HomePage y ProfilePage (no se reinstala en cada fetch)
- `useFollowToggle` hook con persistencia en localStorage → follow state correcto al revisitar perfiles
- TweetComposer muestra error cuando el post falla

**Altos resueltos:**
- `useAuth()` lanza si se usa fuera de `<AuthProvider>`
- `TweetCard` avatares y usernames tienen `tabIndex={0}` + `onKeyDown` (accesible por teclado)
- BASE_URL usa `import.meta.env.VITE_API_URL` con fallback a localhost
- ProfilePage tiene indicador "all pulses loaded" al final del feed
- HomePage renderiza tweets inmediatamente, resuelve usernames en segundo render async

**Medios resueltos:**
- `ErrorBoundary` envuelve `<Routes>` en App.tsx
- Media items envueltos en `<div className="tweet-media">` wrapper correcto
- Lógica de follow/unfollow extraída a `src/hooks/useFollowToggle.ts`
- Google Fonts movido de `@import` en CSS a `<link rel="preconnect">` en index.html
- `:focus-visible` en `composer-textarea` y `login-input`
- `<label htmlFor="explore-id">` + `.sr-only` para el input de búsqueda
- `alt=""` en imágenes (decorativas)
- `navigate(-1)` con fallback a `/home` cuando no hay historial

**Tests:** 51/51 unitarios + integración | 9/9 E2E

### Code Review — Issues identificados (pendientes de fix)
**Critical:**
- `HomePage.tsx:50` — IntersectionObserver se reinstala en cada fetch (usar ref para el callback)
- `ProfilePage.tsx:29` — estado `following` siempre inicia en `false` (no hay API de follow status)
- `TweetComposer.tsx:31` — errores de post silenciados sin feedback al usuario

**High:**
- `AuthContext.tsx:21` — no hay guard si `useAuth` se usa fuera del Provider
- `TweetCard.tsx:34` — `role="button"` en divs sin `tabIndex` ni `onKeyDown` (no accesible por teclado)
- `client.ts:1` — BASE_URL hardcodeada a `localhost:8080` (usar `import.meta.env.VITE_API_URL`)
- `ProfilePage.tsx:136` — no hay indicador de "fin de feed"
- `HomePage.tsx:34` — renderizado de tweets bloqueado hasta resolver usernames (mostrar tweets primero)

**Medium:**
- Sin ErrorBoundary en el árbol
- Media items en `TweetCard` fuera del wrapper `.tweet-media` (spacing roto con múltiples imágenes)
- Lógica de follow duplicada entre `ExplorePage` y `ProfilePage` → extraer a `useFollowToggle`
- Google Fonts via `@import` bloquea render → mover a `<link>` en index.html con `display=swap`
- Sin `:focus-visible` en login inputs ni composer textarea (WCAG 2.4.7)
- Input de búsqueda en `ExplorePage` sin `<label>`

**Low:**
- `avatarInitial` exportada pero nunca usada
- `relativeTime` retorna "now" para timestamps futuros (clock skew)
- `alt="media"` en imágenes no descriptivo
- `navigate(-1)` puede salir de la app en deep-link directo

### [Init] — Setup inicial completo
- Instalado: `react-router-dom`
- Creados: todos los archivos src/api/*, src/contexts/, src/components/, src/pages/
- Diseño: dark theme "Ink", fuentes Syne + Lexend + JetBrains Mono
- Routing: /login, /home, /profile/:userId, /explore
- Fix: `ApiError` class no usa parameter properties (erasableSyntaxOnly en tsconfig)
- Build: ✓ 0 errores TS, 46 módulos
