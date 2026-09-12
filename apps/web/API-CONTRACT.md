# Proposed frontend API contract

## Integration status

The user requested the frontend independently and will attach their backend. No backend source, OpenAPI document, reference JSON, or live endpoint was available. Endpoint paths follow the project report; **their actual implementation and payload shapes have not been verified**. No backend or carbon engine was created.

`src/types/domain.ts` is the executable canonical contract. It exports Zod schemas and inferred TypeScript types. `src/api/adapter.ts` is the single response-mapping boundary. Its adapters currently pass payloads through unchanged.

## Configuration

| Setting           | Default               | Purpose                                                       |
| ----------------- | --------------------- | ------------------------------------------------------------- |
| VITE_DATA_MODE    | demo                  | Use api to make HTTP requests; otherwise fixed local fixtures |
| VITE_API_BASE_URL | /api                  | Browser-visible API prefix; may be a full URL                 |
| API_PROXY_TARGET  | http://127.0.0.1:8077 | Vite development proxy target; retains the /api path          |

If the backend exposes `/health` rather than `/api/health`, add an explicit Vite proxy rewrite or use the appropriate base URL. The current proxy does not strip `/api`.

Vite environment values are build-time configuration. Restart after editing them; rebuild for production. Never put secrets in a VITE_ variable. Vite's development proxy is not included in `dist/`. A production web server must proxy the API or the backend must allow the frontend origin via CORS.

## Routes and payloads

| Method | Path relative to base | Canonical result                                       |
| ------ | --------------------- | ------------------------------------------------------ |
| GET    | /health               | Any successful JSON response; connectivity status only |
| GET    | /sectors              | Sector[]                                               |
| GET    | /sector/{key}         | Sector                                                 |
| GET    | /reference            | Factor[]                                               |
| GET    | /demo/{key}           | Assessment                                             |
| POST   | /assess               | PlantProfile request → Assessment response             |

Keys are URL-encoded. Reference, sector and assessment payloads are validated after adaptation. The HTTP client uses a 15-second timeout, cancellation for queries, readable 422/server/network errors, and no fixture fallback. Query requests retry once. Assessment submission is not automatically retried.

## PlantProfile request

See `src/data/sectors.json` for complete example profiles. Example:

```json
{
  "name": "Example facility",
  "sector": "textile_dyeing",
  "state": "Tamil Nadu",
  "annual_output_t": 2400,
  "annual_revenue_cr": 34,
  "employees": 180,
  "electricity_kwh": 3000000,
  "fuels": { "coal": 3900, "diesel": 39925.37 },
  "materials": { "cotton_yarn": 2650.91, "board": 120 },
  "waste": { "waste_landfill": 400 },
  "freight": { "road_freight": 4000000, "rail_freight": 1818181.82 },
  "tariff": 8,
  "discount_rate": 0.12,
  "eu_export_share_pct": 20
}
```

This is an illustrative input, not a measured facility record.

- Output is tonnes/year; revenue is crore INR/year.
- Electricity is kWh/year. The engine performs its own conversion to factor units.
- Fuel/material/waste/freight dictionaries use reference factor keys and their native denominator units. Examples: diesel in litres, LPG in kg, coal in tonnes, natural gas in Sm³, freight in tonne-kilometres.
- Tariff is INR/kWh. Cost of capital is a fraction; the form displays 12% and submits 0.12.
- Export share is a percentage from 0 to 100.
- Quantities cannot be negative. Output must be positive; employees must be a nonnegative integer.
- There is no reporting-period selector: the report specifies an annual facility snapshot.

If your engine's request uses different field names or nested models, map the validated PlantProfile at the POST boundary in `client.ts`. Do not change unit semantics silently.

## Assessment response

A complete development example is `src/data/assessments.json → textile_dyeing`. This is a fixture, not a captured backend response.

| Field           | Required contents                                                                                                                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| id              | Stable assessment identifier; change it for a new result                                                                                       |
| plant           | The canonical PlantProfile actually assessed                                                                                                   |
| origin          | kind: engine or development_fixture, note, reference                                                                                           |
| footprint       | Total base/low/high, uncertainty percentage, scope totals/shares, stream inventory, gate-to-gate and cradle-to-gate intensities, biogenic memo |
| sankey          | Nodes with stable IDs and links with source/target IDs, tonnes and scope                                                                       |
| leaks           | Optional overall peer percentile and findings with rule, severity, share, intensity, p25/p50/p75, stream percentile, recovery and explanation  |
| recommendations | Evaluated items, blocked/constraint-only records and three precomputed portfolios                                                              |
| compliance      | CBAM exposure, reference price, export share, included/excluded boundaries and assumptions; BRSR readiness rows                                |
| methodology     | Standard, GWP basis, boundary, assumptions and limitations                                                                                     |

The schema in `domain.ts` defines every nested field and enum. Nullable unknowns must be explicit `null`; zero means a known zero. Full stream bands currently require base/low/high numbers. Do not emit incomplete streams with invented bands; extend the schema and renderer if your actual engine can return partial bands.

### Actions and portfolios

Each action has stable ID, category, target stream, applicability status, quick-win flag, substitution cap, restriction, CAPEX, annual net benefit, optional gross savings/OPEX/NPV/payback, LCOA, standalone and de-rated tonnes, standalone range, implementation detail, evidence and caveats.

The frontend **does not derive** status, quick-win eligibility, payback, LCOA or portfolio economics. Return them from the engine. Unknown numerical core action fields currently require extending the schema; never manufacture zeros for evaluated actions.

Portfolios are keyed `all`, `cash_positive_only`, and `quick_wins`. Each includes IDs, count, abatement, share, CAPEX, net benefit, payback, NPV and a cost-ordered curve of `{id, abatement_t, lcoa}`. Return the final de-rated width for that portfolio. The MACC consumes it directly. Portfolio totals are not re-summed by the UI.

Action drawer de-rating uses each action's `abatement_t`. If the actual engine calculates different per-action values for each portfolio, preserve that distinction in an extended canonical contract and drawer context. The current illustrative fixture uses the same per-action value across portfolios.

### Reference and sector records

Factor includes key/name/group/scope, value/low/high, unit, source, vintage and optional state. Negative emission factors remain negative in the reference table. Negative factors do not imply a negative Sankey link.

Sector includes key/name/cluster/state, a demo_profile, benchmark rows and regulatory flags. Dynamic stream selectors use the case-sensitive groups Fuel, Material, Waste and Freight.

## Mapping checklist

1. Capture responses from all six real endpoints.
2. Compare them with `domain.ts`; implement only structural and unit-preserving mappings in the adapter.
3. Map the outbound profile if needed.
4. Return `origin.kind: "engine"` only for actual engine output.
5. Match action targets, stream IDs, factor keys, graph node IDs and portfolio curve IDs.
6. Preserve factor signs, unknown values, caps, refusals and backend-supplied uncertainties.
7. Verify each engine total and portfolio figure against its displayed value.
8. Run the existing tests, then add adapter tests using redacted actual engine responses.

The API client currently has no authentication or token refresh. Add your established backend auth mechanism to the centralized request function; do not expose credentials in static frontend configuration.

Initial loading requests the textile demo. Once connected, ensure that key is supported or change the initial key in `useWorkspace.tsx`. The app currently requires a loaded assessment to initialize the profile form. If your backend provides no demo endpoint, add an explicit blank-profile bootstrap instead of inventing an assessment.
