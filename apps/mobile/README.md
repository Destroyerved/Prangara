# PRANGARA mobile (APK)

FE-2 scope from `docs/task.md`: the Android companion. Camera, bill scanning,
equipment scanning, conversational onboarding, quick results, alerts and
evidence capture.

It does **not** reproduce the web dashboard. No Sankey, no MACC, no dense
tables — those are FE-1's, on a screen big enough for them. This app is for
somebody standing next to the thing they want to record.

## Running it

```bash
cd apps/mobile
npm install
npm start
```

Then press `a` for an Android emulator, or scan the QR code with Expo Go.

### Pointing it at the backend

The client resolves the API in this order:

1. `EXPO_PUBLIC_API_URL`
2. the host serving the Expo dev bundle, on port 8000
3. `http://localhost:8000`

Step 2 is why a physical phone usually works with no configuration: the dev
server already knows the laptop's LAN address. If it does not, set it
explicitly — **`localhost` on a phone is the phone**:

```bash
EXPO_PUBLIC_API_URL=http://192.168.1.20:8000 npm start
```

The Account tab shows which URL the app resolved and whether the API answered,
which is the first thing to check when a demo will not load.

## Checks

```bash
npm run typecheck        # tsc --noEmit
npm run bundle:android   # proves the Android bundle builds
```

## Building an APK

```bash
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleRelease
```

or, with an Expo account:

```bash
npx eas build --platform android --profile preview
```

`android/` is generated and git-ignored; `expo prebuild` recreates it.

## Layout

```text
src/
  api/         client (auth refresh, typed errors, timeouts), endpoints, types
  auth/        session context
  components/  UI primitives with loading, error and empty states built in
  lib/         number formatting for an Indian industrial audience
  navigation/  four tabs plus pushed detail screens
  screens/     one file per screen
  storage/     tokens in the Android keystore
  theme/       design tokens
```

## Rules this app follows

- **It never computes a carbon or financial number.** Every figure comes from
  the backend's deterministic engine (PRD 3.1).
- **Extraction is never persistence.** Conversational onboarding and bill
  scanning show unconfirmed values with their confidence and the words they
  were read from; nothing is written until the user confirms (PRD 29).
- **It says which extractor ran.** When the backend has no language model or OCR
  runtime configured, the screen says so rather than implying a scan happened.
- **Status is never carried by colour alone** — every severity chip and data
  state also shows a word (PRD 30, accessibility).
- **Field names come from the contract.** `packages/contracts/openapi.json` is
  the source; `src/api/types.ts` mirrors it and invents nothing.

## Not built yet

- Offline queue for captures taken with no signal (currently a capture fails and
  can be retried; it is not queued)
- Provider/RFQ actions from mobile (task.md Phase 3 FE-2, "if time permits")
- Compliance case detail and corrective-action upload (Phase 2 FE-2, blocked on
  BE-2's compliance evaluator)
- RAG assistant screen (Phase 2 FE-2, blocked on BE-2's RAG endpoints)
