import { useEffect, useRef, useState, useMemo } from "react";
import * as THREE from "three";
import {
  Activity,
  RotateCcw,
  Maximize2,
  Minimize2,
  Zap,
  Flame,
  Thermometer,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { Link } from "react-router-dom";

export interface LeakHotspot {
  id: string;
  machineId: "boiler" | "economizer" | "stenter";
  title: string;
  component: string;
  severity: "critical" | "high" | "moderate";
  position: [number, number, number];
  cameraTarget: [number, number, number];
  cameraPos: [number, number, number];
  temperature: string;
  benchmarkTemp: string;
  emissionsLoss: string;
  financialWaste: string;
  rule: string;
  intervention: string;
  paybackMonths: number;
  annualSavings: string;
  scope: string;
  description: string;
}

const ALL_HOTSPOTS: LeakHotspot[] = [
  // 1. STEAM BOILER HOTSPOTS
  {
    id: "flue_stack",
    machineId: "boiler",
    title: "Flue Gas Heat Loss & Excess O₂",
    component: "Exhaust Stack & Flue Gas Plenum",
    severity: "critical",
    position: [3.8, 4.6, 0],
    cameraTarget: [3.8, 4.0, 0],
    cameraPos: [8.5, 6.5, 7.0],
    temperature: "198°C",
    benchmarkTemp: "135°C (BEE Target)",
    emissionsLoss: "142 tCO₂e / yr",
    financialWaste: "₹18.4 Lakhs / yr",
    rule: "Benchmark breach (p78 intensity)",
    intervention: "Finned-Tube Feedwater Economizer & O₂ Trim",
    paybackMonths: 11,
    annualSavings: "₹16.2 Lakhs / yr",
    scope: "Scope 1 (Direct Fuel Combustion)",
    description: "Flue gas leaves the boiler at 198°C with 6.8% oxygen. Installing an economizer preheats boiler feedwater from 30°C to 85°C, reducing fuel consumption by 5.2%."
  },
  {
    id: "steam_header",
    machineId: "boiler",
    title: "Uninsulated Steam Stop Valve & Flange",
    component: "Main Steam Drum & Header",
    severity: "high",
    position: [0, 3.4, 0],
    cameraTarget: [0, 3.0, 0],
    cameraPos: [3.5, 5.0, 6.0],
    temperature: "178°C surface",
    benchmarkTemp: "45°C (Insulated standard)",
    emissionsLoss: "64 tCO₂e / yr",
    financialWaste: "₹8.2 Lakhs / yr",
    rule: "Operational surface radiation leak",
    intervention: "Removable Aerogel Thermal Insulation Jackets",
    paybackMonths: 3,
    annualSavings: "₹7.9 Lakhs / yr",
    scope: "Scope 1 (Steam Distribution)",
    description: "Uninsulated 150mm valve bodies radiating 4.8 kW continuously. Removable custom thermal jackets prevent burns and eliminate 92% of surface thermal radiation."
  },
  {
    id: "blowdown_line",
    machineId: "boiler",
    title: "Continuous Blowdown Thermal Discharge",
    component: "Bottom Blowdown Drain Line",
    severity: "moderate",
    position: [-1.8, -1.6, 1.2],
    cameraTarget: [-1.8, -1.2, 1.0],
    cameraPos: [-0.5, 0.5, 5.5],
    temperature: "162°C effluent",
    benchmarkTemp: "40°C drain limit",
    emissionsLoss: "48 tCO₂e / yr",
    financialWaste: "₹5.9 Lakhs / yr",
    rule: "Operational heat & condensate loss",
    intervention: "Auto TDS Controller & Flash Steam Heat Recovery",
    paybackMonths: 8,
    annualSavings: "₹5.4 Lakhs / yr",
    scope: "Scope 1 (Process Water & Heat)",
    description: "Continuous manual blowdown drains high-pressure saturated water. Automatic TDS blowdown valve with flash vessel recovers flash steam and preheats makeup water."
  },
  {
    id: "burner_throat",
    machineId: "boiler",
    title: "Combustion Air-Fuel Ratio Deviation",
    component: "Multi-Fuel Rotary Burner Throat",
    severity: "high",
    position: [-4.2, 0.6, 0],
    cameraTarget: [-4.0, 0.6, 0],
    cameraPos: [-8.0, 2.8, 5.0],
    temperature: "42% excess air",
    benchmarkTemp: "15% excess air (BEE standard)",
    emissionsLoss: "95 tCO₂e / yr",
    financialWaste: "₹12.1 Lakhs / yr",
    rule: "Material concentration (Combustion)",
    intervention: "VFD Combustion Air Blower & Digital Micro-Modulation",
    paybackMonths: 14,
    annualSavings: "₹10.8 Lakhs / yr",
    scope: "Scope 1 (Fuel Combustion)",
    description: "Fixed-speed mechanical linkage causes rich air-fuel mixture during load swings. Electronic linkageless modulation maintains peak stoichiometric efficiency across all firing rates."
  },

  // 2. ECONOMIZER HOTSPOTS
  {
    id: "tube_fouling",
    machineId: "economizer",
    title: "Economizer Finned Tube Ash Fouling",
    component: "Finned Tube Heat Exchange Matrix",
    severity: "high",
    position: [0, 1.2, 0],
    cameraTarget: [0, 1.0, 0],
    cameraPos: [4.0, 3.5, 6.0],
    temperature: "172°C exit temp",
    benchmarkTemp: "130°C design exit",
    emissionsLoss: "76 tCO₂e / yr",
    financialWaste: "₹9.8 Lakhs / yr",
    rule: "Heat transfer degradation (> 25% ΔT rise)",
    intervention: "Acoustic Sonic Soot Blowers & Differential Temp Alarm",
    paybackMonths: 6,
    annualSavings: "₹9.1 Lakhs / yr",
    scope: "Scope 1 (Heat Recovery)",
    description: "Fly ash builds up between high-frequency welded fins, reducing overall heat transfer coefficient U from 45 W/m²K to 24 W/m²K. Sonic soot blowing prevents downtime."
  },
  {
    id: "damper_leak",
    machineId: "economizer",
    title: "Bypass Damper Seal Degradation",
    component: "Guillotine Flue Gas Bypass Damper",
    severity: "moderate",
    position: [1.8, 2.8, 0],
    cameraTarget: [1.6, 2.5, 0],
    cameraPos: [4.5, 4.0, 5.0],
    temperature: "18% gas bypass",
    benchmarkTemp: "< 2% seal leakage",
    emissionsLoss: "52 tCO₂e / yr",
    financialWaste: "₹6.7 Lakhs / yr",
    rule: "Parasitic thermal bypass leak",
    intervention: "High-Temp Inconel Blade Seals & Pneumatic Lockout",
    paybackMonths: 5,
    annualSavings: "₹6.3 Lakhs / yr",
    scope: "Scope 1 (Heat Recovery Bypass)",
    description: "Thermal warping on emergency bypass dampers lets 18% of hot flue gas escape directly to chimney without passing across feedwater recovery tubes."
  },

  // 3. STENTER MACHINE HOTSPOTS
  {
    id: "stenter_exhaust",
    machineId: "stenter",
    title: "Excessive Stenter Exhaust Air Volume",
    component: "Roof Exhaust Duct & Air Damper",
    severity: "critical",
    position: [0, 3.2, 0],
    cameraTarget: [0, 2.5, 0],
    cameraPos: [4.5, 4.5, 6.5],
    temperature: "165°C hot exhaust",
    benchmarkTemp: "105°C (with recovery)",
    emissionsLoss: "186 tCO₂e / yr",
    financialWaste: "₹24.0 Lakhs / yr",
    rule: "Benchmark breach (Textile Dyeing Cluster)",
    intervention: "Air-to-Water Stenter Heat Recovery & Humidity Damper Control",
    paybackMonths: 9,
    annualSavings: "₹21.5 Lakhs / yr",
    scope: "Scope 1 (Thermic Fluid Thermal Energy)",
    description: "Exhaust fan operates at 100% capacity regardless of fabric moisture, expelling massive quantities of dry hot air. Automated humidity sensors modulate exhaust volume."
  },
  {
    id: "stenter_doors",
    machineId: "stenter",
    title: "Drying Chamber Door Thermal Leakage",
    component: "Insulated Chamber Panel Gaskets",
    severity: "moderate",
    position: [-2.6, 0.8, 1.8],
    cameraTarget: [-2.4, 0.8, 1.2],
    cameraPos: [-4.5, 2.0, 5.0],
    temperature: "82°C skin temp",
    benchmarkTemp: "45°C skin temp limit",
    emissionsLoss: "38 tCO₂e / yr",
    financialWaste: "₹4.8 Lakhs / yr",
    rule: "Chamber skin radiation loss",
    intervention: "Silicone Profile Gaskets & Double-Labyrinth Seals",
    paybackMonths: 4,
    annualSavings: "₹4.5 Lakhs / yr",
    scope: "Scope 1 (Thermal Radiation)",
    description: "Hardened silicone gaskets allow heated air leaks along inspection panels. High-grade elastomeric replacement cuts thermal skin losses."
  }
];

export default function MachineTwin3D({ onSelectLeak }: { onSelectLeak?: (leakId: string) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeMachine, setActiveMachine] = useState<"boiler" | "economizer" | "stenter">("boiler");
  const [viewMode, setViewMode] = useState<"cad" | "thermal">("thermal");
  const [isRotating, setIsRotating] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const machineHotspots = useMemo(() => {
    return ALL_HOTSPOTS.filter((h) => h.machineId === activeMachine);
  }, [activeMachine]);

  const [selectedHotspot, setSelectedHotspot] = useState<LeakHotspot | null>(machineHotspots[0] || null);

  useEffect(() => {
    setSelectedHotspot(machineHotspots[0] || null);
  }, [activeMachine, machineHotspots]);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const machineGroupRef = useRef<THREE.Group | null>(null);
  const pinsGroupRef = useRef<THREE.Group | null>(null);
  const targetCamPos = useRef<THREE.Vector3>(new THREE.Vector3(10.5, 7.0, 11.5));
  const targetCamLook = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.2, 0));
  const isDragging = useRef(false);
  const prevMouse = useRef({ x: 0, y: 0 });

  // 1. Build Industrial Steam Boiler
  const buildBoiler = (isThermal: boolean) => {
    const group = new THREE.Group();
    const shellColor = isThermal ? 0x1e293b : 0x475569;
    const pipeColor = isThermal ? 0xef4444 : 0x0284c7;
    const metalColor = isThermal ? 0x334155 : 0x64748b;
    const hotAccent = 0xf97316;

    const shellMat = new THREE.MeshStandardMaterial({ color: shellColor, roughness: 0.35, metalness: 0.75 });
    const pipeMat = new THREE.MeshStandardMaterial({ color: pipeColor, roughness: 0.25, metalness: 0.85 });
    const metalMat = new THREE.MeshStandardMaterial({ color: metalColor, roughness: 0.4, metalness: 0.6 });
    const hotMat = new THREE.MeshStandardMaterial({
      color: hotAccent,
      roughness: 0.2,
      metalness: 0.9,
      emissive: isThermal ? 0xf97316 : 0x000000,
      emissiveIntensity: isThermal ? 0.35 : 0,
    });

    // Horizontal Boiler Shell
    const shellGeo = new THREE.CylinderGeometry(2.1, 2.1, 6.8, 36);
    const shell = new THREE.Mesh(shellGeo, shellMat);
    shell.rotation.z = Math.PI / 2;
    shell.position.set(0, 0.6, 0);
    group.add(shell);

    // End caps
    const endCapGeo = new THREE.SphereGeometry(2.1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 3);
    const frontCap = new THREE.Mesh(endCapGeo, shellMat);
    frontCap.rotation.z = -Math.PI / 2;
    frontCap.position.set(-3.4, 0.6, 0);
    group.add(frontCap);

    const backCap = new THREE.Mesh(endCapGeo, shellMat);
    backCap.rotation.z = Math.PI / 2;
    backCap.position.set(3.4, 0.6, 0);
    group.add(backCap);

    // Saddles
    [-2.0, 2.0].forEach((xPos) => {
      const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.4, 4.4), metalMat);
      saddle.position.set(xPos, -1.0, 0);
      group.add(saddle);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.2, 4.8), metalMat);
      base.position.set(xPos, -1.6, 0);
      group.add(base);
    });

    // Steam Drum
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 4.2, 28), shellMat);
    drum.rotation.z = Math.PI / 2;
    drum.position.set(0, 3.1, 0);
    group.add(drum);

    [-1.3, 1.3].forEach((rx) => {
      const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 20), pipeMat);
      riser.position.set(rx, 2.5, 0);
      group.add(riser);
    });

    // Steam Valve
    const valve = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.7, 20), hotMat);
    valve.position.set(0, 3.7, 0);
    group.add(valve);

    const handwheel = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.06, 12, 24), metalMat);
    handwheel.rotation.x = Math.PI / 2;
    handwheel.position.set(0, 4.15, 0);
    group.add(handwheel);

    // Burner Unit
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 1.2, 24), metalMat);
    burner.rotation.z = Math.PI / 2;
    burner.position.set(-4.2, 0.6, 0);
    group.add(burner);

    // Rear Flue Box & Stack
    const flueBox = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.8, 2.8), shellMat);
    flueBox.position.set(3.8, 1.2, 0);
    group.add(flueBox);

    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.65, 4.5, 24), pipeMat);
    stack.position.set(3.8, 4.6, 0);
    group.add(stack);

    // Blowdown line
    const blowdown = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.6, 16), pipeMat);
    blowdown.position.set(-1.8, -1.2, 1.2);
    group.add(blowdown);

    return group;
  };

  // 2. Build Waste Heat Economizer
  const buildEconomizer = (isThermal: boolean) => {
    const group = new THREE.Group();
    const towerColor = isThermal ? 0x1e293b : 0x475569;
    const finColor = isThermal ? 0xf97316 : 0x0284c7;
    const pipeColor = isThermal ? 0x38bdf8 : 0x0ea5e9;
    const metalColor = 0x64748b;

    const towerMat = new THREE.MeshStandardMaterial({ color: towerColor, roughness: 0.35, metalness: 0.7 });
    const finMat = new THREE.MeshStandardMaterial({
      color: finColor,
      roughness: 0.25,
      metalness: 0.85,
      emissive: isThermal ? 0xf97316 : 0x000000,
      emissiveIntensity: isThermal ? 0.3 : 0
    });
    const pipeMat = new THREE.MeshStandardMaterial({ color: pipeColor, roughness: 0.3, metalness: 0.8 });
    const metalMat = new THREE.MeshStandardMaterial({ color: metalColor, roughness: 0.4, metalness: 0.6 });

    // Main Rectangular Tower
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3.2, 5.5, 3.2), towerMat);
    tower.position.set(0, 1.8, 0);
    group.add(tower);

    // Bottom Gas Intake Duct Cone
    const bottomCone = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 0.9, 1.6, 4), metalMat);
    bottomCone.position.set(0, -1.5, 0);
    bottomCone.rotation.y = Math.PI / 4;
    group.add(bottomCone);

    // Top Exhaust Gas Duct
    const topStack = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 3.0, 24), pipeMat);
    topStack.position.set(0, 5.5, 0);
    group.add(topStack);

    // Cutout Window displaying Finned Heat Recovery Tube Matrix
    for (let i = 0; i < 5; i++) {
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.4, 16), finMat);
      tube.rotation.z = Math.PI / 2;
      tube.position.set(0, 0.3 + i * 0.7, 1.2);
      group.add(tube);
    }

    // Bypass Damper Actuator on Side
    const damperBox = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6), metalMat);
    damperBox.position.set(1.8, 2.8, 0);
    group.add(damperBox);

    // Water Headers
    const headerIn = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 3.8, 16), pipeMat);
    headerIn.position.set(-1.8, 1.8, 1.4);
    group.add(headerIn);

    return group;
  };

  // 3. Build Textile Stenter Machine Range
  const buildStenter = (isThermal: boolean) => {
    const group = new THREE.Group();
    const chamberColor = isThermal ? 0x1e293b : 0x475569;
    const hotDuctColor = isThermal ? 0xef4444 : 0x0284c7;
    const metalColor = 0x64748b;

    const chamberMat = new THREE.MeshStandardMaterial({ color: chamberColor, roughness: 0.35, metalness: 0.7 });
    const ductMat = new THREE.MeshStandardMaterial({
      color: hotDuctColor,
      roughness: 0.25,
      metalness: 0.85,
      emissive: isThermal ? 0xef4444 : 0x000000,
      emissiveIntensity: isThermal ? 0.3 : 0
    });
    const metalMat = new THREE.MeshStandardMaterial({ color: metalColor, roughness: 0.4, metalness: 0.6 });

    // Long Modular Drying Chamber
    const chamber = new THREE.Mesh(new THREE.BoxGeometry(9.6, 2.4, 3.4), chamberMat);
    chamber.position.set(0, 0.6, 0);
    group.add(chamber);

    // Chamber Support Legs
    [-4.0, -1.4, 1.4, 4.0].forEach((lx) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2, 3.6), metalMat);
      leg.position.set(lx, -1.0, 0);
      group.add(leg);
    });

    // 3 Overhead Circulation Blowers
    [-2.6, 0, 2.6].forEach((bx) => {
      const fan = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 0.65, 0.6, 20), metalMat);
      fan.position.set(bx, 2.0, 0);
      group.add(fan);
    });

    // Central Exhaust Hood & Duct (Leak location)
    const exhaustDuct = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.8, 20), ductMat);
    exhaustDuct.position.set(0, 3.4, 0);
    group.add(exhaustDuct);

    // Fabric Entry Infeed Rollers
    for (let r = 0; r < 3; r++) {
      const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3.2, 16), metalMat);
      roller.rotation.x = Math.PI / 2;
      roller.position.set(-5.3 - r * 0.4, 0.5 + (r % 2) * 0.3, 0);
      group.add(roller);
    }

    return group;
  };

  // Build current machine
  const getMachineModel = (id: "boiler" | "economizer" | "stenter", isThermal: boolean) => {
    switch (id) {
      case "boiler":
        return buildBoiler(isThermal);
      case "economizer":
        return buildEconomizer(isThermal);
      case "stenter":
        return buildStenter(isThermal);
    }
  };

  // Three.js Lifecycle Setup
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 480;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const isDark = document.documentElement.dataset.theme !== "light";
    scene.background = new THREE.Color(isDark ? 0x090b10 : 0xf8fafc);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(10.5, 7.0, 11.5);
    camera.lookAt(0, 1.2, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    containerRef.current.replaceChildren(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.85 : 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, isDark ? 1.5 : 1.8);
    dirLight.position.set(10, 14, 12);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(isDark ? 0x38bdf8 : 0x93c5fd, 0.6);
    fillLight.position.set(-10, -5, -8);
    scene.add(fillLight);

    // Floor Tech Grid
    const gridHelper = new THREE.GridHelper(20, 20, isDark ? 0x0284c7 : 0x94a3b8, isDark ? 0x1e293b : 0xe2e8f0);
    gridHelper.position.y = -1.7;
    scene.add(gridHelper);

    // Current Machine
    const machine = getMachineModel(activeMachine, viewMode === "thermal");
    machineGroupRef.current = machine;
    scene.add(machine);

    // Pins Group
    const pinsGroup = new THREE.Group();
    pinsGroupRef.current = pinsGroup;

    machineHotspots.forEach((spot) => {
      const pinAnchor = new THREE.Group();
      pinAnchor.position.set(...spot.position);

      const sphereGeo = new THREE.SphereGeometry(0.24, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: spot.severity === "critical" ? 0xef4444 : spot.severity === "high" ? 0xf97316 : 0xf59e0b,
      });
      const pinSphere = new THREE.Mesh(sphereGeo, sphereMat);
      pinAnchor.add(pinSphere);

      const ringGeo = new THREE.RingGeometry(0.28, 0.44, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: spot.severity === "critical" ? 0xef4444 : 0xf97316,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.name = "pulseRing";
      pinAnchor.add(ring);

      pinsGroup.add(pinAnchor);
    });

    scene.add(pinsGroup);

    // Mouse Interaction
    const dom = renderer.domElement;

    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      prevMouse.current = { x: e.clientX, y: e.clientY };
      setIsRotating(false);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !machineGroupRef.current) return;
      const dx = e.clientX - prevMouse.current.x;
      const dy = e.clientY - prevMouse.current.y;
      machineGroupRef.current.rotation.y += dx * 0.008;
      machineGroupRef.current.rotation.x = Math.max(-0.4, Math.min(0.6, machineGroupRef.current.rotation.x + dy * 0.005));
      prevMouse.current = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!cameraRef.current) return;
      const zoomFactor = e.deltaY > 0 ? 1.08 : 0.92;
      cameraRef.current.position.multiplyScalar(zoomFactor);
      cameraRef.current.position.clampLength(4, 25);
    };

    dom.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    dom.addEventListener("wheel", onWheel, { passive: false });

    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 480;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      if (isRotating && machineGroupRef.current) {
        machineGroupRef.current.rotation.y += delta * 0.15;
      }

      if (cameraRef.current) {
        cameraRef.current.position.lerp(targetCamPos.current, 0.04);
        cameraRef.current.lookAt(targetCamLook.current);
      }

      if (pinsGroupRef.current) {
        pinsGroupRef.current.children.forEach((child) => {
          const ring = child.getObjectByName("pulseRing");
          if (ring) {
            const scale = 1 + 0.3 * Math.sin(elapsed * 4);
            ring.scale.set(scale, scale, scale);
            if (cameraRef.current) {
              ring.lookAt(cameraRef.current.position);
            }
          }
        });
      }

      const currentDark = document.documentElement.dataset.theme !== "light";
      scene.background = new THREE.Color(currentDark ? 0x090b10 : 0xf8fafc);

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      dom.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      dom.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
    };
  }, [viewMode, activeMachine, machineHotspots]);

  const handleSelectHotspot = (spot: LeakHotspot) => {
    setSelectedHotspot(spot);
    setIsRotating(false);
    targetCamPos.current.set(...spot.cameraPos);
    targetCamLook.current.set(...spot.cameraTarget);
    if (onSelectLeak) {
      onSelectLeak(spot.id);
    }
  };

  const handleResetCamera = () => {
    targetCamPos.current.set(10.5, 7.0, 11.5);
    targetCamLook.current.set(0, 1.2, 0);
    setIsRotating(true);
  };

  return (
    <div className={`twin-container ${isFullscreen ? "twin-fullscreen" : ""}`}>
      {/* 3D Header Bar */}
      <div className="twin-header">
        <div className="flex items-center gap-3">
          <div className="twin-badge">
            <span className="live-dot" />
            <span>3D PLANT TWIN · SPATIAL LEAK DETECTOR</span>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline">
            Tirupur Facility · Primary Process Steam Infrastructure
          </span>
        </div>

        <div className="twin-controls">
          {/* Machine Selector */}
          <div className="twin-machine-tabs">
            <button
              className={`twin-tab ${activeMachine === "boiler" ? "active" : ""}`}
              onClick={() => {
                setActiveMachine("boiler");
                handleResetCamera();
              }}
            >
              Steam Boiler
            </button>
            <button
              className={`twin-tab ${activeMachine === "economizer" ? "active" : ""}`}
              onClick={() => {
                setActiveMachine("economizer");
                handleResetCamera();
              }}
              title="Waste heat economizer unit"
            >
              Economizer
            </button>
            <button
              className={`twin-tab ${activeMachine === "stenter" ? "active" : ""}`}
              onClick={() => {
                setActiveMachine("stenter");
                handleResetCamera();
              }}
              title="Fabric stenter drying range"
            >
              Stenter Range
            </button>
          </div>

          {/* Mode Switcher */}
          <div className="twin-mode-toggle">
            <button
              className={`mode-btn ${viewMode === "thermal" ? "active" : ""}`}
              onClick={() => setViewMode("thermal")}
              title="Show thermal leak heat gradients"
            >
              <Flame size={14} />
              <span>Thermal</span>
            </button>
            <button
              className={`mode-btn ${viewMode === "cad" ? "active" : ""}`}
              onClick={() => setViewMode("cad")}
              title="Show precision CAD wireframe"
            >
              <Layers size={14} />
              <span>CAD</span>
            </button>
          </div>

          <button className="icon-btn" onClick={handleResetCamera} title="Reset 3D camera">
            <RotateCcw size={15} />
          </button>
          <button
            className="icon-btn"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen 3D View"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* Main 3D Viewport + Telemetry Split */}
      <div className="twin-body">
        {/* Canvas Area */}
        <div className="twin-canvas-wrap">
          <div className="twin-canvas-viewport" ref={containerRef} />
          {/* Floating Hotspot Markers Overlay */}
          <div className="twin-floating-pins">
            {machineHotspots.map((spot, i) => (
              <button
                key={spot.id}
                className={`twin-pin-btn ${selectedHotspot?.id === spot.id ? "selected" : ""}`}
                onClick={() => handleSelectHotspot(spot)}
              >
                <span className={`pin-dot ${spot.severity}`} />
                <span className="pin-num">0{i + 1}</span>
                <span className="pin-label">{spot.component}</span>
              </button>
            ))}
          </div>

          <div className="twin-canvas-hint">
            <span>Drag to rotate 360° · Scroll to zoom · Click pins for telemetry</span>
          </div>
        </div>

        {/* Live Engineering Telemetry Sidebar */}
        {selectedHotspot && (
          <div className="twin-telemetry-panel">
            <div className="telemetry-head">
              <div className="flex items-center gap-2">
                <span className={`severity-tag ${selectedHotspot.severity}`}>
                  {selectedHotspot.severity.toUpperCase()} LEAK
                </span>
                <span className="text-xs text-slate-400 font-mono">PIN 0{machineHotspots.indexOf(selectedHotspot) + 1}</span>
              </div>
              <h3 className="telemetry-title">{selectedHotspot.title}</h3>
              <p className="telemetry-component">{selectedHotspot.component}</p>
            </div>

            <div className="telemetry-metrics">
              <div className="metric-box">
                <span className="metric-lbl">Measured Temp</span>
                <div className="metric-val text-amber-500 flex items-center gap-1">
                  <Thermometer size={14} />
                  <span>{selectedHotspot.temperature}</span>
                </div>
                <span className="metric-sub">{selectedHotspot.benchmarkTemp}</span>
              </div>

              <div className="metric-box">
                <span className="metric-lbl">Carbon Leak Rate</span>
                <div className="metric-val text-red-400 flex items-center gap-1">
                  <Activity size={14} />
                  <span>{selectedHotspot.emissionsLoss}</span>
                </div>
                <span className="metric-sub">{selectedHotspot.scope}</span>
              </div>

              <div className="metric-box">
                <span className="metric-lbl">Annual Fuel Waste</span>
                <div className="metric-val text-orange-400 font-bold">
                  {selectedHotspot.financialWaste}
                </div>
                <span className="metric-sub">Direct opex drain</span>
              </div>

              <div className="metric-box">
                <span className="metric-lbl">Statutory Rule</span>
                <div className="metric-val text-slate-300 text-xs font-medium">
                  {selectedHotspot.rule}
                </div>
                <span className="metric-sub">BEE MSME Trigger</span>
              </div>
            </div>

            <div className="telemetry-desc">
              <p>{selectedHotspot.description}</p>
            </div>

            {/* Circular Engineering Solution Card */}
            <div className="solution-card">
              <div className="solution-head">
                <Zap size={14} className="text-emerald-400" />
                <span>RECOMMENDED CIRCULAR ACTION</span>
              </div>
              <div className="solution-title">{selectedHotspot.intervention}</div>
              <div className="solution-stats">
                <div className="stat">
                  <span>Payback:</span>
                  <strong>{selectedHotspot.paybackMonths} months</strong>
                </div>
                <div className="stat">
                  <span>Annual Savings:</span>
                  <strong className="text-emerald-400">{selectedHotspot.annualSavings}</strong>
                </div>
              </div>
              <div className="solution-actions">
                <Link to="/portfolio" className="action-link-btn">
                  <span>View in Portfolio</span>
                  <ArrowUpRight size={14} />
                </Link>
                <Link to="/scenarios" className="action-link-btn secondary">
                  <span>Simulate Impact</span>
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
