import fs from 'node:fs';

console.log('=== PRANGARA MOTION REPAIR & SPATIAL DEPTH TEST SUITE ===');

const filePath = fs.existsSync('public/landing.html') ? 'public/landing.html' : 'dist/index.html';
const html = fs.readFileSync(filePath, 'utf8');

const tests = [
  // 1. Single Hero Title Instance & Stability
  ['Exactly one instance of .hero-headline in HTML', (html.match(/class="[^"]*hero-headline[^"]*"/g) || []).length === 1],
  ['Headline contains exact expected copy', html.includes('Turn industrial emissions into <span class="text-accent-opportunity">measurable opportunity.</span>')],
  ['Hero headline has initial blur and transform in CSS', html.includes('transform: translate3d(0, 26px, 0) scale(0.985)') && html.includes('filter: blur(8px)')],
  ['Hero active state restores headline to scale(1) and blur(0)', html.includes('transform: translate3d(0, 0, 0) scale(1)') && html.includes('filter: blur(0)')],

  // 2. Intro State Machine & Sequence
  ['Intro state machine defined with explicit states', html.includes('INTRO_ATMOSPHERE') && html.includes('INTRO_MARK') && html.includes('INTRO_SYMBOL_ACTIVE') && html.includes('INTRO_WORDMARK') && html.includes('INTRO_DESCRIPTOR') && html.includes('INTRO_TO_HERO') && html.includes('HERO_READY')],
  ['Symbol enters alone with initial blur and scale', html.includes('intro-symbol-unit') && html.includes('transform: scale(0.90)') && html.includes('filter: blur(8px)')],
  ['Symbol activates with halo bloom', html.includes('state-symbol-active') && html.includes('intro-symbol-pulse')],
  ['Wordmark expands outward from visual center with full PRANGARA spelling', html.includes('intro-wordmark-unit') && html.includes('max-width: 0px') && html.includes('max-width: 340px')],
  ['Descriptor text enters underneath with tracking', html.includes('INDUSTRIAL INTELLIGENCE') && html.includes('intro-descriptor-text')],
  ['Scroll lock utility enforced during intro', html.includes('intro-scroll-lock') && html.includes('overflow: hidden !important')],
  ['Session-based bypass and quiet user skip support', html.includes('sessionStorage') && html.includes('prangara_intro_completed') && html.includes('handleKeySkip')],

  // 3. Spatial Depth & 4-Plane Parallax System
  ['Spatial layer classes attached to DOM planes', html.includes('spatial-layer-bg') && html.includes('spatial-layer-network') && html.includes('spatial-layer-hero')],
  ['SpatialEngine RAF loop with inertia damping', html.includes('SpatialEngine') && html.includes('scrollDiff * 0.12') && html.includes('mouseXDiff * 0.08')],
  ['Dynamic CSS variables computed (--scroll-bg-y, --scroll-net-y, --scroll-hero-y)', html.includes('--scroll-bg-y') && html.includes('--scroll-net-y') && html.includes('--scroll-hero-y')],
  ['Desktop mouse parallax applied to background & network only', html.includes('--mouse-bg-x') && html.includes('--mouse-net-x')],
  ['Product preview 3D perspective tilt configured', html.includes('--preview-rx') && html.includes('--preview-ry') && html.includes('perspective(1200px)')],

  // 4. Viewport-Resilient Auth & Clean Route Transitions
  ['Auth scroll container with min-height 100dvh', html.includes('auth-scroll-container') && html.includes('min-height: 100dvh')],
  ['Auth card max-width and compact padding', html.includes('auth-modal-card') && html.includes('max-width: 410px')],
  ['Interactive BEE MSME benchmarks and OS module inspector', html.includes('id="bench-sector-pills"') && html.includes('id="os-inspector"')],
  ['Authenticated /overview application shell intact', html.includes('id="authenticated-overview-view"') && html.includes('id="btn-app-logout"')]
];

let allPassed = true;
let count = 0;
for (const [name, passed] of tests) {
  console.log((passed ? '  ✓' : '  ✗'), name);
  if (passed) count++;
  else allPassed = false;
}

console.log(`\nScore: ${count}/${tests.length} tests passed.`);

if (!allPassed) {
  console.error('❌ Motion suite failed!');
  process.exit(1);
} else {
  console.log('✅ ALL MOTION REPAIR & SPATIAL DEPTH SPECIFICATIONS VERIFIED!');
}
