# Release v0.2.0 — PRANGARA Decarbonization OS & Mobile Companion

PRANGARA is an industrial decarbonization operating system. It turns facility
activity data — electricity, fossil fuels, freight, materials, waste — into
audit-grade carbon accounts with uncertainty bands, a costed marginal abatement
cost curve, and regulatory readiness working papers for EU CBAM, India CCTS and
SEBI BRSR Core.

Screening and decision support. Not a BEE-accredited audit, a legal assurance
service, a regulator or a carbon-credit verifier.

---

## 📦 Release assets

| Asset | Path | Description |
|:---|:---|:---|
| **Android APK (release)** | `prangara-companion-release.apk` | Standalone ARM build (`armeabi-v7a`, `arm64-v8a`), Hermes bytecode, installable on any Android 7+ phone |

Build it yourself:

```powershell
powershell -ExecutionPolicy Bypass -File apps/mobile/scripts/build-apk.ps1
```

The APK is signed with the Expo-generated debug keystore. That is fine for
sideloading and wrong for Play distribution — a store build needs a release
keystore held outside this repository.

---

## 🌟 What's new in v0.2.0

### The Android app now has web-dashboard parity

The companion previously covered capture only. It now carries every module the
browser app has, as a pushed screen from a module hub that mirrors the web
sidebar group for group:

- **Overview** — cash-positive hero, carbon hero with its band, metric strip,
  and the four numbered sections (diagnose, act, invest, prepare)
- **Plant Data** — activity inventory with data states, evidence on file, audit trail
- **Footprint** — scope split, uncertainty band, source-to-scope flow, stream inventory
- **Leak Points** — every finding with the rule that fired, peer quartiles, recoverable tonnes
- **What-If Simulator** — named engine-input modifications, rerun server-side
- **Circular Actions** — priced interventions, substitution caps, the refusals, and a writable tracker
- **Abatement Portfolio** — the MACC, plus the interaction de-rating explained
- **Marketplace & RFQs** — provider matching, quote requests, quote comparison, accept
- **Green Logistics** — multi-modal route planner, truck pooling, backhaul
- **Circular Network** — symbiosis listings, shared capacity, live supplier listings
- **Compliance** — CBAM, CCTS and BRSR readiness with rule-pack cases
- **Methodology** — standard, version stamp, limitations, the full factor registry

### One design system across both surfaces

`apps/mobile/src/theme/tokens.ts` is now a direct port of the web app's
`src/styles/tokens.css`: the web's monochrome dark theme with a `#060708`
ground, white accent, slate secondary, scope palette `#fb923c / #818cf8 /
#38bdf8`, chart colours `#10b981` and `#f43f5e`, `rgba` glass surfaces, and
the Manrope/Inter type ramp with the web's tight display
tracking. The bottom tab bar is the web's detached floating navbar — a glass
pill lifted off the bottom edge, with line icons drawn in SVG.

The charts are ports of the web geometry to `react-native-svg`: the MACC (width
is de-rated tonnes, height is ₹/tCO₂e, cash-positive below the zero line), the
scope band, the uncertainty band, the peer quartile strip, stream bars, and a
three-column stream → scope → total flow.

### A guided walkthrough

PRD section 32's demo story as 17 navigable steps — sign-in to verified
abatement — each one opening the module it belongs to and saying what to look
at. Progress is kept on the device, because a walkthrough on a factory floor
gets interrupted.

### The phone reads bills and nameplates by itself

Text recognition and image labelling run **on the device**, with the models
bundled into the APK rather than downloaded — so a bill or a machine nameplate
can be read standing in a plant room with no signal, and the photograph never
leaves the phone.

Measured on a OnePlus CPH2467 running Android 15:

| Photograph | Read on the phone |
|:---|:---|
| Electricity bill | 48,500 kWh and 750 kVA, billing period recognised as one month |
| Motor nameplate | 11 fields in 0.3 s — 7.5 kW, 10 HP, 1,440 rpm, 415 V, 89.4% efficiency, IE3, Crompton Greaves, 2019 |

Rows are rebuilt from the recogniser's own geometry before any rule runs, which
is what lets a two-column nameplate be read at all. Every value carries a
confidence and the exact printed line it came from, and nothing is saved until
a person confirms it. The rules refuse more than they accept: a leading zero
marks an identifier rather than a quantity, an amount needs a currency token
beside it, and a tariff is read only where the bill prints a rate — never
back-calculated from a total that includes fixed charges and duty.

The image labeller catches the most common failure on a factory floor, a
mis-framed photograph, before fields read from it are shown. It is a hint,
never a gate.

### It works with no backend in reach

The sign-in screen offers **Open the demonstration**: ten sectors of real engine
output bundled into the APK, with every analytical module working offline. It is
labelled as demonstration data everywhere it appears, and capture and
procurement stay read-only because those write to a real plant's record. See
`docs/DEMO-FIXTURES.md`.

### Fixes

- **`GET /api/shipments` and truck pooling returned 500 for any signed-in
  user.** `routes_logistics.py` called `accessible_factory_ids(principal)` where
  the helper takes `(db, principal)`. Every existing logistics test used the
  anonymous client, so the authenticated path was never exercised. Covered now
  by `test_signed_in_user_can_list_shipments_and_pool`.
- **The release APK could not reach any `http://` backend.** `app.json` carried
  `android.usesCleartextTraffic`, which is not an Expo config key, so it was
  silently ignored and Android's default of blocking cleartext applied. Every
  sign-in failed with "could not reach PRANGARA" while the same URL answered
  from the device shell. Now set through `expo-build-properties`.
- **A saved API endpoint did not survive an app restart**, so anyone pointing an
  installed APK at their own server had to retype the address on every launch.
- **Modules read a data-quality panel that an unpersisted engine run does not
  have.** They now print "Not supplied", which is also what the web app does.

---

## ✅ Verification

```text
backend    python -m pytest -q      202 passed
mobile     npx tsc --noEmit         clean
mobile     npm test                 172 passed
```

On-device reading was verified on real hardware, not only in tests: a OnePlus
CPH2467 running Android 15, with the release APK installed over ADB.

---

## 📲 Installation

Via ADB:

```bash
adb install -r prangara-companion-release.apk
```

Or copy the APK to the phone, allow installation from unknown sources, and open
it. Then either sign in against a running backend, or tap **Open the
demonstration**.

### Pointing the app at a backend

The Account screen shows the resolved endpoint and lets you change it; the
choice is remembered. Over USB, the simplest route is a reverse tunnel:

```bash
adb reverse tcp:8000 tcp:8000
```

then set the endpoint to `http://127.0.0.1:8000`. On Wi-Fi, use the laptop's LAN
address — `localhost` on a phone is the phone.

### Demo accounts

Password `prangara-demo-2026`:

| Role | Email |
|:---|:---|
| Plant owner | `owner@demo.prangara.example` |
| Compliance officer | `compliance@demo.prangara.example` |
| Platform admin | `admin@demo.prangara.example` |

Start the stack with `start.bat` (backend on `:8000`, web dashboard on `:5173`).
