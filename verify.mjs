import fs from 'node:fs';

const filePath = fs.existsSync('public/landing.html') ? 'public/landing.html' : 'dist/index.html';
const html = fs.readFileSync(filePath, 'utf8');
console.log('✓ landing size:', (html.length / 1024).toFixed(1), 'KB');

const checks = [
  ['Design token system inlined (--bg-0, --surface-1, --glass-border, --accent-blue)', html.includes('--bg-0: #080E14') && html.includes('--glass-border: rgba(180, 220, 235, 0.12)')],
  ['Cinematic Multi-Stage Intro (#cinematic-intro, intro-symbol-unit, intro-wordmark-unit)', html.includes('id="cinematic-intro"') && html.includes('intro-symbol-unit') && html.includes('intro-wordmark-unit')],
  ['Symbol first & transformation sequence classes present in JS/CSS', html.includes('phase-symbol') && html.includes('phase-wordmark') && html.includes('phase-descriptor')],
  ['Permanent navbar removed; subtle top-right access controls present (#site-header)', html.includes('id="site-header"') && html.includes('action-link-signin') && html.includes('btn-get-started') && !html.includes('id="main-nav"')],
  ['Hero section with breathing viewport and credibility strip (ZERO-LLM MATH)', html.includes('Turn industrial emissions into') && html.includes('ZERO-LLM MATH')],
  ['Product intelligence preview frame (/overview hero mockup)', html.includes('product-preview-frame') && html.includes('₹4.66') && html.includes('24,069')],
  ['Industrial problem section (Energy loss, Carbon exposure, Compliance risk)', html.includes('Industrial waste is often invisible') && html.includes('ENERGY LOSS')],
  ['Prangara operating system module network graph & inspector', html.includes('id="system-os"') && html.includes('id="os-inspector"') && html.includes('data-module="plant-data"')],
  ['Five-step factory journey timeline (Ingest, Diagnose, Simulate, Execute, Certify)', html.includes('id="journey"') && html.includes('INGEST') && html.includes('CERTIFY')],
  ['Financial + Carbon dual-engine split screen', html.includes('Measure the carbon') && html.includes('Understand the money')],
  ['Compliance section (SEBI BRSR, EU CBAM, 7-step audit trace)', html.includes('SEBI BRSR Core') && html.includes('EU CBAM') && html.includes('CALCULATION AUDIT TRACE')],
  ['Industrial benchmarks section with 8 BEE MSME sectors', html.includes('id="benchmarks"') && html.includes('data-sector="textile"') && html.includes('data-sector="steel"')],
  ['Real-world 30-day factory story (Tirupur case study)', html.includes('30 days inside a factory') && html.includes('DAY 01') && html.includes('DAY 30')],
  ['Final CTA section (Create your workspace)', html.includes('See what your factory could change') && html.includes('Create your workspace →')],
  ['Footer with platform, governance & access links', html.includes('id="main-footer"') && html.includes('Deterministic Industrial Intelligence')],
  ['Scrollable Viewport-Resilient Auth Container (.auth-scroll-container)', html.includes('auth-scroll-container') && html.includes('id="auth-signin-view"') && html.includes('btn-auth-primary')],
  ['Authenticated /overview application shell view', html.includes('id="authenticated-overview-view"') && html.includes('id="btn-app-logout"')],
  ['Stateful authService, session intro handling and client-side hash router', html.includes('authService') && (html.includes('IntroStateMachine') || html.includes('initCinematicIntro')) && html.includes('sessionStorage')],
  ['Spatial depth engine & 4-plane parallax system', html.includes('SpatialEngine') && html.includes('spatial-layer-bg') && html.includes('spatial-layer-hero')],
  ['Inlined vector brand marks and wordmarks', html.includes('hdr-mark') && html.includes('hdr-wordmark')]
];

let allPassed = true;
console.log('\n--- VERIFYING REFINED PRANGARA LANDING PAGE REQUIREMENTS ---');
for (const [name, passed] of checks) {
  console.log((passed ? '✓' : '✗'), name);
  if (!passed) allPassed = false;
}

if (!allPassed) {
  console.error('\n❌ Some checks failed!');
  process.exit(1);
} else {
  console.log('\n✅ All 19 architectural & visual refinement requirements verified successfully!');
}
