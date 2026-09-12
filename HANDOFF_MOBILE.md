# Handoff — FE-2 (Android APK / mobile)

Last updated: 2026-09-13

## Task completed

Full web-dashboard parity on the phone, plus a standalone APK.

The app previously covered capture only — bill scan, nameplate scan,
conversational onboarding, quick results, alerts, evidence. It now carries every
module the web app has, using the web app's design system rather than an
approximation of it, and it is usable with no backend in reach.

### Design system

`apps/mobile/src/theme/tokens.ts` is now a direct port of the web app's
`src/styles/tokens.css`, value for value: ground `#070708`, lavender accent
`#bec2ff`, cyan secondary `#50d8e9`, scope palette `#ffb689 / #bec2ff /
#50d8e9`, border `#232426`, the `rgba` glass surfaces, radius 14, and the
Manrope/Inter ramp with the web's tight display tracking (Manrope for titles and
numbers, Inter for prose, loaded through `@expo-google-fonts`).

The previous tokens claimed to be "aligned with the web app" but were a
different palette entirely — cyan/emerald on `#080B11`. That is what made the
two surfaces look like different products.

The bottom tab bar is the web app's detached floating navbar: a glass pill
lifted off the bottom edge, with line icons drawn in `react-native-svg` so the
app carries no icon font.

### New modules, one per web route

| Screen | Mirrors |
|:---|:---|
| `OverviewScreen` | `/overview` — financial hero, carbon hero, metric strip, the four numbered sections |
| `PlantDataScreen` | `/assessment` — activity inventory with data states, evidence, audit trail |
| `FootprintScreen` | `/footprint` — scopes, band, source-to-scope flow, stream inventory |
| `LeakPointsScreen` | `/leaks` — every finding with its rule, peer quartiles and recoverable tonnes |
| `ScenariosScreen` | `/scenarios` — what-if simulator |
| `CircularActionsScreen` | `/actions` — priced interventions, substitution caps, "PRANGARA said no", plus a writable tracker |
| `PortfolioScreen` | `/portfolio` — MACC and the interaction de-rating |
| `MarketplaceScreen` | `/marketplace` — provider matching, RFQ creation, quote comparison, accept |
| `LogisticsScreen` | `/logistics` — route planner, truck pooling, backhaul |
| `CircularNetworkScreen` | `/circular-network` — symbiosis listings, shared capacity, live listings |
| `ComplianceScreen` | `/compliance` — CBAM, CCTS, BRSR readiness, rule-pack cases |
| `MethodologyScreen` | `/methodology` — standard, version stamp, limitations, factor registry |
| `ModulesScreen` | the sidebar, thumb-sized: same groups, same labels, same order |
| `StoryScreen` | PRD section 32 "Demo Story" as a 17-step guided walkthrough |

`WorkspaceProvider` is the mobile counterpart of the web's `useWorkspace`: one
place that owns the active plant and the assessment every module reads, so
switching plant moves the whole app.

### Charts

`src/components/charts.tsx` ports the web chart geometry to `react-native-svg`
with the same scales and colours: the MACC (width = de-rated tonnes, height =
₹/tCO₂e, 8th–92nd percentile clipping, accent below the zero line and scope-1
peach above it), the scope band, the uncertainty band, the peer quartile strip,
stream bars, a three-column stream→scope→total sankey, and before/after bars for
the simulator. Each carries an `accessibilityLabel`, because text inside an SVG
reaches no screen reader — and no text query either, which is how the tests
found it.

### On-device OCR, vision and field extraction

Reading a photograph no longer needs a server. `src/ml/` carries:

| File | What it does |
|:---|:---|
| `ocr.ts` | ML Kit Latin text recognition, bundled in the APK, with per-line geometry |
| `text.ts` | rebuilds printed rows from that geometry, and pairs label/value lines when there is none |
| `documents.ts` | bill and invoice field rules, with confidences and refusals |
| `nameplate.ts` | equipment plate rules: kW, HP with conversion, rpm, volts, efficiency, IE class, make, model, year |
| `vision.ts` | ML Kit image labelling, to catch a mis-framed photograph before its fields are shown |

The geometry step is the part that made it work on real photographs. A
recogniser returns a two-column nameplate as separate lines - "kW", "VOLTS",
"RPM" in one block and "7.5", "415", "1440" in another - so rows are rebuilt
from where the text sits before any rule runs. On a test plate that took the
reading from 4 fields to 11, and moved rated power from missing to CLEAR 90%.

Measured on the connected device (OnePlus CPH2467, Android 15):

```text
electricity bill   48,500 kWh and 750 kVA read correctly, period read as one month
motor nameplate    11 fields in 0.3s: 7.5 kW (90%), 10 HP, 1,440 rpm, 415 V,
                   89.4% efficiency, IE3, Crompton Greaves, 2019
```

Every value carries a confidence and the printed line it came from, and nothing
is written until a person confirms it. The rules refuse more than they accept:
a leading zero marks an identifier rather than a quantity, an amount needs a
currency token beside it, and an implausible figure is dropped. A tariff is read
only where the bill prints a rate - never back-calculated from the total, since
that total carries fixed charges and duty.

### Works with no backend

The sign-in screen offers **Open the demonstration**, which runs the app against
`src/data/demo-assessments.json` — ten sectors of real engine output, generated
by `backend/engine` (see `docs/DEMO-FIXTURES.md`). This is the same fallback the
web app ships in `src/data/assessments.json`, and it is what makes an installed
APK explorable on a factory floor with no server in reach. Every screen showing
it carries a `DEMONSTRATION DATA` badge; capture and procurement stay read-only,
because those write to a real plant's record.

## Bugs found and fixed

1. **`GET /api/shipments` and truck pooling returned 500 for any signed-in
   user.** `routes_logistics.py` called `accessible_factory_ids(principal)`
   where the helper takes `(db, principal)`. Every existing logistics test used
   the anonymous client, so the authenticated branch was never executed. Fixed,
   with `test_signed_in_user_can_list_shipments_and_pool` covering it — verified
   to fail against the old signature.
2. **The mobile modules would have crashed in demonstration mode.** They read
   `result.data_quality.score`, but that panel only exists on a *persisted*
   assessment: the score needs the stored profile and activity rows. The type is
   now optional and every reader prints "Not supplied", matching the web app.
3. **The API endpoint override did not survive a restart.** `setCustomBaseUrl`
   only set a module-level variable, so anyone who typed their own server
   address into an installed APK had to type it again on every launch. It is now
   persisted and restored before the first request goes out.
4. **The release APK could not reach any http:// backend.** `app.json` carried
   `android.usesCleartextTraffic`, which is not part of the Expo config schema,
   so it was silently ignored and the build inherited Android's default of
   blocking cleartext. Every sign-in failed with "could not reach PRANGARA"
   while the same URL answered fine from the device shell. Now set through
   `expo-build-properties`, and visible in the generated manifest.
5. **The on-device reader turned a consumer number into a rupee amount.** Found
   on the device, not in a test: OCR put "Net Amount Payable" next to
   `09876543` and the reader published it as an amount. Fixed by rejecting
   leading-zero identifiers and requiring a currency token, with the real
   recogniser output kept as a regression fixture.
6. **Two backends were bound to port 8000 during development** — a stale
   instance on `127.0.0.1` shadowing a fresh one on `0.0.0.0`, which is why
   several routers appeared to 404. Worth knowing when a "missing endpoint"
   turns up.

## Files changed

```text
apps/mobile/App.tsx                          fonts, endpoint restore
apps/mobile/app.json                         version 0.2.0, versionCode 2, expo-font
apps/mobile/package.json                     jest config, test scripts, new deps
apps/mobile/jest.setup.js                    native module stubs, network kill-switch
apps/mobile/tsconfig.json                    jest types, resolveJsonModule
apps/mobile/scripts/build-apk.ps1            reproducible APK build
apps/mobile/src/theme/tokens.ts              ported from the web tokens
apps/mobile/src/lib/format.ts                the web's money/number/payback rules
apps/mobile/src/api/client.ts                persisted endpoint override
apps/mobile/src/api/endpoints.ts             scenarios, compliance, marketplace,
                                             logistics, assistant, audit, reference
apps/mobile/src/api/types.ts                 engine panels, platform models
apps/mobile/src/auth/AuthContext.tsx         offline demonstration mode
apps/mobile/src/components/charts.tsx        SVG charts
apps/mobile/src/components/layout.tsx        page furniture
apps/mobile/src/components/ui.tsx            unchanged API, new tokens
apps/mobile/src/ml/                          on-device OCR, vision and field rules
apps/mobile/src/components/ExtractedFields.tsx  what a machine read, and where
apps/mobile/src/data/demo-assessments.json   bundled engine payload (10 sectors)
apps/mobile/src/data/network.ts              cluster and corridor content
apps/mobile/src/navigation/                  five tabs, every module a stack screen
apps/mobile/src/screens/                     13 new module screens
apps/mobile/src/workspace/WorkspaceContext.tsx  active plant and assessment
backend/app/api/routes_logistics.py          accessible_factory_ids signature fix
backend/tests/test_logistics.py              authenticated regression test
docs/DEMO-FIXTURES.md                        how to regenerate the payload
```

## API/schema changes

None. Every endpoint the new modules call already existed and is already tested.
`src/api/types.ts` still mirrors `packages/contracts/openapi.json` and invents
no field; `data_quality` became optional to match what the engine actually
returns on an unpersisted run.

## Database migrations

None.

## Commands run

```bash
cd apps/mobile
npm run typecheck                    # clean
npm test                             # 112 passed
powershell -File scripts/build-apk.ps1

cd ../../backend
python -m pytest -q                  # 202 passed
```

## Known issues

1. **The offline queue still has no server-side idempotency.** Each queued item
   carries a `clientRef` the intake and evidence endpoints do not consume, so
   replay safety rests on only retrying network failures.
2. **OCR shows as unavailable.** Correct behaviour — the backend reports no OCR
   runtime; both scan screens fall through to manual entry with the photo
   already stored as evidence.
3. **The release APK is signed with the generated debug keystore.** Fine for
   sideloading, wrong for Play distribution. A release keystore would have to be
   held outside the repository and wired through the build script.
4. **`android/` is not committed.** `expo prebuild` regenerates it, which is why
   every build setting that must survive regeneration lives in
   `scripts/build-apk.ps1` — including the SDK location, since a clean prebuild
   drops `local.properties`.
5. **The what-if simulator needs a signed-in plant.** It reruns the real engine
   server-side rather than approximating locally, so the demonstration mode
   shows the controls and says plainly that it cannot run one. The web app's
   version of this screen does compute locally with hardcoded factors; the
   mobile one deliberately does not.

## Dependencies on another role

- **BE-1:** honouring `clientRef` for idempotent replay.
- **BE-2:** an OCR runtime (both scan screens are built and waiting).
- **FE-1:** none. Shared contract and shared design tokens only — if a web token
  changes, port it rather than inventing a mobile value.

## Next safe task

Provider-side screens (submit a quote, manage services) and compliance
corrective-action upload from the phone. Both endpoints exist and are tested,
and the marketplace and compliance screens already have the panels they would
slot into.
