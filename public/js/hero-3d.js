/**
 * PRANGARA — PRODUCTION 3D POST-INTRO HERO WORLD
 * 
 * Modular Three.js Engine:
 * - Industrial Carbon Intelligence Core (procedural crystalline graphite geometry)
 * - Autonomous Wandering Diagnostic Companion (dual-gimbal titanium/graphite drone)
 * - Atmospheric Volumetric Haze & 3D Floating Particulate Field
 * - Camera Continuity handoff from IntroStateMachine (3.8s -> 4.8s)
 * - Damped Pointer Parallax & Responsive Quality Tiers
 * - Zero external CDN dependencies (uses local bundled Three.js)
 */

(function () {
  'use strict';

  // Quality & Device Detection
  var isMobile = window.innerWidth < 768 || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  var isTablet = !isMobile && window.innerWidth < 1024;
  var qualityTier = isMobile ? 'low' : (isTablet ? 'medium' : 'high');
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ------------------------------------------------------------
  // 1. FAST DETERMINISTIC 3D SIMPLEX NOISE
  // ------------------------------------------------------------
  var Simplex3D = (function () {
    var F3 = 1.0 / 3.0, G3 = 1.0 / 6.0;
    var p = new Uint8Array(256);
    // Deterministic pseudo-random seed
    var s = 42;
    for (var i = 0; i < 256; i++) {
      s = (s * 16807) % 2147483647;
      p[i] = s & 255;
    }
    var perm = new Uint8Array(512);
    var permMod12 = new Uint8Array(512);
    for (var j = 0; j < 512; j++) {
      perm[j] = p[j & 255];
      permMod12[j] = perm[j] % 12;
    }

    var grad3 = new Float32Array([
      1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
      1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
      0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1
    ]);

    function noise(xin, yin, zin) {
      var n0, n1, n2, n3;
      var s = (xin + yin + zin) * F3;
      var i = Math.floor(xin + s);
      var j = Math.floor(yin + s);
      var k = Math.floor(zin + s);
      var t = (i + j + k) * G3;
      var X0 = i - t, Y0 = j - t, Z0 = k - t;
      var x0 = xin - X0, y0 = yin - Y0, z0 = zin - Z0;

      var i1, j1, k1, i2, j2, k2;
      if (x0 >= y0) {
        if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
        else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
      } else {
        if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
        else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
        else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
      }

      var x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
      var x2 = x0 - i2 + 2.0 * G3, y2 = y0 - j2 + 2.0 * G3, z2 = z0 - k2 + 2.0 * G3;
      var x3 = x0 - 1.0 + 3.0 * G3, y3 = y0 - 1.0 + 3.0 * G3, z3 = z0 - 1.0 + 3.0 * G3;

      var ii = i & 255, jj = j & 255, kk = k & 255;
      var gi0 = permMod12[ii + perm[jj + perm[kk]]] * 3;
      var gi1 = permMod12[ii + i1 + perm[jj + j1 + perm[kk + k1]]] * 3;
      var gi2 = permMod12[ii + i2 + perm[jj + j2 + perm[kk + k2]]] * 3;
      var gi3 = permMod12[ii + 1 + perm[jj + 1 + perm[kk + 1]]] * 3;

      var t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
      if (t0 < 0) n0 = 0.0;
      else { t0 *= t0; n0 = t0 * t0 * (grad3[gi0] * x0 + grad3[gi0 + 1] * y0 + grad3[gi0 + 2] * z0); }

      var t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
      if (t1 < 0) n1 = 0.0;
      else { t1 *= t1; n1 = t1 * t1 * (grad3[gi1] * x1 + grad3[gi1 + 1] * y1 + grad3[gi1 + 2] * z1); }

      var t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
      if (t2 < 0) n2 = 0.0;
      else { t2 *= t2; n2 = t2 * t2 * (grad3[gi2] * x2 + grad3[gi2 + 1] * y2 + grad3[gi2 + 2] * z2); }

      var t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
      if (t3 < 0) n3 = 0.0;
      else { t3 *= t3; n3 = t3 * t3 * (grad3[gi3] * x3 + grad3[gi3 + 1] * y3 + grad3[gi3 + 2] * z3); }

      return 32.0 * (n0 + n1 + n2 + n3);
    }

    function fbm(x, y, z) {
      var total = 0.0;
      var amplitude = 1.0;
      var frequency = 1.0;
      var maxVal = 0.0;
      for (var o = 0; o < 3; o++) {
        total += noise(x * frequency, y * frequency, z * frequency) * amplitude;
        maxVal += amplitude;
        amplitude *= 0.5;
        frequency *= 2.0;
      }
      return total / maxVal;
    }

    return { noise: noise, fbm: fbm };
  })();

  // ------------------------------------------------------------
  // 2. PROCEDURAL GRAPHITE BUMP TEXTURE GENERATOR
  // ------------------------------------------------------------
  function createGraphiteBumpTexture() {
    var size = 256;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var imgData = ctx.createImageData(size, size);
    var data = imgData.data;

    for (var y = 0; y < size; y++) {
      for (var x = 0; x < size; x++) {
        var idx = (y * size + x) * 4;
        var n = Simplex3D.noise(x * 0.12, y * 0.12, 0.5) * 0.5 + 0.5;
        var micro = (Math.random() - 0.5) * 0.22;
        var val = Math.floor(Math.max(0, Math.min(255, (n + micro) * 255)));
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
        data[idx + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);

    var texture = new window.THREE.CanvasTexture(canvas);
    texture.wrapS = window.THREE.RepeatWrapping;
    texture.wrapT = window.THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  // ------------------------------------------------------------
  // 3. PARTICLE SPRITE TEXTURE GENERATOR
  // ------------------------------------------------------------
  function createParticleTexture() {
    var size = 64;
    var canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    var ctx = canvas.getContext('2d');
    if (!ctx) return null;

    var gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(121, 215, 230, 0.85)');
    gradient.addColorStop(0.6, 'rgba(97, 184, 245, 0.25)');
    gradient.addColorStop(1, 'rgba(8, 14, 20, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    var texture = new window.THREE.CanvasTexture(canvas);
    return texture;
  }

  // ------------------------------------------------------------
  // 4. MAIN HERO 3D ENGINE
  // ------------------------------------------------------------
  var Hero3DEngine = (function () {
    var THREE = window.THREE;
    var canvas, renderer, scene, camera;
    var coreGroup, carbonCore, fissureCore, shellPlates = [];
    var companionGroup, companionNode, ringInner, ringOuter, sensorAperture, companionLight;
    var particlesGeometry, particlesMaterial, particlesMesh;
    var dirLightKey, dirLightRim, specularPointLight, fissureLight;

    var bumpTexture, particleTexture;
    var isInitialized = false;
    var isRunning = false;
    var rafId = null;

    // Camera Coordinate States
    var cameraState = {
      // Intro focus (centered, medium distance)
      introPos: { x: 0, y: 0, z: 4.2 },
      introTarget: { x: 0, y: 0, z: 0 },
      // Desktop hero resting coordinates (framed center-right)
      heroPos: { x: isMobile ? 0 : 1.35, y: isMobile ? 0.35 : 0.2, z: isMobile ? 7.6 : 6.8 },
      heroTarget: { x: isMobile ? 0 : 1.65, y: 0, z: 0 },
      // Current dynamic camera values
      currentPos: { x: 0, y: 0, z: 4.2 },
      currentTarget: { x: 0, y: 0, z: 0 },
      // Transition progress (0 = intro, 1 = hero)
      transitionProgress: 0,
      isTransitioning: false,
      transitionStartTime: 0,
      transitionDuration: 1350 // ms
    };

    // Pointer Interaction State
    var mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    var time = 0;
    var lastFrameTime = performance.now();

    // ----------------------------------------------------------
    // CUBIC EASING
    // ----------------------------------------------------------
    function easeInOutCubic(t) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    // ----------------------------------------------------------
    // BUILD CARBON INTELLIGENCE CORE
    // ----------------------------------------------------------
    function buildCarbonCore() {
      coreGroup = new THREE.Group();
      scene.add(coreGroup);

      bumpTexture = createGraphiteBumpTexture();

      // Detail based on quality tier
      var detail = qualityTier === 'high' ? 26 : (qualityTier === 'medium' ? 16 : 10);
      var baseGeom = new THREE.IcosahedronGeometry(1.85, detail);
      var posAttr = baseGeom.attributes.position;
      var count = posAttr.count;

      // Planar cleavage vectors for sheared mineral cleavage
      var cleave1 = new THREE.Vector3(0.707, 0.707, 0).normalize();
      var cleave2 = new THREE.Vector3(-0.577, 0.577, 0.577).normalize();
      var cleave3 = new THREE.Vector3(0, -0.8, 0.6).normalize();

      var p = new THREE.Vector3();
      var dir = new THREE.Vector3();

      for (var i = 0; i < count; i++) {
        p.fromBufferAttribute(posAttr, i);
        dir.copy(p).normalize();

        // 1. Layered FBM organic displacement
        var disp = Simplex3D.fbm(p.x * 0.85, p.y * 0.85, p.z * 0.85) * 0.38;
        disp += Simplex3D.noise(p.x * 2.2, p.y * 2.2, p.z * 2.2) * 0.12;

        // 2. Planar fracture / sheared fault crevices
        var d1 = Math.abs(dir.dot(cleave1));
        var d2 = Math.abs(dir.dot(cleave2));
        var d3 = Math.abs(dir.dot(cleave3));
        var minFault = Math.min(d1, d2, d3);

        if (minFault < 0.11) {
          var crevice = -0.38 * Math.pow(1.0 - minFault / 0.11, 2);
          disp += crevice;
        }

        // 3. Tectonic stepped terracing
        var step = Math.sin(p.y * 7.5 + p.x * 3.0) * 0.055;
        disp += step;

        p.addScaledVector(dir, disp);
        posAttr.setXYZ(i, p.x, p.y, p.z);
      }

      baseGeom.computeVertexNormals();

      // Deep graphite obsidian PBR material
      var coreMaterial = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(0x0a1219),
        roughness: 0.76,
        metalness: 0.38,
        clearcoat: 0.16,
        clearcoatRoughness: 0.42,
        bumpMap: bumpTexture,
        bumpScale: 0.038,
        flatShading: false
      });

      carbonCore = new THREE.Mesh(baseGeom, coreMaterial);
      coreGroup.add(carbonCore);

      // Glowing internal fissure core (energy processing inside fissures)
      var fissureGeom = new THREE.IcosahedronGeometry(1.68, Math.max(4, detail - 6));
      var fissureMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x61b8f5),
        wireframe: true,
        transparent: true,
        opacity: 0.38,
        blending: THREE.AdditiveBlending
      });
      fissureCore = new THREE.Mesh(fissureGeom, fissureMat);
      coreGroup.add(fissureCore);

      // Orbiting fractured graphite shell plates (3-4 plates)
      if (qualityTier !== 'low') {
        var plateCount = qualityTier === 'high' ? 4 : 2;
        for (var pl = 0; pl < plateCount; pl++) {
          var plateGeom = new THREE.CylinderGeometry(
            1.95 + pl * 0.08,
            2.05 + pl * 0.08,
            0.45 + pl * 0.1,
            12,
            1,
            true,
            pl * 1.5,
            1.2
          );
          plateGeom.computeVertexNormals();

          var plateMat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(0x0c1620),
            roughness: 0.82,
            metalness: 0.45,
            bumpMap: bumpTexture,
            bumpScale: 0.03,
            side: THREE.DoubleSide
          });

          var plateMesh = new THREE.Mesh(plateGeom, plateMat);
          plateMesh.rotation.set(pl * 0.7, pl * 1.2, pl * 0.4);
          shellPlates.push({
            mesh: plateMesh,
            speedX: (pl % 2 === 0 ? 1 : -1) * (0.0004 + pl * 0.00015),
            speedY: (pl % 2 === 0 ? -1 : 1) * (0.0003 + pl * 0.0002)
          });
          coreGroup.add(plateMesh);
        }
      }

      // Base Core Positioning
      coreGroup.position.set(isMobile ? 0 : 1.75, 0, 0);
    }

    // ----------------------------------------------------------
    // BUILD AUTONOMOUS WANDERING COMPANION
    // ----------------------------------------------------------
    function buildCompanion() {
      companionGroup = new THREE.Group();
      scene.add(companionGroup);

      // 1. Central Titanium / Graphite Diagnostic Node
      var nodeGeom = new THREE.DodecahedronGeometry(0.32, 1);
      var nodeMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x121e28),
        roughness: 0.28,
        metalness: 0.78
      });
      companionNode = new THREE.Mesh(nodeGeom, nodeMat);
      companionGroup.add(companionNode);

      // 2. Dual-Gimbal Counter-Rotating Titanium Rings
      var innerGeom = new THREE.TorusGeometry(0.48, 0.016, 12, 48);
      var ringMatInner = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0x79d7e6),
        roughness: 0.35,
        metalness: 0.85,
        emissive: new THREE.Color(0x79d7e6),
        emissiveIntensity: 0.18
      });
      ringInner = new THREE.Mesh(innerGeom, ringMatInner);
      companionGroup.add(ringInner);

      var outerGeom = new THREE.TorusGeometry(0.62, 0.016, 12, 48);
      var ringMatOuter = new THREE.MeshStandardMaterial({
        color: new THREE.Color(0xb4dceb),
        roughness: 0.35,
        metalness: 0.85,
        emissive: new THREE.Color(0xb4dceb),
        emissiveIntensity: 0.12
      });
      ringOuter = new THREE.Mesh(outerGeom, ringMatOuter);
      companionGroup.add(ringOuter);

      // 3. Sensor Eye / Diagnostic Aperture
      var apertureGeom = new THREE.SphereGeometry(0.08, 16, 16);
      var apertureMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0x5ccb94),
        transparent: true,
        opacity: 0.95
      });
      sensorAperture = new THREE.Mesh(apertureGeom, apertureMat);
      sensorAperture.position.set(0, 0, 0.32);
      companionGroup.add(sensorAperture);

      // 4. Subtle Specular Point Beacon
      companionLight = new THREE.PointLight(0x61b8f5, 0.5, 3.5, 2.0);
      companionGroup.add(companionLight);

      // Safe Flight Starting Position (Upper-Right Quadrant)
      companionGroup.position.set(2.2, 1.2, 0.5);
      companionGroup.visible = false; // Becomes visible upon transitionToHero
    }

    // ----------------------------------------------------------
    // BUILD FLOATING ATMOSPHERIC PARTICULATE FIELD
    // ----------------------------------------------------------
    function buildParticulateField() {
      var count = qualityTier === 'high' ? 320 : (qualityTier === 'medium' ? 140 : 50);
      particlesGeometry = new THREE.BufferGeometry();
      var positions = new Float32Array(count * 3);
      var velocities = new Float32Array(count * 3);
      var alphas = new Float32Array(count);

      for (var i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 14.0;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 9.0;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 8.0;

        velocities[i * 3] = (Math.random() - 0.5) * 0.003;
        velocities[i * 3 + 1] = 0.0015 + Math.random() * 0.0035;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.002;

        alphas[i] = 0.15 + Math.random() * 0.45;
      }

      particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      particlesGeometry.userData = { velocities: velocities, count: count };

      particleTexture = createParticleTexture();

      particlesMaterial = new THREE.PointsMaterial({
        size: 0.075,
        map: particleTexture,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });

      particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
      scene.add(particlesMesh);
    }

    // ----------------------------------------------------------
    // INITIALIZE LIGHTING
    // ----------------------------------------------------------
    function initLighting() {
      // 1. Deep Obsidian Ambient
      var ambient = new THREE.AmbientLight(0x0d1722, 0.62);
      scene.add(ambient);

      // 2. Key Cool Steel Directional Light
      dirLightKey = new THREE.DirectionalLight(0xb4dceb, 1.45);
      dirLightKey.position.set(4.5, 6.0, 4.5);
      scene.add(dirLightKey);

      // 3. Cyan Ice Rim Backlight (defining the silhouette against fog)
      dirLightRim = new THREE.DirectionalLight(0x79d7e6, 1.25);
      dirLightRim.position.set(-5.5, -4.0, -4.5);
      scene.add(dirLightRim);

      // 4. Specular Pointer Responsive Light
      specularPointLight = new THREE.PointLight(0x61b8f5, 0.85, 14, 1.8);
      specularPointLight.position.set(2, 1, 3);
      scene.add(specularPointLight);

      // 5. Internal Core Fissure Breathing Light
      fissureLight = new THREE.PointLight(0x61b8f5, 0.65, 5.5, 2.0);
      fissureLight.position.set(isMobile ? 0 : 1.75, 0, 0);
      scene.add(fissureLight);
    }

    // ----------------------------------------------------------
    // UPDATE COMPANION AUTONOMOUS KINEMATICS
    // ----------------------------------------------------------
    var compPrevPos = new THREE.Vector3();
    var compVel = new THREE.Vector3();
    var lookTarget = new THREE.Vector3();

    function updateCompanion(delta) {
      if (!companionGroup || !companionGroup.visible) return;

      var t = time * 0.32;
      // Parametric trajectory strictly bounded to right & upper hemisphere:
      // X bounded to [0.95, 3.2], never obscuring the left text column
      var targetX = 2.1 + Math.sin(t * 0.42) * 0.95 + Math.cos(t * 0.17) * 0.3;
      var targetY = 1.05 + Math.sin(t * 0.58) * 0.72 + Math.sin(t * 0.29) * 0.25;
      var targetZ = 0.45 + Math.cos(t * 0.38) * 0.85;

      compPrevPos.copy(companionGroup.position);

      // Smooth inertia damping
      companionGroup.position.x += (targetX - companionGroup.position.x) * 0.035;
      companionGroup.position.y += (targetY - companionGroup.position.y) * 0.035;
      companionGroup.position.z += (targetZ - companionGroup.position.z) * 0.035;

      // Heading orientation towards flight trajectory
      compVel.subVectors(companionGroup.position, compPrevPos);
      if (compVel.lengthSq() > 0.00001) {
        lookTarget.copy(companionGroup.position).add(compVel);
        companionGroup.lookAt(lookTarget);
      }

      // Counter-rotating gimbal rings
      if (!reducedMotion) {
        ringInner.rotation.x += 0.016;
        ringInner.rotation.y += 0.012;
        ringOuter.rotation.y -= 0.014;
        ringOuter.rotation.z += 0.009;
      }

      // Subtle sensor beacon pulse
      var pulse = Math.sin(time * 2.8) * 0.5 + 0.5;
      sensorAperture.material.opacity = 0.6 + pulse * 0.4;
      companionLight.intensity = 0.35 + pulse * 0.35;
    }

    // ----------------------------------------------------------
    // UPDATE PARTICLES DRIFT
    // ----------------------------------------------------------
    function updateParticles() {
      if (!particlesGeometry || reducedMotion) return;

      var positions = particlesGeometry.attributes.position.array;
      var vels = particlesGeometry.userData.velocities;
      var count = particlesGeometry.userData.count;

      for (var i = 0; i < count; i++) {
        var idx = i * 3;
        positions[idx] += vels[idx];
        positions[idx + 1] += vels[idx + 1];
        positions[idx + 2] += vels[idx + 2];

        // Boundary wrap
        if (positions[idx + 1] > 4.5) positions[idx + 1] = -4.5;
        if (positions[idx] > 7.0) positions[idx] = -7.0;
        if (positions[idx] < -7.0) positions[idx] = 7.0;
      }
      particlesGeometry.attributes.position.needsUpdate = true;
    }

    // ----------------------------------------------------------
    // CAMERA CONTINUITY INTERPOLATOR
    // ----------------------------------------------------------
    function updateCamera(delta) {
      if (cameraState.isTransitioning) {
        var elapsed = performance.now() - cameraState.transitionStartTime;
        var p = Math.min(1.0, elapsed / cameraState.transitionDuration);
        cameraState.transitionProgress = easeInOutCubic(p);

        // Interpolate position from intro close-up to desktop hero composition
        cameraState.currentPos.x = cameraState.introPos.x + (cameraState.heroPos.x - cameraState.introPos.x) * cameraState.transitionProgress;
        cameraState.currentPos.y = cameraState.introPos.y + (cameraState.heroPos.y - cameraState.introPos.y) * cameraState.transitionProgress;
        cameraState.currentPos.z = cameraState.introPos.z + (cameraState.heroPos.z - cameraState.introPos.z) * cameraState.transitionProgress;

        cameraState.currentTarget.x = cameraState.introTarget.x + (cameraState.heroTarget.x - cameraState.introTarget.x) * cameraState.transitionProgress;
        cameraState.currentTarget.y = cameraState.introTarget.y + (cameraState.heroTarget.y - cameraState.introTarget.y) * cameraState.transitionProgress;
        cameraState.currentTarget.z = cameraState.introTarget.z + (cameraState.heroTarget.z - cameraState.introTarget.z) * cameraState.transitionProgress;

        if (p >= 1.0) {
          cameraState.isTransitioning = false;
        }
      }

      // Mouse Parallax Damping
      mouse.x += (mouse.targetX - mouse.x) * 0.05;
      mouse.y += (mouse.targetY - mouse.y) * 0.05;

      var parallaxFactorX = reducedMotion ? 0 : 0.28;
      var parallaxFactorY = reducedMotion ? 0 : 0.18;

      camera.position.x = cameraState.currentPos.x + mouse.x * parallaxFactorX;
      camera.position.y = cameraState.currentPos.y - mouse.y * parallaxFactorY;
      camera.position.z = cameraState.currentPos.z;

      camera.lookAt(cameraState.currentTarget.x, cameraState.currentTarget.y, cameraState.currentTarget.z);

      // Specular point light responds dynamically to cursor position
      if (specularPointLight) {
        specularPointLight.position.x = (isMobile ? 0 : 1.75) + mouse.x * 2.5;
        specularPointLight.position.y = mouse.y * 2.0;
      }
    }

    // ----------------------------------------------------------
    // ANIMATION RAF LOOP
    // ----------------------------------------------------------
    function render() {
      if (!isRunning) return;

      var now = performance.now();
      var delta = Math.min(0.1, (now - lastFrameTime) / 1000);
      lastFrameTime = now;
      time += delta;

      // 1. Subtle Carbon Core Micro-Rotation & Hover Breathing
      if (coreGroup && !reducedMotion) {
        coreGroup.rotation.y += 0.00085;
        coreGroup.rotation.x = Math.sin(time * 0.25) * 0.045;
        coreGroup.position.y = Math.sin(time * 0.6) * 0.065;

        // Fissure breathing pulse
        var pulse = Math.sin(time * 1.6) * 0.5 + 0.5;
        if (fissureCore) {
          fissureCore.material.opacity = 0.25 + pulse * 0.25;
        }
        if (fissureLight) {
          fissureLight.intensity = 0.45 + pulse * 0.4;
        }

        // Counter-rotating shell plates
        for (var pl = 0; pl < shellPlates.length; pl++) {
          var sp = shellPlates[pl];
          sp.mesh.rotation.y += sp.speedY;
          sp.mesh.rotation.x += sp.speedX;
        }
      }

      // 2. Autonomous Wandering Companion
      updateCompanion(delta);

      // 3. Floating Particulates
      updateParticles();

      // 4. Camera Continuity & Pointer Parallax
      updateCamera(delta);

      // 5. Draw Frame
      renderer.render(scene, camera);

      rafId = requestAnimationFrame(render);
    }

    // ----------------------------------------------------------
    // POINTER TRACKING (SAFE, PASSIVE, ZERO CLICK HIJACKING)
    // ----------------------------------------------------------
    function onPointerMove(e) {
      // Normalized to [-1, 1]
      mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.targetY = (e.clientY / window.innerHeight) * 2 - 1;
    }

    // ----------------------------------------------------------
    // RESIZE & ASPECT RATIO HANDLER
    // ----------------------------------------------------------
    function onResize() {
      if (!canvas || !renderer || !camera) return;

      var width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
      var height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      renderer.setSize(width, height, false);
      var dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2.0);
      renderer.setPixelRatio(dpr);

      // Re-evaluate responsive target on resize
      isMobile = window.innerWidth < 768;
      cameraState.heroPos.x = isMobile ? 0 : 1.35;
      cameraState.heroPos.y = isMobile ? 0.35 : 0.2;
      cameraState.heroPos.z = isMobile ? 7.6 : 6.8;
      cameraState.heroTarget.x = isMobile ? 0 : 1.65;

      if (coreGroup) {
        coreGroup.position.x = isMobile ? 0 : 1.75;
      }
    }

    // ----------------------------------------------------------
    // VISIBILITY & RESOURCE LIFECYCLE
    // ----------------------------------------------------------
    function onVisibilityChange() {
      if (document.hidden) {
        isRunning = false;
        if (rafId) cancelAnimationFrame(rafId);
      } else {
        lastFrameTime = performance.now();
        if (!isRunning) {
          isRunning = true;
          rafId = requestAnimationFrame(render);
        }
      }
    }

    // ----------------------------------------------------------
    // PUBLIC TRANSITION HOOKS CONNECTED TO IntroStateMachine
    // ----------------------------------------------------------
    function transitionToHero() {
      if (!isInitialized) init();

      var heroEl = document.getElementById('hero');
      if (heroEl) {
        heroEl.classList.add('hero-active', 'hero-3d-visible');
      }
      if (canvas) {
        canvas.style.opacity = '1';
      }

      cameraState.transitionStartTime = performance.now();
      cameraState.isTransitioning = true;

      // Reveal companion with flight initiation
      if (companionGroup) {
        companionGroup.visible = true;
      }
    }

    function setHeroReady() {
      if (!isInitialized) init();

      var heroEl = document.getElementById('hero');
      if (heroEl) {
        heroEl.classList.add('hero-active', 'hero-3d-visible');
      }
      if (canvas) {
        canvas.style.opacity = '1';
      }

      if (companionGroup) {
        companionGroup.visible = true;
      }

      // Settle into resting state
      cameraState.isTransitioning = false;
      cameraState.transitionProgress = 1.0;
      cameraState.currentPos.x = cameraState.heroPos.x;
      cameraState.currentPos.y = cameraState.heroPos.y;
      cameraState.currentPos.z = cameraState.heroPos.z;
      cameraState.currentTarget.x = cameraState.heroTarget.x;
      cameraState.currentTarget.y = cameraState.heroTarget.y;
      cameraState.currentTarget.z = cameraState.heroTarget.z;
    }

    function finishImmediately() {
      setHeroReady();
    }

    // ----------------------------------------------------------
    // MAIN INITIALIZATION
    // ----------------------------------------------------------
    function init() {
      if (isInitialized) return;

      canvas = document.getElementById('hero-3d-canvas');
      if (!canvas || !window.THREE) return;

      THREE = window.THREE;

      // 1. Scene Setup
      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x080E14, 0.042);

      // 2. Camera Setup (Starts at close-up intro position)
      var width = canvas.parentElement ? canvas.parentElement.clientWidth : window.innerWidth;
      var height = canvas.parentElement ? canvas.parentElement.clientHeight : window.innerHeight;
      camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
      camera.position.set(cameraState.introPos.x, cameraState.introPos.y, cameraState.introPos.z);
      camera.lookAt(cameraState.introTarget.x, cameraState.introTarget.y, cameraState.introTarget.z);

      // 3. WebGL Renderer with High-Performance Settings
      try {
        renderer = new THREE.WebGLRenderer({
          canvas: canvas,
          alpha: true,
          antialias: qualityTier !== 'low',
          powerPreference: 'high-performance',
          stencil: false,
          depth: true
        });
      } catch (err) {
        console.warn('PRANGARA WebGL fallback: Canvas WebGL failed to initialize.', err);
        return;
      }

      var dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 1.5 : 2.0);
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;

      // 4. Build Scene Objects
      initLighting();
      buildCarbonCore();
      buildCompanion();
      buildParticulateField();

      // 5. Event Listeners
      window.addEventListener('resize', onResize, { passive: true });
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('visibilitychange', onVisibilityChange);

      // WebGL Context Loss Recovery
      canvas.addEventListener('webglcontextlost', function (e) {
        e.preventDefault();
        isRunning = false;
        if (rafId) cancelAnimationFrame(rafId);
      }, false);

      canvas.addEventListener('webglcontextrestored', function () {
        init();
      }, false);

      isInitialized = true;
      isRunning = true;
      lastFrameTime = performance.now();
      rafId = requestAnimationFrame(render);
    }

    return {
      init: init,
      transitionToHero: transitionToHero,
      setHeroReady: setHeroReady,
      finishImmediately: finishImmediately
    };
  })();

  // Expose globally for IntroStateMachine integration
  window.Hero3DEngine = Hero3DEngine;

})();
