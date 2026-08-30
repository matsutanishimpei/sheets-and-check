# Lessons Learned & Insights

## 1. TypeScript & tsconfig Options
- **Failure mode**: `baseUrl` configuration is deprecated under newer TypeScript versions (like 5.9.x) which causes type check compilation errors with exit code 1.
- **Detection signal**: Error TS5101: `Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0.`
- **Prevention rule**: Set compilerOptions `"ignoreDeprecations": "5.0"` in `tsconfig.json` to silence this warning/error and allow the codebase to typecheck successfully. Avoid using `"6.0"` since it is not recognized as a valid value by some 5.x compilers.

## 2. Monorepo Validation Order
- **Finding**: Running typechecks before installing node modules leads to massive untraceable import errors.
- **Action**: Always ensure workspace root `npm install` is executed before compiling/typechecking packages inside a multi-package workspaces monorepo.

## 3. Hono RPC Client Type Resolution
- **Failure mode**: Removing backend endpoints that are still called by the frontend (such as `/hello` used for bootstrap check) causes the Hono RPC Client types to fail to resolve, resulting in typescript errors like: `Parameter 'res' implicitly has an 'any' type.` on unrelated parameters.
- **Detection signal**: TypeScript compiler complaining about implicit `any` on responses or client objects on the frontend when backend routes change.
- **Action**: Ensure health check endpoints are preserved or the frontend code is synchronized when backend API routes are refactored.

## 4. Monorepo Workspace Build Choreography
- **Failure mode**: In an `npm workspaces` monorepo, a global build script that runs `npm run build --workspaces` will crash and fail with code 1 if any child workspace package does not have a `"build"` script defined in its `package.json`.
- **Detection signal**: `Missing script: "build"` error under workspace execution.
- **Prevention rule**: Ensure all child packages in a monorepo define at least a dummy build task (e.g. `"build": "tsc --noEmit"` or `"build": ""`) so that global workspaces build commands execute successfully across the monorepo.

## 5. Supabase Realtime + React useEffect: Infinite Resubscribe Loop
- **Failure mode**: Placing unstable callback references (inline functions, non-memoized `addToast`, etc.) in a `useEffect` dependency array that manages a Supabase Realtime channel subscription causes the effect to re-run on **every render**. Each re-run calls `channel.unsubscribe()` then `channel.subscribe()`, creating a rapid teardown-reconnect cycle. If the effect body also triggers a state change (e.g. showing a toast), it additionally causes an infinite render loop.
- **Detection signal**: The receiving side never updates despite broadcasts being sent successfully. Console may show rapid repeated `Successfully subscribed to channel` logs. If the effect body shows a toast, toasts will stack infinitely.
- **Root cause**: `addToast`, `onTeacherReset`, `onTeacherLockState` were inline functions recreated on every render and included as `useEffect` dependencies. Any re-render — regardless of cause — produced new function references, which React treated as dependency changes, re-running the effect. The channel was **never stable long enough to receive a message**.
- **Prevention rule**: For `useEffect` hooks that manage long-lived subscriptions (WebSocket, Supabase Realtime, SSE), **never include callback functions directly in the dependency array**. Instead:
  1. Store callbacks in `useRef` and update the ref in a separate `useEffect`.
  2. Inside the subscription handler, call `callbackRef.current(...)`.
  3. Only include truly identity-stable values in deps (e.g., `supabase` client instance, `roomId` string).
  4. Wrap frequently-used callbacks like `addToast` in `useCallback(…, [])` at the definition site.

## 7. Realtime Broadcast Stale State Trap (React Asynchronous Batching)
- **Failure mode**: When a user clicks a button to update local state (e.g., `setStudentComment('[順調]...')`) and immediately triggers a broadcast transmission function (`handleSend('ok')`) on the next line, the broadcast payload sends the **old, un-updated state value** (such as an empty string). The updated message only transmits upon a second button tap.
- **Root cause**: React state updater functions operate asynchronously (state batching). At the exact moment `handleSend` executes, the parent component's `studentComment` variable has not yet re-rendered with the new value.
- **Prevention rule**: For realtime broadcast methods triggered by UI interactions, always design the broadcast handler to accept an **immediate, optional override parameter** (e.g., `onSendBroadcast(status, overrideComment?)`). Pass the exact literal string directly into both the state updater and the broadcast handler simultaneously to guarantee zero-latency synchronous delivery.

## 8. Mobile UI Layout: Absolute Single-Line Label Design & Transparent Grid Esthetics
- **Failure mode**: In responsive multi-column layouts (such as 2x3 grid buttons on mobile screens), long button labels wrap unpredictably across multiple lines, destroying vertical alignment and the premium feel of glassmorphism cards. Similarly, rendering dense dotted borders and solid background fills for empty or inactive grid cells creates overwhelming visual noise for teachers monitoring a crowded classroom.
- **Solution**:
  1. Compress mobile button labels to strict 4-5 character micro-copy combined with high-impact emojis (`✨ バッチリ！`, `✍️ メモ待って`), enforced with `whiteSpace: nowrap` and responsive font sizing.
  2. Implement a "subtractive design esthetic" on classroom monitoring grids: empty student seats render exclusively as vibrant colored borders with zero fill (`transparent`), while unassigned floor cells render completely transparent without borders or fills. This instantly draws the human eye directly to active student check-ins.

## 9. High-Fidelity Design Systems: Cross-Platform Vector SVG Icon Replacement
- **Failure mode**: Relying on OS-dependent text emojis (`✨`, `💡`, `⚙️`, `🔒`, `🪑`) for core application navigation, status indicators, or interactive buttons creates severe visual fragmentation. On Windows, macOS, iOS, and Android, these emojis render with wildly different textures, color schemes, and aspect ratios, destroying the premium visual consistency of a professional SaaS dashboard.
- **Action**: Completely eliminate text emojis across the entire UI codebase. Standardize exclusively on high-fidelity vector SVG icon libraries (such as `lucide-react`). Vector icons guarantee absolute pixel perfection, scalable dimensions, CSS-controllable color harmony (`currentColor`), and pristine cross-platform rendering under all operating systems and viewport resolutions.

## 10. React Hook Dual-State Synchronization and Prop Drilling
- **Failure mode**: Passing asynchronously fetched configuration (e.g., `supabaseUrl`) into a custom hook that initializes its internal state via `useState(initialValue)` causes the hook to permanently retain the initial empty state. As a result, critical client instances (like a Supabase Client) initialize with empty credentials, failing to open WebSocket connections while emitting zero errors.
- **Detection signal**: Variables logged immediately after fetching look correct in the parent component, but the child hook's `useEffect` or websocket connections are never triggered or connect to empty targets.
- **Prevention rule**: When a custom hook consumes configurations that might resolve asynchronously in a parent, avoid duplicating the props into a local `useState` unless absolutely necessary. If local state is required (e.g., for local overrides), explicitly synchronize the parent props to the internal state using a dedicated `useEffect` observing the prop changes.

## 11. API Login Flow: Blind `response.json()` on Non-JSON Bodies
- **Failure mode**: A login screen calls `response.json()` for both success and failure paths, but the deployed endpoint returns HTML or another non-JSON body (for example, a static site fallback, proxy error page, or empty response). The browser then throws `Unexpected non-whitespace character after JSON...` before the UI can show a helpful error.
- **Detection signal**: The toast shows a JSON parse exception instead of the backend error message, and the response `content-type` is not `application/json`.
- **Prevention rule**: For auth and other user-facing API calls, inspect `content-type` before parsing, read the body as text first, and only `JSON.parse()` when the response is actually JSON. Keep a fallback error message for HTML/error pages so the UI fails gracefully.
