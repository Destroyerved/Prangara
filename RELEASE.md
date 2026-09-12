# Release v0.1.0 - PRANGARA Decarbonization OS & Mobile Companion

PRANGARA is an industrial decarbonization operating system that translates complex facility activity data (electricity, fossil fuels, freight, materials) into statutory audit-grade carbon accounts, cash-positive marginal abatement cost curves (MACC), and verified regulatory reporting.

---

## 📦 Release Assets & Download

| Asset | Path | Description |
|:---|:---|:---|
| **Android Standalone APK (Debug / Dev)** | `prangara-companion.apk` | Fat multi-ABI APK for immediate installation on any Android device |
| **Android Production APK (Release)** | `apps/mobile/android/app/build/outputs/apk/release/app-release.apk` | Optimized production release APK with Hermes bytecode |

---

## 🌟 What's New in v0.1.0

### 1. 📱 Mobile Floor Companion (`apps/mobile`)
- **Executive Hero & Scope Breakdown**:
  - Live **"YOUR CASH-POSITIVE OPPORTUNITY"** indicator displaying potential annual net recurring savings (e.g. ₹6.4L/yr).
  - Tri-color proportional Scope split visualization:
    - **Scope 1 (Direct)**: Coral `#FFB689`
    - **Scope 2 (Electricity)**: Lavender `#BEC2FF`
    - **Scope 3 (Value Chain)**: Electric Cyan `#38BDF8`
- **Ask PRANGARA ✨ (Sovereign RAG Copilot)**:
  - Instant statutory reasoning for plant engineers on the factory floor.
  - Verification grades and statutory citations for **BEE PAT Scheme**, **SEBI BRSR Core**, **EU CBAM**, and **CEA Grid Factors**.
- **1-Tap Demo Switcher**:
  - Pre-seeded with *Factory Owner* (`owner@demo.prangara.example`) and *Platform Admin* (`admin@demo.prangara.example`).
  - Dynamic API URL switcher defaulting to local/LAN endpoint (`http://10.227.95.161:8000`).
- **Hardware Integration**:
  - Camera permissions and storage handlers for bill scanning, electricity meter readings, and machine nameplate capture.

### 2. 🖥️ Web Decarbonization Dashboard (`apps/web`)
- Full modern dark space theme (`#080B11`) with electric cyan highlights and glassmorphic cards.
- Marginal Abatement Cost Curve (MACC) visualization.
- Instant PDF audit report export for physical compliance filings.
- 21/21 Vitest test suites passing.

### 3. ⚙️ Thermodynamic & Statutory Backend (`backend`)
- FastAPI engine with deterministic carbon accounting traceable to CEA v20, BEE, and IPCC emission factors.
- Full migration history with SQLite/PostgreSQL support.
- 201/201 pytest test suites passing.

---

## 📲 Installation Instructions

### Via Android Debug Bridge (ADB):
```powershell
adb install -r prangara-companion.apk
```

### Direct Install:
1. Transfer `prangara-companion.apk` to your device via USB or file sharing.
2. Enable "Install from unknown sources" if prompted.
3. Open the app, sign in with demo credentials, and start scanning!
