# Demonstration fixtures

The mobile app bundles `apps/mobile/src/data/demo-assessments.json`: one real
engine result per sector, so a freshly installed APK is fully explorable with no
backend in reach. It is the mobile counterpart of the web app's
`src/data/assessments.json`.

It is **engine output, not hand-written content**. Nothing in it is typed by
hand, and nothing in the app computes a carbon or financial figure from it —
the modules only format and lay out what the engine already decided.

## Regenerating it

Run this from `backend/` after any change to the engine, the factor registry,
the sector registry or the intervention library:

```bash
cd backend
python - <<'PY'
import json, os
from engine import assess, sector_db, version_stamp

s = sector_db()
out = {}
for key in s.sectors:
    sector = s.get(key)
    profile = dict(sector.get("demo_profile", {}))
    profile["sector"] = key
    profile.setdefault("eu_export_share_pct", 25)
    result = assess(profile)
    result["versions"] = version_stamp()
    result["is_demo"] = True
    out[key] = {"profile": profile, "result": result, "sector_label": sector["label"]}

path = os.path.join("..", "apps", "mobile", "src", "data", "demo-assessments.json")
with open(path, "w", encoding="utf-8") as fh:
    json.dump(out, fh, separators=(",", ":"))
print("wrote", path, os.path.getsize(path) // 1024, "KB,", len(out), "sectors")
PY
```

Then check the shape still holds:

```bash
cd ../apps/mobile
npm test -- src/data/demo-assessments.test.ts
```

That test asserts the parts the modules actually read: scopes summing to the
total, a band around every point estimate, a drawable MACC curve, all three
portfolio modes, flow links pointing at nodes that exist, a reason on every
blocked intervention, and `is_demo` on every entry.

## What it deliberately does not contain

A **data-quality score**. `score_profile` needs the stored `FactoryProfile` and
`ActivityRecord` rows, which an unpersisted engine run does not have, so the
panel is genuinely absent and the modules print "Not supplied". The fixture test
asserts that absence on purpose, so nobody later writes a screen that assumes
the panel is there — and it is the same reason the web app's demo mode shows
"Data-quality score: Not supplied".

## Labelling

Every entry carries `is_demo: true`, and every module that renders it shows a
`DEMONSTRATION DATA` badge with the sector it belongs to. A demonstration figure
must never be readable as a measurement of the user's own plant.
