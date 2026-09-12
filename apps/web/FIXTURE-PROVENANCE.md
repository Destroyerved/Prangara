# Fixture provenance

## Scope

These files are development fixtures for a frontend demonstration. They are not engine responses, measured plant records, verified emissions inventories, or financial forecasts.

The supplied project report was read in full (56 PDF pages). No backend repository or original domain JSON was supplied. The user then explicitly requested a standalone frontend for later backend attachment. Source references below refer to the supplied report, not independently verified official publications.

## Report-derived headline values

The Tirupur textile example preserves:

| Metric                  | Value                                                    |
| ----------------------- | -------------------------------------------------------- |
| Annual footprint        | 24,069 tCO₂e                                             |
| Low / high              | 19,414 / 29,492 tCO₂e                                    |
| Headline uncertainty    | ±20.9%                                                   |
| Approximate scope split | 28% / 8% / 64%                                           |
| Cotton hotspot          | 14,580 tCO₂e; 60.6%                                      |
| Cash-positive portfolio | 17 actions; 6,013 tCO₂e; about 25%                       |
| Annual net benefit      | ₹4.66 Cr                                                 |
| Cash-positive CAPEX     | ₹4.56 Cr                                                 |
| Blended payback         | About 12 months                                          |
| All available actions   | 21; 10,210 tCO₂e; about 42%                              |
| Quick wins              | 7; ₹25.9 L CAPEX; ₹56.7 L annual benefit; about 5 months |

Headline and demo references: report pp3, 30–31, 46. Input scale uses the textile example of 2,400 t/year, ₹34 Cr/year and 180 employees. Electricity intensity 1,250 kWh/t, median 850, p25 620 and stream position p78 follow the report. Process heat position p76 is retained.

The nine other sector snapshots preserve only the report p31 footprint, cash-positive share, annual benefit and blended payback. Their detailed scope, stream, uncertainty, benchmark and portfolio-action data are not supplied and remain empty or null. Display names identify illustrative report profiles, not verified operating businesses.

## Illustrative development detail

The following are explicitly synthetic, even when their totals match the report:

- The eight-stream inventory allocation other than the cited cotton amount, exact scope totals/shares, activity quantities, Tamil Nadu grid factor and Sankey data.
- Stream uncertainty bands, allocated proportionally to the report headline range. These do not demonstrate factor-level uncertainty propagation.
- Detailed economic and implementation records for 21 actions: CAPEX, net benefit, LCOA, individual payback, confidence, difficulty, disruption, lifetime and per-action abatement.
- Per-action standalone and de-rated widths and the selected-portfolio curves. They are constructed to exercise chart scaling, filtering, overlap explanation and extreme-value clipping. They do not reproduce the engine's optimization.
- All-portfolio and quick-win totals not explicitly listed above, including quick-win tonnes. Portfolio records are fixed JSON; the browser does not calculate them.
- Electricity p75 = 1,200 kWh/t and the split of the 2,616 t recovery illustration into electricity 624 and heat 1,992. Only the report's stated headline/positions are treated as transcribed evidence.
- Gate-to-gate and cradle-to-gate intensities, zero biogenic memo, 20% EU export input and BRSR readiness example statuses.
- Starter input profiles for the other nine sectors reuse the textile scale/activity values with changed identity. They are form-development defaults and do not generate their report headline results. Replace them with real demo profiles on integration.

Gross savings, OPEX deltas and NPV were not supplied and are null. CBAM reference price, exposure tonnes and monetary liability are null. The dashboard does not fabricate a current certificate price or imply legal applicability.

## Constraints from the report

Cotton blending is capped at 25%. The report's illustrative sector restrictions are preserved: pharmaceutical primary recycled PET is blocked for material-qualification reasons; ceramic kiln biomass is blocked for ash compatibility; food-contact recycled PET is capped at 35%; secondary steel in the auto-components example is capped at 45%.

These are examples from the report (pp26, 53), not a substitute for current engineering or regulatory validation. Constraints for non-textile sectors have no evaluated economics. Internal placeholder zeros in constraint-only records are never shown as an economic recommendation or added to a portfolio.

## Reference catalogue

`src/data/reference.json` has 28 rows:

- 27 report-derived rows: national, Kerala and West Bengal grid examples; six fuels; fourteen materials; two freight modes; two waste treatments.
- One explicitly illustrative Tamil Nadu grid value of 0.65 tCO₂e/MWh, used for the textile demonstration.

Factor references are transcribed from report pp15–17. Source labels identify the report and its cited source family. No edition, vintage, DOI or current URL has been invented. Available national-grid/fuel low/high bands are retained; unknown bands and vintages are null. Anaerobic digestion retains a negative reference factor.

The report describes 31 factors and 15 state variants; the complete underlying library was not supplied. The UI does not claim to include that full catalogue.

## Implementation and integrity

`work/generate_fixtures.py` records how the static data was assembled. It is a development artifact, is not part of the runtime, and is not an implementation of the carbon engine. It is not needed to run or build the app.

`domain.test.ts` checks schema validity, known-null handling, scope/Sankey consistency, selected-portfolio totals, stream capacities, factor signs and input boundaries. Matching those invariants does not validate the scientific or financial assumptions.

Demo labels appear in the shell, overview, methodology and detail drawers. JSON portfolio exports retain origin metadata. Input exports contain only the editable profile. API mode never silently substitutes these fixtures when a request fails.
