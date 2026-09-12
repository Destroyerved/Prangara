# Handoff — FE-2 (APK / mobile)

Branch: `prangara-main-app`
Last updated: 2026-09-12

## Task completed

Phase 0 mobile foundation plus the Phase 1 FE-2 screens: Expo app shell,
navigation, design tokens, auth with token refresh, typed API client, factory
setup, conversational onboarding, bill scan, equipment scan, quick results,
evidence capture, the notification centre, and an offline capture queue that
sends on reconnect.

`tsc --noEmit` clean.

## Files changed

```text
apps/mobile/App.tsx                     QueryClient, AuthProvider, navigator
apps/mobile/app.json                    name, scheme, Android package, camera
                                        and photo permission strings
apps/mobile/src/api/client.ts           auth refresh, typed errors, timeouts
apps/mobile/src/api/endpoints.ts        every call the app makes
apps/mobile/src/api/types.ts            mirrors the backend contract
apps/mobile/src/auth/AuthContext.tsx    session
apps/mobile/src/components/ui.tsx       primitives with loading/error/empty built in
apps/mobile/src/lib/format.ts           lakh/crore, tonnes, payback, percentile
apps/mobile/src/navigation/             four tabs plus pushed screens
apps/mobile/src/screens/                10 screens
apps/mobile/src/storage/tokens.ts       Android keystore
apps/mobile/src/storage/queue.ts        offline capture queue
apps/mobile/src/storage/sync.ts         drain on reconnect, single-flight
apps/mobile/src/components/PendingBanner.tsx  visible pending count
apps/mobile/src/theme/tokens.ts         design tokens
apps/mobile/README.md
```

## API/schema changes

None. The mobile app consumes the backend contract as published and defines no
field of its own. `src/api/types.ts` mirrors
`packages/contracts/openapi.json`; if a screen needs something the API does not
return, the contract changes first (task.md section 3).

## Database migrations

None.

## Commands run

```bash
cd apps/mobile
npm install
npx expo install <navigation, camera, image-picker, secure-store, query>
npm run typecheck          # clean
npm run bundle:android     # Android JS bundle
```

## Known issues

1. **The offline queue has no server-side idempotency yet.** Each queued item
   carries a `clientRef` the backend does not consume. Until it does, replay
   safety rests on only retrying *network* failures — a double write needs the
   response to have been lost in flight rather than merely slow. Honouring
   `clientRef` on the intake and evidence endpoints would close that gap.
2. **OCR shows as unavailable.** Correct behaviour, not a bug — the backend
   reports that no OCR runtime is configured, and the bill and nameplate screens
   fall through to manual entry with the photo already stored as evidence. When
   BE-2 wires the runtime, `fields` and `suggested_activity_records` start
   arriving and both screens already render them.
3. **`android/` is not committed.** `expo prebuild` regenerates it; the repo
   stays on the managed workflow.
4. **No APK built yet.** Bundling is verified; producing a signed APK needs
   either a local Android SDK or an Expo account for EAS.
5. **Tab icons are text glyphs.** Deliberate — one fewer dependency to fail at a
   demo, and every tab carries a visible label anyway.

## Dependencies on another role

- **BE-2:** OCR extraction (bill and nameplate screens are built and waiting),
  the compliance evaluator (compliance alerts and corrective-action upload are
  Phase 2 FE-2 and cannot be built against nothing), and RAG (the mobile
  assistant screen).
- **BE-1 (me):** honouring `clientRef` for idempotent replay.
- **FE-1:** none. Separate app, shared contract only.

## Next safe task

Provider and RFQ actions from mobile (task.md Phase 3 FE-2): list quotes on an
action, accept one, update job status. The endpoints exist and are tested; this
is screen work against a settled contract.
