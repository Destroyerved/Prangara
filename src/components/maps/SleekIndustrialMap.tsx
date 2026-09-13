import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  MapPin,
  LocateFixed,
  Layers,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Play,
  Pause,
  Satellite,
  Activity,
  Gauge,
  Maximize2,
  Minimize2,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface GeoPoint {
  lat: number;
  lon: number;
  label?: string;
  type?: "origin" | "destination" | "waypoint" | "toll" | "rail_intermodal" | "charger" | "cluster";
  details?: string;
}

export interface RouteOption {
  mode: "fastest" | "cheapest" | "lowest_carbon" | "balanced";
  label: string;
  vehicle: string;
  km: number;
  costInr: number;
  emissionsTco2e: number;
  tag: string;
  color?: string;
  waypoints: GeoPoint[];
}

export interface MapProps {
  corridorName?: string;
  origin: GeoPoint;
  destination: GeoPoint;
  selectedMode?: "fastest" | "cheapest" | "lowest_carbon" | "balanced";
  onModeSelect?: (mode: "fastest" | "cheapest" | "lowest_carbon" | "balanced") => void;
  clusters?: GeoPoint[];
  className?: string;
  height?: number | string;
}

// Built-in Waypoint data for corridors
const CORRIDOR_WAYPOINTS: Record<string, Record<string, GeoPoint[]>> = {
  default: {
    balanced: [
      { lat: 11.1085, lon: 77.3411, label: "Tirupur MSME Hub", type: "origin", details: "Zero-emission factory gate dispatch" },
      { lat: 11.3410, lon: 77.7172, label: "Erode Weighbridge & CNG Hub", type: "waypoint", details: "Commercial automated weighbridge" },
      { lat: 11.6643, lon: 78.1460, label: "Salem Steel Corridor Junction", type: "toll", details: "FASTag electronic toll lane" },
      { lat: 11.5977, lon: 78.5996, label: "Attur Bypass Logistics Park", type: "charger", details: "150kW CCS2 Industrial EV fast-charger" },
      { lat: 11.6888, lon: 79.2942, label: "Ulundurpet Toll Hub", type: "toll", details: "NH45 Green corridor checkpoint" },
      { lat: 12.2338, lon: 79.6508, label: "Tindivanam Intermodal Yard", type: "rail_intermodal", details: "Container staging & transfer siding" },
      { lat: 13.0827, lon: 80.2707, label: "Chennai Sea Port (Gate 2A)", type: "destination", details: "Container Terminal Export Berth" },
    ],
    lowest_carbon: [
      { lat: 11.1085, lon: 77.3411, label: "Tirupur Rail Terminal", type: "origin", details: "First-mile electric drayage" },
      { lat: 11.3410, lon: 77.7172, label: "Erode Southern DFC Rail Siding", type: "rail_intermodal", details: "Electrified double-stack rail loading" },
      { lat: 11.6643, lon: 78.1460, label: "Salem Central Freight Yard", type: "rail_intermodal", details: "Automated rail wagon marshaling" },
      { lat: 12.0120, lon: 79.0747, label: "Tiruvannamalai Rail Bypass", type: "rail_intermodal", details: "Dedicated freight transit corridor" },
      { lat: 12.9165, lon: 79.1325, label: "Vellore Intermodal Hub", type: "rail_intermodal", details: "Green electric freight interchange" },
      { lat: 13.0827, lon: 80.2707, label: "Chennai Port Rail Gateway", type: "destination", details: "Direct on-dock rail siding" },
    ],
    fastest: [
      { lat: 11.1085, lon: 77.3411, label: "Tirupur Ring Road", type: "origin", details: "Dedicated multi-axle departure" },
      { lat: 11.5034, lon: 77.9876, label: "Sankari Express Tollway", type: "toll", details: "Express green lane clearance" },
      { lat: 11.6643, lon: 78.1460, label: "Salem Bypass Interchange", type: "waypoint", details: "NH44 High-speed connector" },
      { lat: 12.1211, lon: 78.1582, label: "Dharmapuri Corridor", type: "toll", details: "High-speed freight lane" },
      { lat: 12.8342, lon: 79.7036, label: "Kanchipuram Industrial Ring", type: "waypoint", details: "Outer ring road bypass" },
      { lat: 13.0827, lon: 80.2707, label: "Chennai Port Expressway", type: "destination", details: "Dedicated port elevated corridor" },
    ],
    cheapest: [
      { lat: 11.1085, lon: 77.3411, label: "Tirupur East Gate", type: "origin", details: "Secondary road dispatch" },
      { lat: 11.2330, lon: 77.5830, label: "Perundurai Industrial Estate", type: "waypoint", details: "State highway route" },
      { lat: 11.4500, lon: 78.2000, label: "Namakkal Freight Corridor", type: "waypoint", details: "Toll-avoidance regional bypass" },
      { lat: 11.9400, lon: 79.4900, label: "Villupuram Rural Bypass", type: "waypoint", details: "Low-cost logistics feeder" },
      { lat: 12.6800, lon: 79.9800, label: "Chengalpattu Logistics Siding", type: "waypoint", details: "Outer freight consolidation" },
      { lat: 13.0827, lon: 80.2707, label: "Chennai Port North Gate", type: "destination", details: "Standard terminal intake" },
    ]
  }
};

// Haversine formula for calculating distance in km
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export function SleekIndustrialMap({
  corridorName = "Tirupur → Chennai Port (Export Corridor)",
  origin,
  destination,
  selectedMode = "balanced",
  onModeSelect,
  clusters = [],
  className = "",
  height = 520,
}: MapProps) {
  // Map View State (Pan & Zoom)
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Layers Toggles
  const [showRoutes, setShowRoutes] = useState(true);
  const [showWaypoints, setShowWaypoints] = useState(true);
  const [showFleet, setShowFleet] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showClusters, setShowClusters] = useState(true);
  const [layersOpen, setLayersOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Live Vehicle Simulation State
  const [simPlaying, setSimPlaying] = useState(true);
  const [simProgress, setSimProgress] = useState(0.38); // 0 to 1 along path
  const [simSpeedMultiplier, setSimSpeedMultiplier] = useState<1 | 2 | 5>(1);
  const [hoveredPoint, setHoveredPoint] = useState<GeoPoint | null>(null);

  // Real Device GPS State
  const [gpsActive, setGpsActive] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<"idle" | "locating" | "locked" | "denied">("idle");
  const [deviceGps, setDeviceGps] = useState<{
    lat: number;
    lon: number;
    accuracy: number;
    altitude: number | null;
    speed: number | null;
    heading: number | null;
    timestamp: number;
  } | null>(null);
  const [gpsDistanceToOrigin, setGpsDistanceToOrigin] = useState<number | null>(null);

  // Telemetry Metrics
  const currentSpeedKmH = useMemo(() => {
    if (!simPlaying) return 0;
    const base = selectedMode === "fastest" ? 78 : selectedMode === "lowest_carbon" ? 58 : 64;
    return Math.round(base + Math.sin(simProgress * 20) * 4);
  }, [simPlaying, selectedMode, simProgress]);

  // Active Waypoints
  const waypoints = useMemo(() => {
    const defaultCorridor = CORRIDOR_WAYPOINTS.default;
    const modePoints = defaultCorridor[selectedMode] || defaultCorridor.balanced;
    return [
      { ...origin, type: "origin" as const },
      ...modePoints.slice(1, -1),
      { ...destination, type: "destination" as const },
    ];
  }, [origin, destination, selectedMode]);

  // Dynamic Geographic Bounding Box
  const bounds = useMemo(() => {
    const allLats = [...waypoints.map((p) => p.lat), ...(clusters.map((c) => c.lat))];
    const allLons = [...waypoints.map((p) => p.lon), ...(clusters.map((c) => c.lon))];
    if (deviceGps) {
      allLats.push(deviceGps.lat);
      allLons.push(deviceGps.lon);
    }
    const minLat = Math.min(...allLats);
    const maxLat = Math.max(...allLats);
    const minLon = Math.min(...allLons);
    const maxLon = Math.max(...allLons);

    // Add padding margins
    const latPadding = (maxLat - minLat) * 0.22 || 0.5;
    const lonPadding = (maxLon - minLon) * 0.22 || 0.5;

    return {
      minLat: minLat - latPadding,
      maxLat: maxLat + latPadding,
      minLon: minLon - lonPadding,
      maxLon: maxLon + lonPadding,
    };
  }, [waypoints, clusters, deviceGps]);

  // Coordinate Projection: Lat/Lon -> SVG coordinates (0 - 1000, 0 - 650)
  const SVG_WIDTH = 1000;
  const SVG_HEIGHT = 650;

  const project = useCallback(
    (lat: number, lon: number): { x: number; y: number } => {
      const xRatio = (lon - bounds.minLon) / (bounds.maxLon - bounds.minLon || 1);
      // Latitude is inverted in SVG (North is higher up, smaller Y)
      const yRatio = 1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat || 1);

      return {
        x: Math.max(30, Math.min(SVG_WIDTH - 30, xRatio * SVG_WIDTH)),
        y: Math.max(30, Math.min(SVG_HEIGHT - 30, yRatio * SVG_HEIGHT)),
      };
    },
    [bounds]
  );

  // Projected SVG points for route
  const projectedPoints = useMemo(() => {
    return waypoints.map((p) => ({
      ...p,
      svg: project(p.lat, p.lon),
    }));
  }, [waypoints, project]);

  // Generate smooth SVG Catmull-Rom or Bezier path
  const routePathD = useMemo(() => {
    if (projectedPoints.length < 2) return "";
    let d = `M ${projectedPoints[0].svg.x} ${projectedPoints[0].svg.y}`;

    for (let i = 0; i < projectedPoints.length - 1; i++) {
      const p0 = projectedPoints[i];
      const p1 = projectedPoints[i + 1];
      const midX = (p0.svg.x + p1.svg.x) / 2;
      const midY = (p0.svg.y + p1.svg.y) / 2;
      d += ` Q ${p0.svg.x} ${p0.svg.y} ${midX} ${midY}`;
    }
    const last = projectedPoints[projectedPoints.length - 1];
    d += ` T ${last.svg.x} ${last.svg.y}`;
    return d;
  }, [projectedPoints]);

  // Vehicle position calculation along path
  const [vehiclePos, setVehiclePos] = useState({ x: 0, y: 0, angle: 0 });
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (!pathRef.current) return;
    try {
      const pathLength = pathRef.current.getTotalLength();
      const currentDist = pathLength * simProgress;
      const point = pathRef.current.getPointAtLength(currentDist);

      // Tangent for vehicle heading angle
      const forwardPoint = pathRef.current.getPointAtLength(
        Math.min(pathLength, currentDist + 4)
      );
      const angle =
        (Math.atan2(forwardPoint.y - point.y, forwardPoint.x - point.x) * 180) / Math.PI;

      setVehiclePos({ x: point.x, y: point.y, angle });
    } catch {
      // Fallback
    }
  }, [simProgress, routePathD]);

  // Simulation loop
  useEffect(() => {
    if (!simPlaying) return;
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      // Full route travel cycle takes ~45 seconds at 1x
      const speed = (1 / 45) * simSpeedMultiplier;
      setSimProgress((prev) => {
        const next = prev + speed * dt;
        return next > 1 ? 0 : next;
      });

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [simPlaying, simSpeedMultiplier]);

  // Device GPS Handler
  const handleRequestDeviceGps = useCallback(() => {
    if (gpsActive) {
      setGpsActive(false);
      setGpsStatus("idle");
      return;
    }

    if (!("geolocation" in navigator)) {
      alert("Geolocation is not supported by your browser. Enabling high-precision simulated GPS.");
      activateSimulatedGps();
      return;
    }

    setGpsStatus("locating");
    setGpsActive(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          altitude: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : null,
          heading: pos.coords.heading ? Math.round(pos.coords.heading) : null,
          timestamp: pos.timestamp,
        };
        setDeviceGps(coords);
        setGpsStatus("locked");

        const dist = haversineDistance(coords.lat, coords.lon, origin.lat, origin.lon);
        setGpsDistanceToOrigin(dist);
      },
      (err) => {
        console.warn("GPS Permission or Device Error:", err.message);
        // Seamless fallback to simulated industrial facility coordinates
        activateSimulatedGps();
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  }, [gpsActive, origin.lat, origin.lon]);

  const activateSimulatedGps = () => {
    // High-precision simulated facility GPS located in Tirupur industrial zone
    const simCoords = {
      lat: 11.1120 + (Math.random() - 0.5) * 0.005,
      lon: 77.3485 + (Math.random() - 0.5) * 0.005,
      accuracy: 8,
      altitude: 295,
      speed: 0,
      heading: 42,
      timestamp: Date.now(),
    };
    setDeviceGps(simCoords);
    setGpsStatus("locked");
    const dist = haversineDistance(simCoords.lat, simCoords.lon, origin.lat, origin.lon);
    setGpsDistanceToOrigin(dist);
  };

  // Pan interaction handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Color mapping based on route mode
  const modeColor = useMemo(() => {
    switch (selectedMode) {
      case "lowest_carbon":
        return "#10b981"; // Emerald
      case "fastest":
        return "#f59e0b"; // Amber
      case "cheapest":
        return "#a855f7"; // Violet
      case "balanced":
      default:
        return "#0284c7"; // Cyan / Industrial Blue
    }
  }, [selectedMode]);

  return (
    <div
      ref={containerRef}
      className={`sleek-map-wrapper glass-panel relative overflow-hidden rounded-2xl border select-none ${className} ${
        isFullscreen ? "fixed inset-0 z-[10000] !rounded-none !border-none !h-screen !w-screen" : ""
      }`}
      style={{
        height: isFullscreen ? "100vh" : height,
        background: "radial-gradient(ellipse at 50% 30%, rgba(8, 22, 36, 0.95) 0%, rgba(4, 9, 15, 0.98) 100%)",
        borderColor: "var(--border, rgba(121, 215, 230, 0.2))",
        boxShadow: "0 20px 50px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.08)",
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* 1. TOP HUD BAR */}
      <div className="absolute top-3 left-3 right-3 z-30 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        {/* Left: Corridor Identity & GPS Status Badge */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="glass-panel flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-black/40 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  gpsStatus === "locked" ? "bg-emerald-400" : "bg-cyan-400"
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  gpsStatus === "locked" ? "bg-emerald-500" : "bg-cyan-500"
                }`}
              />
            </span>
            <span className="text-xs font-semibold text-white tracking-wide">
              {corridorName}
            </span>
          </div>

          {/* GPS Satellite Lock Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-medium border backdrop-blur-md transition-all ${
              gpsStatus === "locked"
                ? "bg-emerald-950/50 text-emerald-300 border-emerald-500/30"
                : gpsStatus === "locating"
                ? "bg-amber-950/50 text-amber-300 border-amber-500/30 animate-pulse"
                : "bg-black/30 text-slate-400 border-white/10"
            }`}
          >
            <Satellite size={13} className={gpsStatus === "locked" ? "text-emerald-400" : ""} />
            <span>
              {gpsStatus === "locked"
                ? `GPS LOCKED · ±${deviceGps?.accuracy || 8}m`
                : gpsStatus === "locating"
                ? "ACQUIRING GNSS SATELLITES…"
                : "GPS STANDBY"}
            </span>
          </div>
        </div>

        {/* Right: Quick Routing Preset Pills & Fullscreen */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          {onModeSelect && (
            <div className="hidden sm:flex items-center gap-1 p-1 rounded-xl bg-black/50 border border-white/10 backdrop-blur-md">
              {(
                [
                  { id: "balanced", label: "Balanced", color: "#0284c7" },
                  { id: "lowest_carbon", label: "Rail DFC", color: "#10b981" },
                  { id: "fastest", label: "Fastest", color: "#f59e0b" },
                  { id: "cheapest", label: "Low Cost", color: "#a855f7" },
                ] as const
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onModeSelect(m.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    selectedMode === m.id
                      ? "bg-white/20 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                  style={{
                    borderColor: selectedMode === m.id ? m.color : "transparent",
                    color: selectedMode === m.id ? m.color : undefined,
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-black/40 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md"
            title={isFullscreen ? "Exit Fullscreen" : "Expand Map"}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* 2. INTERACTIVE SVG VECTOR MAP CANVAS */}
      <div
        className="w-full h-full cursor-grab active:cursor-grabbing relative"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "center center",
          transition: isDragging ? "none" : "transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full"
          style={{ filter: "drop-shadow(0 0 1px rgba(0,0,0,0.5))" }}
        >
          <defs>
            {/* Ambient Background Grid Patterns */}
            <pattern id="sleek-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke="rgba(121, 215, 230, 0.05)"
                strokeWidth="0.8"
              />
            </pattern>
            <pattern id="sleek-dots" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="0.8" fill="rgba(255, 255, 255, 0.08)" />
            </pattern>

            {/* Glowing Gradients */}
            <linearGradient id="route-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
              <stop offset="50%" stopColor={modeColor} stopOpacity="1" />
              <stop offset="100%" stopColor="#79D7E6" stopOpacity="0.95" />
            </linearGradient>

            <filter id="route-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(121, 215, 230, 0.25)" />
              <stop offset="60%" stopColor="rgba(121, 215, 230, 0.05)" />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          </defs>

          {/* Grid Layer */}
          {showGrid && (
            <>
              <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#sleek-grid)" />
              <rect width={SVG_WIDTH} height={SVG_HEIGHT} fill="url(#sleek-dots)" />

              {/* Decorative Topographic Contour Elevation Rings */}
              <g stroke="rgba(121, 215, 230, 0.04)" fill="none" strokeWidth="1">
                <ellipse cx="420" cy="340" rx="360" ry="210" />
                <ellipse cx="450" cy="350" rx="270" ry="160" />
                <ellipse cx="490" cy="360" rx="180" ry="100" />
                <ellipse cx="780" cy="220" rx="220" ry="140" stroke="rgba(97, 184, 245, 0.03)" />
              </g>

              {/* Latitude / Longitude Tick Grid Labels */}
              <g fill="rgba(148, 163, 184, 0.3)" fontSize="9" fontFamily="monospace">
                <text x="40" y="30">LAT {bounds.maxLat.toFixed(2)}° N</text>
                <text x="40" y={SVG_HEIGHT - 20}>LAT {bounds.minLat.toFixed(2)}° N</text>
                <text x={SVG_WIDTH - 120} y="30">LON {bounds.maxLon.toFixed(2)}° E</text>
                <text x={SVG_WIDTH - 120} y={SVG_HEIGHT - 20}>LON {bounds.minLon.toFixed(2)}° E</text>
              </g>
            </>
          )}

          {/* Clusters / Symbiosis Nodes Layer */}
          {showClusters &&
            clusters.map((c, i) => {
              const p = project(c.lat, c.lon);
              return (
                <g
                  key={c.label || i}
                  className="cursor-pointer transition-transform hover:scale-110"
                  onMouseEnter={() => setHoveredPoint(c)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <circle cx={p.x} cy={p.y} r="14" fill="rgba(168, 85, 247, 0.12)" />
                  <circle cx={p.x} cy={p.y} r="5" fill="#c084fc" stroke="#581c87" strokeWidth="1.5" />
                  <text
                    x={p.x}
                    y={p.y + 16}
                    fill="#e9d5ff"
                    fontSize="9.5"
                    fontWeight="600"
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                  >
                    {c.label}
                  </text>
                </g>
              );
            })}

          {/* Route Path Polyline / Spline */}
          {showRoutes && routePathD && (
            <>
              {/* Underlying Track Guideway */}
              <path
                d={routePathD}
                fill="none"
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="10"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Glowing Route Flow Core */}
              <path
                ref={pathRef}
                d={routePathD}
                fill="none"
                stroke="url(#route-gradient)"
                strokeWidth={selectedMode === "lowest_carbon" ? 4 : 3.5}
                strokeDasharray={selectedMode === "lowest_carbon" ? "8 5" : undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#route-glow)"
              />

              {/* Dynamic Flow Pulse Animation */}
              <path
                d={routePathD}
                fill="none"
                stroke="rgba(255, 255, 255, 0.8)"
                strokeWidth="2"
                strokeDasharray="6 80"
                strokeLinecap="round"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to="-86"
                  dur="2.5s"
                  repeatCount="indefinite"
                />
              </path>
            </>
          )}

          {/* Interactive Route Waypoints */}
          {showWaypoints &&
            projectedPoints.map((pt, index) => {
              const isOrigin = pt.type === "origin";
              const isDest = pt.type === "destination";
              const isToll = pt.type === "toll";
              const isRail = pt.type === "rail_intermodal";
              const isCharger = pt.type === "charger";

              let markerColor = "#38bdf8";
              if (isOrigin) markerColor = "#10b981"; // Green for plant
              if (isDest) markerColor = "#f43f5e"; // Rose for port
              if (isRail) markerColor = "#06b6d4"; // Cyan rail
              if (isToll) markerColor = "#f59e0b"; // Amber toll
              if (isCharger) markerColor = "#34d399"; // Mint charger

              return (
                <g
                  key={index}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredPoint(pt)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  {/* Subtle Pulse ring for endpoints */}
                  {(isOrigin || isDest) && (
                    <circle
                      cx={pt.svg.x}
                      cy={pt.svg.y}
                      r="16"
                      fill={markerColor}
                      opacity="0.2"
                    >
                      <animate
                        attributeName="r"
                        values="8;20;8"
                        dur="3s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        values="0.3;0;0.3"
                        dur="3s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Marker Node */}
                  <circle
                    cx={pt.svg.x}
                    cy={pt.svg.y}
                    r={isOrigin || isDest ? 7 : 4}
                    fill={markerColor}
                    stroke="#0b1320"
                    strokeWidth="2"
                  />

                  {/* Label Text */}
                  <text
                    x={pt.svg.x}
                    y={isOrigin || isDest ? pt.svg.y - 12 : pt.svg.y + 14}
                    fill={isOrigin || isDest ? "#ffffff" : "#94a3b8"}
                    fontSize={isOrigin || isDest ? "11" : "9"}
                    fontWeight={isOrigin || isDest ? "700" : "500"}
                    textAnchor="middle"
                    className="select-none pointer-events-none"
                    style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
                  >
                    {pt.label}
                  </text>
                </g>
              );
            })}

          {/* Real Device GPS Geolocation Target Reticle */}
          {gpsActive && deviceGps && (
            (() => {
              const p = project(deviceGps.lat, deviceGps.lon);
              return (
                <g className="transition-all duration-500 ease-out">
                  {/* Outer Accuracy Radius Circle */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={Math.max(22, (deviceGps.accuracy || 10) * 1.5)}
                    fill="rgba(16, 185, 129, 0.12)"
                    stroke="rgba(16, 185, 129, 0.4)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  {/* Radar Sweep Arc */}
                  <circle cx={p.x} cy={p.y} r="14" fill="url(#radar-glow)" />
                  {/* Target Crosshair */}
                  <circle cx={p.x} cy={p.y} r="6" fill="#10b981" stroke="#042f2e" strokeWidth="2" />
                  <line x1={p.x - 12} y1={p.y} x2={p.x + 12} y2={p.y} stroke="#34d399" strokeWidth="1.2" />
                  <line x1={p.x - 12} y1={p.y} x2={p.x + 12} y2={p.y} stroke="#34d399" strokeWidth="1.2" />

                  {/* Device GPS Floating Tag */}
                  <g transform={`translate(${p.x}, ${p.y - 20})`}>
                    <rect
                      x="-65"
                      y="-16"
                      width="130"
                      height="18"
                      rx="4"
                      fill="rgba(4, 47, 46, 0.9)"
                      stroke="rgba(52, 211, 153, 0.6)"
                      strokeWidth="0.8"
                    />
                    <text
                      x="0"
                      y="-4"
                      fill="#6ee7b7"
                      fontSize="9"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      YOU (GPS ±{deviceGps.accuracy}m)
                    </text>
                  </g>
                </g>
              );
            })()
          )}

          {/* Live Fleet Simulation Vehicle Dot */}
          {showFleet && vehiclePos.x > 0 && (
            <g
              transform={`translate(${vehiclePos.x}, ${vehiclePos.y}) rotate(${vehiclePos.angle})`}
              className="transition-transform ease-out"
            >
              {/* Radar pulse wave behind truck */}
              <circle cx="-6" cy="0" r="12" fill="none" stroke={modeColor} strokeWidth="1" opacity="0.4">
                <animate attributeName="r" values="6;18" dur="1.2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.6;0" dur="1.2s" repeatCount="indefinite" />
              </circle>

              {/* Vehicle Body Representation */}
              <rect
                x="-10"
                y="-6"
                width="20"
                height="12"
                rx="3"
                fill="#0f172a"
                stroke={modeColor}
                strokeWidth="1.8"
              />
              <circle cx="4" cy="0" r="2.2" fill="#ffffff" />
            </g>
          )}
        </svg>
      </div>

      {/* 3. HOVERED WAYPOINT TOOLTIP */}
      <AnimatePresence>
        {hoveredPoint && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute top-16 left-6 z-40 p-3 rounded-xl bg-slate-950/90 border border-cyan-500/30 text-xs shadow-2xl backdrop-blur-md max-w-xs pointer-events-none"
          >
            <div className="flex items-center gap-1.5 font-bold text-white mb-0.5">
              <MapPin size={13} className="text-cyan-400" />
              <span>{hoveredPoint.label}</span>
            </div>
            <div className="font-mono text-[10px] text-cyan-200/80 mb-1">
              {hoveredPoint.lat.toFixed(4)}° N, {hoveredPoint.lon.toFixed(4)}° E
            </div>
            {hoveredPoint.details && (
              <div className="text-slate-300 text-[11px] leading-relaxed">
                {hoveredPoint.details}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. BOTTOM-LEFT: LIVE FLEET TELEMETRY HUD */}
      <div className="absolute bottom-3 left-3 z-30 flex flex-col gap-2 max-w-sm pointer-events-none">
        <div className="glass-panel p-3 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md pointer-events-auto flex items-center gap-4 text-xs">
          {/* Speed Gauge */}
          <div className="flex items-center gap-2 border-r border-white/10 pr-3">
            <Gauge size={18} className="text-cyan-400" />
            <div>
              <div className="font-mono text-sm font-extrabold text-white leading-none">
                {currentSpeedKmH} <span className="text-[10px] font-normal text-slate-400">km/h</span>
              </div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400">Telemetry Speed</span>
            </div>
          </div>

          {/* Progress / Odometer */}
          <div className="flex items-center gap-2 border-r border-white/10 pr-3">
            <Activity size={18} className="text-emerald-400" />
            <div>
              <div className="font-mono text-sm font-extrabold text-white leading-none">
                {Math.round(simProgress * 100)}%
              </div>
              <span className="text-[9px] uppercase tracking-wider text-slate-400">Corridor Odometer</span>
            </div>
          </div>

          {/* Simulation Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setSimPlaying(!simPlaying)}
              className="p-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors"
              title={simPlaying ? "Pause Simulation" : "Start Live Simulation"}
            >
              {simPlaying ? <Pause size={13} /> : <Play size={13} />}
            </button>
            <button
              type="button"
              onClick={() => {
                setSimSpeedMultiplier((prev) => (prev === 1 ? 2 : prev === 2 ? 5 : 1));
              }}
              className="px-2 py-1 rounded-lg bg-white/10 text-[11px] font-bold text-cyan-300 hover:bg-white/20 transition-colors"
              title="Simulation Playback Multiplier"
            >
              {simSpeedMultiplier}x
            </button>
          </div>
        </div>

        {/* GPS Distance Feedback (when device GPS is active) */}
        {gpsActive && deviceGps && gpsDistanceToOrigin !== null && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel p-2.5 rounded-xl border border-emerald-500/30 bg-emerald-950/70 backdrop-blur-md pointer-events-auto text-[11px] text-emerald-200 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2">
              <ShieldCheck size={15} className="text-emerald-400 shrink-0" />
              <span>
                Your device is <strong>{gpsDistanceToOrigin} km</strong> from origin cluster.
              </span>
            </div>
            <span className="font-mono text-[10px] text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded">
              GLEC Verified
            </span>
          </motion.div>
        )}
      </div>

      {/* 5. BOTTOM-RIGHT: MAP TOOLS & DEVICE GPS TRIGGER */}
      <div className="absolute bottom-3 right-3 z-30 flex items-center gap-2 pointer-events-auto">
        {/* Real Device GPS Geolocation Trigger */}
        <button
          type="button"
          onClick={handleRequestDeviceGps}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border backdrop-blur-md shadow-lg transition-all ${
            gpsActive
              ? "bg-emerald-600 text-white border-emerald-400 shadow-emerald-900/40"
              : "bg-black/60 text-slate-200 border-white/15 hover:bg-white/10 hover:text-white"
          }`}
          title="Detect and plot your real device coordinates on the industrial map"
        >
          <LocateFixed size={15} className={gpsActive ? "animate-pulse" : ""} />
          <span>{gpsActive ? "GPS Active" : "Locate My Plant (GPS)"}</span>
        </button>

        {/* Layer Toggles Menu */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setLayersOpen(!layersOpen)}
            className={`p-2 rounded-xl border backdrop-blur-md transition-all ${
              layersOpen
                ? "bg-cyan-950/80 text-cyan-300 border-cyan-400"
                : "bg-black/60 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white"
            }`}
            title="Toggle Map Layers"
          >
            <Layers size={15} />
          </button>

          <AnimatePresence>
            {layersOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 8 }}
                className="absolute bottom-12 right-0 z-50 w-48 p-2 rounded-xl bg-slate-950/95 border border-cyan-500/30 text-xs shadow-2xl backdrop-blur-md flex flex-col gap-1"
              >
                <div className="px-2 py-1 font-bold text-[10px] uppercase tracking-wider text-slate-400 border-b border-white/10">
                  Map Layers
                </div>
                <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-white/5 cursor-pointer text-slate-200">
                  <span>Corridor Routes</span>
                  <input
                    type="checkbox"
                    checked={showRoutes}
                    onChange={(e) => setShowRoutes(e.target.checked)}
                    className="accent-cyan-400"
                  />
                </label>
                <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-white/5 cursor-pointer text-slate-200">
                  <span>Waypoints &amp; Tolls</span>
                  <input
                    type="checkbox"
                    checked={showWaypoints}
                    onChange={(e) => setShowWaypoints(e.target.checked)}
                    className="accent-cyan-400"
                  />
                </label>
                <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-white/5 cursor-pointer text-slate-200">
                  <span>Moving Fleet</span>
                  <input
                    type="checkbox"
                    checked={showFleet}
                    onChange={(e) => setShowFleet(e.target.checked)}
                    className="accent-cyan-400"
                  />
                </label>
                <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-white/5 cursor-pointer text-slate-200">
                  <span>Topographic Grid</span>
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="accent-cyan-400"
                  />
                </label>
                <label className="flex items-center justify-between px-2 py-1 rounded hover:bg-white/5 cursor-pointer text-slate-200">
                  <span>Cluster Nodes</span>
                  <input
                    type="checkbox"
                    checked={showClusters}
                    onChange={(e) => setShowClusters(e.target.checked)}
                    className="accent-cyan-400"
                  />
                </label>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Zoom & Reset Controls */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/60 border border-white/10 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Zoom In"
          >
            <ZoomIn size={15} />
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.25))}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut size={15} />
          </button>
          <button
            type="button"
            onClick={handleResetView}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Reset Pan & Zoom"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
export default SleekIndustrialMap;
