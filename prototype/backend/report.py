"""
Per-assessment PDF report.

The MACC is rendered server-side as inline SVG rather than shipped as a bitmap,
so the chart in the PDF is the same chart the engine computed, vector-sharp at
any zoom, with no headless-screenshot step to go wrong.

Rendering to PDF uses headless Chrome, which is already a dependency of the
docs build. If no browser is present the HTML is still returned - a report you
can open in a browser beats an error.
"""
from __future__ import annotations

import html
import os
import shutil
import subprocess
import tempfile
from typing import Any

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser",
]


def _chrome() -> str | None:
    for p in CHROME_CANDIDATES:
        if os.path.isfile(p):
            return p
    return shutil.which("google-chrome") or shutil.which("chromium") or shutil.which("chrome")


def e(s: Any) -> str:
    return html.escape(str(s if s is not None else ""))


def inr(v: float | None) -> str:
    if v is None:
        return "—"
    a, sign = abs(v), "−" if v < 0 else ""
    if a >= 1e7:
        return f"{sign}₹{a / 1e7:,.2f} Cr"
    if a >= 1e5:
        return f"{sign}₹{a / 1e5:,.1f} L"
    if a >= 1e3:
        return f"{sign}₹{a / 1e3:,.1f}k"
    return f"{sign}₹{a:,.0f}"


def pay(m: float | None) -> str:
    if m is None:
        return "—"
    return "immediate" if m < 1 else (f"{m:.0f} mo" if m < 24 else f"{m / 12:.1f} yr")


# ---------------------------------------------------------------------------
# MACC as inline SVG
# ---------------------------------------------------------------------------

def macc_svg(curve: list[dict[str, Any]], w: int = 980, h: int = 380) -> str:
    if not curve:
        return "<p>No interventions matched this plant.</p>"

    L, R, T, B = 78, 20, 20, 96
    x_max = curve[-1]["x_start"] + curve[-1]["width"] or 1
    hs = sorted(c["height"] for c in curve)

    def q(f: float) -> float:
        return hs[min(len(hs) - 1, max(0, int(f * (len(hs) - 1))))]

    cap = min(15000.0, max(abs(q(0.08)), abs(q(0.92)), 1.0) * 1.9)
    hi, lo = min(max(hs + [0]), cap), max(min(hs + [0]), -cap)
    pad = (hi - lo) * 0.10 or 1
    y_min, y_max = lo - pad, hi + pad

    def px(v: float) -> float:
        return L + (v / x_max) * (w - L - R)

    def py(v: float) -> float:
        raw = T + (1 - (v - y_min) / (y_max - y_min)) * (h - T - B)
        return max(T, min(h - B, raw))

    y0 = py(0)
    parts = [f'<svg viewBox="0 0 {w} {h}" width="100%" xmlns="http://www.w3.org/2000/svg" '
             'font-family="Segoe UI,system-ui,sans-serif">']

    step = _nice((y_max - y_min) / 6)
    g = (int(y_min / step)) * step
    while g <= y_max:
        yy = py(g)
        zero = abs(g) < 1e-9
        parts.append(f'<line x1="{L}" y1="{yy:.1f}" x2="{w - R}" y2="{yy:.1f}" '
                     f'stroke="{"#16211c" if zero else "#e8ece9"}" stroke-width="{1.4 if zero else 1}"/>')
        lab = f"{g / 1000:,.0f}k" if abs(g) >= 1000 else f"{g:,.0f}"
        parts.append(f'<text x="{L - 8}" y="{yy + 3.5:.1f}" text-anchor="end" '
                     f'font-size="10" fill="#5d6b64">{lab}</text>')
        g += step

    clipped = 0
    for c in curve:
        x = px(c["x_start"])
        bw = max(1.0, px(c["x_start"] + c["width"]) - x)
        top = py(c["height"]) if c["height"] >= 0 else y0
        bh = max(1.5, abs(py(c["height"]) - y0))
        off = c["height"] > hi or c["height"] < lo
        clipped += 1 if off else 0
        fill = "#1c6b4b" if c["cash_positive"] else "#c8974a"
        dash = ' stroke="#16211c" stroke-width="1" stroke-dasharray="3 2"' if off else ""
        parts.append(f'<rect x="{x:.1f}" y="{top:.1f}" width="{max(0.8, bw - 0.8):.1f}" '
                     f'height="{bh:.1f}" fill="{fill}" opacity="0.88"{dash}/>')
        if bw > 46:
            cx = x + bw / 2
            nm = c["name"][:24] + ("…" if len(c["name"]) > 24 else "")
            parts.append(f'<text x="{cx:.1f}" y="{h - B + 12}" font-size="9" fill="#5d6b64" '
                         f'transform="rotate(38 {cx:.1f} {h - B + 12})">{e(nm)}</text>')

    parts.append(f'<line x1="{L}" y1="{T}" x2="{L}" y2="{h - B}" stroke="#d6dbd7"/>')
    note_y = y0 + 14 if y0 < T + 26 else y0 - 7
    parts.append(f'<text x="{L + 8}" y="{note_y:.1f}" font-size="10" fill="#1c6b4b" '
                 'font-weight="600">below this line the intervention pays for itself</text>')
    parts.append(f'<text x="{(L + w - R) / 2:.0f}" y="{h - 6}" text-anchor="middle" '
                 f'font-size="10.5" fill="#5d6b64">Cumulative abatement — '
                 f'{x_max:,.0f} tCO₂e a year available</text>')
    if clipped:
        parts.append(f'<text x="{w - R}" y="{T + 10}" text-anchor="end" font-size="9" '
                     f'fill="#5d6b64">{clipped} bar(s) clipped at ±₹{cap / 1000:,.0f}k</text>')
    parts.append("</svg>")
    return "".join(parts)


def _nice(raw: float) -> float:
    import math
    p = 10 ** math.floor(math.log10(abs(raw) or 1))
    n = raw / p
    return (1 if n <= 1 else 2 if n <= 2 else 5 if n <= 5 else 10) * p


# ---------------------------------------------------------------------------
# document
# ---------------------------------------------------------------------------

CSS = """
@page{size:A4;margin:14mm 13mm 15mm}
*{box-sizing:border-box}
body{margin:0;font:10pt/1.5 "Segoe UI",system-ui,sans-serif;color:#16211c}
h1,h2,h3{margin:0;line-height:1.22;font-weight:650;letter-spacing:-.01em}
.hdr{background:#16211c;color:#fff;padding:15mm 13mm;margin:-14mm -13mm 9mm}
.hdr .b{font-size:26pt;font-weight:680;letter-spacing:-.02em}
.hdr .t{color:#9fb3a9;font-size:10pt;margin-top:3px}
.hdr .p{margin-top:11px;padding-top:9px;border-top:1px solid #33463d;font-size:13pt;font-weight:600}
.hdr .m{color:#9fb3a9;font-size:9pt;margin-top:3px}
h2{font-size:12.5pt;margin:16px 0 7px;padding-bottom:5px;border-bottom:1.5px solid #16211c;page-break-after:avoid}
.k{display:flex;gap:7px;margin:0 0 10px;flex-wrap:wrap}
.kpi{flex:1;min-width:110px;border:1px solid #e2e6e1;border-radius:6px;padding:9px 11px}
.kpi .l{font-size:7.6pt;text-transform:uppercase;letter-spacing:.06em;color:#5d6b64;font-weight:650}
.kpi .v{font-size:16pt;font-weight:670;margin-top:2px;letter-spacing:-.02em}
.kpi .n{font-size:7.8pt;color:#5d6b64;margin-top:1px}
.kpi.dark{background:#16211c;border-color:#16211c}
.kpi.dark .l{color:#8fa89d}.kpi.dark .v{color:#fff}.kpi.dark .n{color:#9fb3a9}
.kpi.pos .v{color:#1c6b4b}
.stmt{background:#e9f2ed;border-left:3px solid #1c6b4b;border-radius:0 5px 5px 0;
  padding:9px 13px;font-size:10pt;margin-bottom:11px}
table{width:100%;border-collapse:collapse;font-size:8.4pt;margin:7px 0 11px;page-break-inside:auto}
th{background:#f1f4f2;text-align:left;padding:5px 7px;border:1px solid #dde2df;font-size:7.8pt;font-weight:650}
td{padding:4px 7px;border:1px solid #e7ebe8;vertical-align:top}
tr{page-break-inside:avoid}
td.r,th.r{text-align:right;font-family:Consolas,monospace}
.pos{color:#1c6b4b;font-weight:600}.neg{color:#a33327}
.leak{border:1px solid #e2e6e1;border-left:3px solid #b9c4bd;border-radius:5px;
  padding:8px 11px;margin-bottom:7px;page-break-inside:avoid}
.leak.critical{border-left-color:#a33327}.leak.high{border-left-color:#9a6512}
.leak b{font-size:10pt}
.leak .f{font-size:8.8pt;color:#39463f;margin-top:3px}
.pill{display:inline-block;font-size:7pt;font-weight:650;text-transform:uppercase;
  letter-spacing:.04em;padding:1.5px 6px;border-radius:9px;vertical-align:1px}
.p-critical{background:#fbe6e2;color:#a33327}.p-high{background:#fbf0dc;color:#9a6512}
.p-moderate,.p-watch{background:#eef1ef;color:#5d6b64}
.blocked{background:#fbe6e2;border:1px solid #f0cdc6;border-radius:5px;padding:8px 11px;
  margin-bottom:6px;font-size:8.6pt;page-break-inside:avoid}
.blocked b{color:#a33327}
.restricted{background:#fbf0dc;border-color:#eeddba}.restricted b{color:#9a6512}
.two{display:flex;gap:11px}.two>*{flex:1}
.cav{background:#fbfaf6;border:1px dashed #ddd8c8;border-radius:5px;padding:8px 11px;
  font-size:8.2pt;color:#5f5a49;margin-top:8px}
.foot{margin-top:14px;padding-top:8px;border-top:1px solid #e2e6e1;font-size:7.8pt;color:#5d6b64}
"""


def build_html(result: dict[str, Any], plant_name: str, when: str) -> str:
    h = result["headline"]
    fp = result["footprint"]
    rec = result["recommendations"]
    cp = rec["portfolio"]["cash_positive_only"]
    qw = rec["portfolio"]["quick_wins"]
    lk = result["leaks"]
    comp = result["compliance"]
    meth = result["methodology"]

    kpis = f"""
    <div class="k">
      <div class="kpi dark"><div class="l">Annual footprint</div>
        <div class="v">{fp['total_tco2e']:,.0f}</div>
        <div class="n">tCO₂e · range {fp['total_range']['low']:,.0f}–{fp['total_range']['high']:,.0f} (±{fp['uncertainty_pct']}%)</div></div>
      <div class="kpi"><div class="l">Largest leak point</div>
        <div class="v">{h['top_leak_share_pct'] or 0}%</div>
        <div class="n">{e(h['top_leak'] or '—')}</div></div>
      <div class="kpi pos"><div class="l">Pays for itself</div>
        <div class="v">{inr(cp['net_annual_benefit_inr'])}</div>
        <div class="n">per year · {cp['count']} interventions · {pay(cp['blended_payback_months'])} payback</div></div>
      <div class="kpi"><div class="l">Abatement at no net cost</div>
        <div class="v">{cp['abatement_pct']}%</div>
        <div class="n">{cp['abatement_tco2e']:,.0f} tCO₂e · {rec['total_abatement_pct']}% available in total</div></div>
    </div>"""

    scopes = "".join(
        f"<tr><td>{e(s['label'])}</td><td>Scope {s['scope']}</td>"
        f"<td class='r'>{s['activity_qty']:,.0f} {e(s['activity_unit'])}</td>"
        f"<td class='r'>{s['tco2e']:,.0f}</td><td class='r'>{s['share_pct']}%</td>"
        f"<td style='font-size:7.4pt;color:#5d6b64'>{e(s['source'])}</td></tr>"
        for s in fp["streams"])

    leaks = "".join(
        f"<div class='leak {e(l['severity'])}'><b>{e(l['label'])}</b> "
        f"<span class='pill p-{e(l['severity'])}'>{e(l['severity'])}</span> "
        f"<span style='font-size:8pt;color:#5d6b64'>· {l['share_pct']}% of footprint · "
        f"{l['tco2e']:,.0f} tCO₂e</span>"
        f"<div class='f'>{e(l['finding'])}</div></div>"
        for l in lk["leaks"]) or "<p>No leak points detected above threshold.</p>"

    rows = "".join(
        f"<tr><td><b>{e(r['name'])}</b>"
        f"{' <span class=pill p-high>capped</span>' if r.get('substitution_capped') else ''}"
        f"<div style='font-size:7.4pt;color:#5d6b64'>{e(r['target_stream_label'])} · "
        f"{e(r['confidence'])} confidence · difficulty {r['difficulty']}/5 · "
        f"{r['disruption_days']}d downtime</div></td>"
        f"<td style='font-size:7.6pt'>{e(r['category'])}</td>"
        f"<td class='r'>{r['portfolio_abatement_tco2e']:,.0f}</td>"
        f"<td class='r {'pos' if r['cash_positive'] else ''}'>{r['lcoa_inr_per_tco2e']:,.0f}</td>"
        f"<td class='r'>{inr(r['capex_inr'])}</td>"
        f"<td class='r {'pos' if r['net_annual_benefit_inr'] >= 0 else 'neg'}'>{inr(r['net_annual_benefit_inr'])}</td>"
        f"<td class='r'>{pay(r.get('payback_months'))}</td></tr>"
        for r in rec["recommendations"])

    refused = "".join(
        f"<div class='blocked'><b>✕ {e(b['name'])}</b><div>{e(b['reason'])}</div></div>"
        for b in rec.get("blocked", []))
    refused += "".join(
        f"<div class='blocked restricted'><b>⚠ {e(r['name'])} — capped</b>"
        f"<div>{e(r['restriction_note'])}</div></div>"
        for r in rec["recommendations"] if r.get("restriction_note"))

    cb = comp["cbam"]
    cbam_html = (
        f"<div class='kpi'><div class='l'>Indicative annual exposure</div>"
        f"<div class='v'>{inr(cb['indicative_annual_cost_inr'])}</div>"
        f"<div class='n'>{cb['embedded_emissions_exported_tco2e']:,.0f} tCO₂e embedded at "
        f"{cb['eu_export_share_pct']}% EU export share</div></div>"
        f"<div class='cav'><b>Basis.</b> {e(cb['basis'])}<br><br>{e(cb['caveat'])}</div>"
        if cb["applicable"] else
        f"<p style='font-size:8.6pt;color:#5d6b64'>CBAM does not currently cover this sector's "
        f"product lines. {e(cb['caveat'])}</p>")

    brsr = "".join(
        f"<tr><td>{e(r['item'])}</td><td style='font-size:7.6pt'>{e(r['status'])}</td>"
        f"<td class='r'>{r.get('value_tco2e', '') or ''}</td></tr>"
        for r in comp["brsr"]["readiness"])

    prov = lk.get("benchmark_provenance") or {}
    blended = [f"{k} (n={v['n']}, weight {v['weight']})"
               for k, v in prov.items() if v.get("source") == "blended"]
    bench_line = ("Benchmarks blended with the live corpus: " + "; ".join(blended)
                  if blended else "Benchmarks are literature priors; no corpus data yet for this sector.")

    return f"""<!doctype html><html><head><meta charset="utf-8">
<title>Chakra — {e(plant_name)}</title><style>{CSS}</style></head><body>
<div class="hdr">
  <div class="b">Chakra</div>
  <div class="t">See where your carbon leaks. Close the loop with numbers that pay.</div>
  <div class="p">{e(plant_name)}</div>
  <div class="m">{e(result['profile']['sector_label'])} · {e(result['profile'].get('state') or '')} · assessed {e(when)}</div>
</div>

{kpis}
<div class="stmt">{e(h['statement'])}</div>

<h2>Emission inventory</h2>
<table><thead><tr><th>Source</th><th>Scope</th><th class="r">Activity</th>
<th class="r">tCO₂e</th><th class="r">Share</th><th>Factor source</th></tr></thead>
<tbody>{scopes}</tbody></table>
<p style="font-size:8.2pt;color:#5d6b64">Scope 1 {fp['scope1_tco2e']:,.0f} · Scope 2 {fp['scope2_tco2e']:,.0f} ·
Scope 3 {fp['scope3_tco2e']:,.0f} tCO₂e. Biogenic CO₂ of {fp['biogenic_co2_t']:,.0f} t is reported
separately and excluded from the Scope 1 total per GHG Protocol.</p>

<h2>Leak points</h2>
{leaks}
<div class="cav">{e(lk['benchmark_caveat'])}<br><br>{e(bench_line)}</div>

<h2>Marginal abatement cost curve</h2>
{macc_svg(rec['macc_curve'])}
<p style="font-size:8.2pt;color:#5d6b64">Bar width is tCO₂e abated a year; height is rupees per tonne.
Green bars have a negative cost of abatement — they pay for themselves. Bars are de-rated for
interaction: each intervention applies to what the one before it left behind.</p>

<h2>Costed interventions</h2>
<table><thead><tr><th>Intervention</th><th>Type</th><th class="r">tCO₂e/yr</th>
<th class="r">₹/tCO₂e</th><th class="r">Capex</th><th class="r">Net ₹/yr</th>
<th class="r">Payback</th></tr></thead><tbody>{rows}</tbody></table>
<p style="font-size:8.2pt;color:#5d6b64"><b>Start here:</b> {qw['count']} quick wins —
payback under two years and low implementation difficulty — need {inr(qw['capex_inr'])} of capital
and return {inr(qw['net_annual_benefit_inr'])} a year.</p>

{f'<h2>Considered and rejected</h2>{refused}' if refused else ''}

<h2>Compliance exposure</h2>
<div class="two">
  <div><h3 style="font-size:10pt;margin-bottom:5px">CBAM</h3>{cbam_html}</div>
  <div><h3 style="font-size:10pt;margin-bottom:5px">BRSR readiness</h3>
    <table><tbody>{brsr}</tbody></table></div>
</div>

<h2>Methodology and limitations</h2>
<p style="font-size:8.6pt">{e(meth['standard'])} · {e(meth['gwp'])} · grid factor: {e(fp['grid_source'])}.</p>
<div class="cav"><b>Factors.</b> {e(meth['factor_note'])}<br><br>
<b>Verification status.</b> {e(meth['verification_status'])}<br><br>
<b>Leak rule.</b> {e(meth['leak_rule'])}<br><br>
<b>Interaction.</b> {e(rec['assumptions']['derating_note'])}<br><br>
<b>Capex.</b> {e(rec['assumptions']['capex_note'])}</div>

<div class="foot">Screening assessment — not a BEE-accredited energy audit and not an assurance
engagement. Economics are planning-grade estimates intended to rank options and justify obtaining a
vendor quotation, not to replace one. Assumptions: electricity at
₹{rec['assumptions']['electricity_tariff_inr_per_kwh']}/kWh, cost of capital
{rec['assumptions']['discount_rate'] * 100:.0f}%.</div>
</body></html>"""


def to_pdf(html_str: str) -> bytes | None:
    """Render HTML to PDF bytes. Returns None if no browser is available."""
    chrome = _chrome()
    if not chrome:
        return None
    with tempfile.TemporaryDirectory() as d:
        src = os.path.join(d, "r.html")
        out = os.path.join(d, "r.pdf")
        with open(src, "w", encoding="utf-8") as fh:
            fh.write(html_str)
        try:
            subprocess.run(
                [chrome, "--headless=new", "--disable-gpu", "--no-sandbox",
                 "--no-pdf-header-footer", "--run-all-compositor-stages-before-draw",
                 "--virtual-time-budget=8000", f"--print-to-pdf={out}",
                 "file:///" + src.replace("\\", "/")],
                capture_output=True, timeout=120)
        except (subprocess.TimeoutExpired, OSError):
            return None
        return open(out, "rb").read() if os.path.isfile(out) else None
