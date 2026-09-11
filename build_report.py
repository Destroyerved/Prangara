"""
Build the combined Chakra report: docs/*.md -> one styled HTML -> one PDF.

Renders via headless Chrome so the print CSS (page breaks, running headers,
table styling) is honoured properly. No pandoc or LaTeX required.
"""
from __future__ import annotations

import datetime as dt
import glob
import os
import re
import shutil
import subprocess
import sys

import markdown

HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(HERE, "docs")
BUILD = os.path.join(HERE, "build")
os.makedirs(BUILD, exist_ok=True)

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]

CSS = """
@page { size: A4; margin: 17mm 15mm 18mm 15mm; }
@page :first { margin: 0; }

*{box-sizing:border-box}
body{margin:0;font:10.2pt/1.55 "Segoe UI",-apple-system,system-ui,sans-serif;color:#16211c}
h1,h2,h3,h4{line-height:1.22;font-weight:650;letter-spacing:-.01em;margin:0}

/* cover */
.cover{height:297mm;background:#16211c;color:#fff;padding:34mm 24mm;
  display:flex;flex-direction:column;justify-content:space-between;page-break-after:always}
.cover .mark{font-size:52pt;font-weight:680;letter-spacing:-.03em;line-height:1}
.cover .tagline{font-size:14pt;color:#9fb3a9;margin-top:10px;font-weight:400}
.cover .ps{margin-top:34px;padding-top:20px;border-top:1px solid #33463d;font-size:11.5pt;color:#c7d6ce}
.cover .ps b{color:#fff;display:block;font-size:14.5pt;margin-bottom:5px;font-weight:600}
.cover .stats{display:flex;gap:22mm;flex-wrap:wrap;margin-top:26px}
.cover .stat .v{font-size:23pt;font-weight:670;letter-spacing:-.02em}
.cover .stat .k{font-size:8.6pt;color:#8fa89d;text-transform:uppercase;letter-spacing:.07em;margin-top:3px}
.cover .foot{font-size:9.5pt;color:#7d938a}

/* contents */
.toc{page-break-after:always;padding-top:6mm}
.toc h2{font-size:17pt;margin-bottom:16px;padding-bottom:8px;border-bottom:2px solid #16211c}
.toc ol{padding-left:0;list-style:none;counter-reset:c}
.toc li{counter-increment:c;padding:7px 0;border-bottom:1px solid #eceeec;font-size:11pt}
.toc li::before{content:counter(c,decimal-leading-zero) "  ";color:#1c6b4b;font-weight:650}

/* document flow */
.doc{page-break-before:always}
.doc:first-of-type{page-break-before:avoid}
h1{font-size:18.5pt;margin:0 0 14px;padding-bottom:9px;border-bottom:2px solid #16211c}
h2{font-size:13.2pt;margin:19px 0 8px;color:#123;page-break-after:avoid}
h3{font-size:11.3pt;margin:15px 0 6px;page-break-after:avoid}
h4{font-size:10.2pt;margin:12px 0 4px;color:#5d6b64;page-break-after:avoid}
p{margin:0 0 8px}
ul,ol{margin:0 0 9px;padding-left:19px}
li{margin-bottom:3px}
hr{border:0;border-top:1px solid #e2e6e1;margin:16px 0}
a{color:#1c6b4b;text-decoration:none}
strong{font-weight:650}

table{width:100%;border-collapse:collapse;margin:10px 0 13px;font-size:8.9pt;
  page-break-inside:avoid}
th{background:#f1f4f2;text-align:left;padding:6px 8px;border:1px solid #dde2df;
  font-weight:650;font-size:8.4pt}
td{padding:5px 8px;border:1px solid #e7ebe8;vertical-align:top}
tr:nth-child(even) td{background:#fafbfa}

code{font-family:Consolas,"SF Mono",monospace;font-size:8.8pt;
  background:#f1f4f2;padding:1px 4px;border-radius:3px}
pre{background:#f7f9f8;border:1px solid #e2e6e1;border-left:3px solid #1c6b4b;
  border-radius:4px;padding:10px 12px;overflow:hidden;page-break-inside:avoid;margin:10px 0}
pre code{background:none;padding:0;font-size:8.3pt;line-height:1.42}

blockquote{margin:11px 0;padding:9px 14px;background:#e9f2ed;
  border-left:3px solid #1c6b4b;border-radius:0 5px 5px 0;page-break-inside:avoid}
blockquote p{margin:0 0 5px}
blockquote p:last-child{margin:0}

.doc > h1 + p em:first-child{color:#5d6b64}
"""

COVER = """
<div class="cover">
  <div>
    <div class="mark">Chakra</div>
    <div class="tagline">See where your carbon leaks.<br>Close the loop with numbers that pay.</div>
  </div>
  <div>
    <div class="ps">
      <b>HackOut&rsquo;26 &middot; Circular Carbon Ecosystem &middot; PS10</b>
      Industrial Emission Leak-Point Detector &amp; Circular Alternative Recommender
    </div>
    <div class="stats">
      <div class="stat"><div class="v">10</div><div class="k">Indian sectors</div></div>
      <div class="stat"><div class="v">30</div><div class="k">Circular interventions</div></div>
      <div class="stat"><div class="v">31</div><div class="k">Cited emission factors</div></div>
      <div class="stat"><div class="v">~40%</div><div class="k">Footprint behind a positive case</div></div>
    </div>
  </div>
  <div class="foot">Complete project report &middot; product definition, research, methodology and working prototype<br>Generated {date}</div>
</div>
"""


def find_chrome() -> str | None:
    for p in CHROME_CANDIDATES:
        if os.path.isfile(p):
            return p
    return shutil.which("chrome") or shutil.which("msedge")


def title_of(md_text: str, fallback: str) -> str:
    m = re.search(r"^#\s+(.+)$", md_text, re.M)
    return m.group(1).strip() if m else fallback


def main() -> int:
    files = sorted(glob.glob(os.path.join(DOCS, "*.md")))
    readme = os.path.join(HERE, "README.md")
    if os.path.isfile(readme):
        files = [readme] + files
    if not files:
        print("no markdown found in docs/")
        return 1

    md = markdown.Markdown(extensions=["tables", "fenced_code", "sane_lists", "attr_list"])

    bodies, toc = [], []
    for f in files:
        raw = open(f, encoding="utf-8").read()
        name = os.path.basename(f)
        toc.append(title_of(raw, name))
        md.reset()
        bodies.append(f'<div class="doc">{md.convert(raw)}</div>')

    toc_html = (
        '<div class="toc"><h2>Contents</h2><ol>'
        + "".join(f"<li>{t}</li>" for t in toc)
        + "</ol></div>"
    )

    html = (
        "<!doctype html><html><head><meta charset='utf-8'>"
        "<title>Chakra — Complete Project Report</title>"
        f"<style>{CSS}</style></head><body>"
        + COVER.format(date=dt.date.today().strftime("%d %B %Y"))
        + toc_html
        + "".join(bodies)
        + "</body></html>"
    )

    html_path = os.path.join(BUILD, "Chakra-Report.html")
    with open(html_path, "w", encoding="utf-8") as fh:
        fh.write(html)
    print(f"HTML  {html_path}  ({len(html) / 1024:.0f} KB, {len(files)} documents)")

    chrome = find_chrome()
    if not chrome:
        print("No Chrome/Edge found - HTML written, PDF skipped.")
        return 0

    pdf_path = os.path.join(BUILD, "Chakra-Report.pdf")
    if os.path.exists(pdf_path):
        os.remove(pdf_path)
    cmd = [
        chrome, "--headless=new", "--disable-gpu", "--no-sandbox",
        "--no-pdf-header-footer", "--run-all-compositor-stages-before-draw",
        "--virtual-time-budget=12000",
        f"--print-to-pdf={pdf_path}",
        "file:///" + html_path.replace("\\", "/"),
    ]
    subprocess.run(cmd, capture_output=True, timeout=180)

    if os.path.isfile(pdf_path):
        print(f"PDF   {pdf_path}  ({os.path.getsize(pdf_path) / 1024:.0f} KB)")
        return 0
    print("PDF render failed; HTML is still available.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
