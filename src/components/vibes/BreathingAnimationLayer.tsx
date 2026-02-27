import { useMemo } from "react";
import type { BreathingAnimation } from "@/lib/breathingExercises";

interface Props {
  animation: BreathingAnimation;
  /** 0–1 progress through current phase */
  progress: number;
  phaseType: "inhale" | "hold" | "exhale";
  hue: number;
  sat: number;
  brightness: number;
  arcIntensity: number;
  /** Continuous time counter in seconds */
  time: number;
}

export function BreathingAnimationLayer({
  animation,
  progress,
  phaseType,
  hue,
  sat,
  brightness,
  arcIntensity,
  time,
}: Props) {
  const p = progress;
  const inhaling = phaseType === "inhale";
  const exhaling = phaseType === "exhale";
  const holding = phaseType === "hold";

  // Shared glow opacity
  const glowOpacity = 0.15 + brightness * 0.6;

  const content = useMemo(() => {
    switch (animation) {
      case "ocean":
        return <OceanAnimation p={p} inhaling={inhaling} exhaling={exhaling} hue={hue} sat={sat} brightness={brightness} arcIntensity={arcIntensity} time={time} />;
      case "lotus":
        return <LotusAnimation p={p} inhaling={inhaling} exhaling={exhaling} hue={hue} sat={sat} brightness={brightness} arcIntensity={arcIntensity} time={time} />;
      case "orbital":
        return <OrbitalAnimation p={p} inhaling={inhaling} exhaling={exhaling} holding={holding} hue={hue} sat={sat} brightness={brightness} arcIntensity={arcIntensity} time={time} />;
      case "aurora":
        return <AuroraAnimation p={p} inhaling={inhaling} exhaling={exhaling} hue={hue} sat={sat} brightness={brightness} arcIntensity={arcIntensity} time={time} />;
      case "heartbeat":
        return <HeartbeatAnimation p={p} inhaling={inhaling} exhaling={exhaling} holding={holding} hue={hue} sat={sat} brightness={brightness} arcIntensity={arcIntensity} time={time} />;
      default:
        return null;
    }
  }, [animation, p, inhaling, exhaling, holding, hue, sat, brightness, arcIntensity, time]);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[5]">
      {content}
    </div>
  );
}

/* ─── Ocean: layered sine waves ─── */
function OceanAnimation({ p, inhaling, exhaling, hue, sat, brightness, arcIntensity, time }: any) {
  const waveY = inhaling ? 10 - p * 20 : exhaling ? -10 + p * 20 : -10;
  const amp1 = (12 + arcIntensity * 8) * (inhaling ? 0.7 + p * 0.6 : exhaling ? 1.3 - p * 0.5 : 0.8);
  const amp2 = amp1 * 0.6;
  const amp3 = amp1 * 0.35;

  const makePath = (amplitude: number, freq: number, phase: number, yOff: number) => {
    let d = `M 0 ${150 + yOff}`;
    for (let x = 0; x <= 300; x += 3) {
      const y = 150 + yOff + Math.sin((x / 300) * Math.PI * freq + time * 0.8 + phase) * amplitude + waveY;
      d += ` L ${x} ${y}`;
    }
    d += ` L 300 300 L 0 300 Z`;
    return d;
  };

  return (
    <svg viewBox="0 0 300 300" className="w-64 h-64 opacity-60" style={{ filter: `blur(1px)` }}>
      <defs>
        <linearGradient id="wave1" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`hsla(${hue}, ${sat}%, ${40 + brightness * 40}%, 0.4)`} />
          <stop offset="100%" stopColor={`hsla(${hue + 15}, ${sat - 10}%, 20%, 0.05)`} />
        </linearGradient>
        <linearGradient id="wave2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`hsla(${hue - 10}, ${sat + 5}%, ${35 + brightness * 30}%, 0.3)`} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
        <linearGradient id="wave3" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={`hsla(${hue + 20}, ${sat - 15}%, ${30 + brightness * 25}%, 0.2)`} />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <path d={makePath(amp3, 3, 2.5, 15)} fill="url(#wave3)" />
      <path d={makePath(amp2, 2.5, 1.2, 5)} fill="url(#wave2)" />
      <path d={makePath(amp1, 2, 0, 0)} fill="url(#wave1)" />
    </svg>
  );
}

/* ─── Lotus: blooming petals ─── */
function LotusAnimation({ p, inhaling, exhaling, hue, sat, brightness, arcIntensity, time }: any) {
  const petalCount = 8;
  const baseRadius = 40 + arcIntensity * 10;
  const bloomScale = inhaling ? 0.7 + p * 0.5 : exhaling ? 1.2 - p * 0.4 : 1.0;
  const rotation = time * 8;

  const petals = Array.from({ length: petalCount }, (_, i) => {
    const angle = (i / petalCount) * 360 + rotation;
    const rad = (angle * Math.PI) / 180;
    const petalLen = baseRadius * bloomScale * (0.9 + Math.sin(time * 0.5 + i) * 0.1);
    const cx = 150 + Math.cos(rad) * petalLen * 0.5;
    const cy = 150 + Math.sin(rad) * petalLen * 0.5;
    const opacity = 0.15 + brightness * 0.3 + Math.sin(time + i * 0.8) * 0.05;

    return (
      <ellipse
        key={i}
        cx={cx}
        cy={cy}
        rx={petalLen * 0.45}
        ry={petalLen * 0.18}
        transform={`rotate(${angle} ${cx} ${cy})`}
        fill={`hsla(${hue + i * 5}, ${sat}%, ${45 + brightness * 30}%, ${opacity})`}
      />
    );
  });

  // Center glow
  const centerR = 12 + bloomScale * 8;

  return (
    <svg viewBox="0 0 300 300" className="w-64 h-64">
      <defs>
        <radialGradient id="lotusCenter">
          <stop offset="0%" stopColor={`hsla(${hue}, ${sat + 10}%, ${60 + brightness * 30}%, ${0.4 + brightness * 0.3})`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      {petals}
      <circle cx="150" cy="150" r={centerR} fill="url(#lotusCenter)" />
    </svg>
  );
}

/* ─── Orbital: rotating rings ─── */
function OrbitalAnimation({ p, inhaling, exhaling, holding, hue, sat, brightness, arcIntensity, time }: any) {
  const ringCount = 3;
  const baseSize = 50 + arcIntensity * 15;
  const breathScale = inhaling ? 0.8 + p * 0.4 : exhaling ? 1.2 - p * 0.3 : 1.0;

  const rings = Array.from({ length: ringCount }, (_, i) => {
    const radius = (baseSize + i * 22) * breathScale;
    const speed = (1 + i * 0.4) * (holding ? 0.3 : 1);
    const angle = time * speed * 30 + i * 120;
    const tiltX = 60 + Math.sin(time * 0.3 + i * 2) * 15;
    const opacity = (0.12 + brightness * 0.25 - i * 0.03) * arcIntensity;
    const strokeW = 1.5 - i * 0.3;

    return (
      <ellipse
        key={i}
        cx="150"
        cy="150"
        rx={radius}
        ry={radius * 0.35}
        fill="none"
        stroke={`hsla(${hue + i * 15}, ${sat - i * 5}%, ${50 + brightness * 30}%, ${opacity})`}
        strokeWidth={strokeW}
        transform={`rotate(${angle} 150 150) skewX(${Math.sin(time * 0.2 + i) * 5})`}
        style={{ transition: "all 0.15s ease-out" }}
      />
    );
  });

  // Center orb
  const orbR = 6 + breathScale * 4;

  return (
    <svg viewBox="0 0 300 300" className="w-72 h-72">
      <defs>
        <radialGradient id="orbCenter">
          <stop offset="0%" stopColor={`hsla(${hue}, ${sat}%, ${65 + brightness * 25}%, ${0.5 + brightness * 0.3})`} />
          <stop offset="80%" stopColor={`hsla(${hue}, ${sat - 10}%, 40%, 0.1)`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      {rings}
      <circle cx="150" cy="150" r={orbR} fill="url(#orbCenter)" />
    </svg>
  );
}

/* ─── Aurora: flowing light curtains ─── */
function AuroraAnimation({ p, inhaling, exhaling, hue, sat, brightness, arcIntensity, time }: any) {
  const curtainCount = 5;
  const heightScale = inhaling ? 0.6 + p * 0.6 : exhaling ? 1.2 - p * 0.5 : 0.9;

  const curtains = Array.from({ length: curtainCount }, (_, i) => {
    const xBase = 30 + i * 55;
    const sway = Math.sin(time * 0.4 + i * 1.3) * 25;
    const h = (100 + i * 15) * heightScale * arcIntensity;
    const w = 30 + Math.sin(time * 0.3 + i * 0.7) * 10;
    const opacity = 0.08 + brightness * 0.2 + Math.sin(time * 0.5 + i * 2) * 0.04;
    const curtainHue = hue + i * 12 - 25;

    // Build a wavy path
    const x = xBase + sway;
    const top = 150 - h / 2;
    const bot = 150 + h / 2;
    const cp1x = x - w * 0.6 + Math.sin(time * 0.6 + i) * 8;
    const cp2x = x + w * 0.6 + Math.sin(time * 0.7 + i + 1) * 8;

    return (
      <path
        key={i}
        d={`M ${x} ${top} C ${cp1x} ${top + h * 0.3}, ${cp2x} ${bot - h * 0.3}, ${x} ${bot}`}
        stroke={`hsla(${curtainHue}, ${sat + 5}%, ${45 + brightness * 35}%, ${opacity})`}
        strokeWidth={w * 0.4}
        fill="none"
        strokeLinecap="round"
        style={{ filter: `blur(${3 + i}px)` }}
      />
    );
  });

  return (
    <svg viewBox="0 0 300 300" className="w-80 h-80 opacity-80">
      {curtains}
    </svg>
  );
}

/* ─── Heartbeat: pulsing concentric rings ─── */
function HeartbeatAnimation({ p, inhaling, exhaling, holding, hue, sat, brightness, arcIntensity, time }: any) {
  const pulseScale = inhaling ? 0.8 + p * 0.4 : exhaling ? 1.2 - p * 0.35 : 1.0 + Math.sin(time * 2) * 0.03;
  const ringCount = 4;

  const rings = Array.from({ length: ringCount }, (_, i) => {
    const baseR = 20 + i * 20;
    const r = baseR * pulseScale;
    const delay = i * 0.15;
    const opacity = Math.max(0, (0.25 - i * 0.05 + brightness * 0.3) * (holding ? 0.5 + Math.sin(time * 3 - delay) * 0.3 : 1));
    const strokeW = 2 - i * 0.3;

    return (
      <circle
        key={i}
        cx="150"
        cy="150"
        r={r}
        fill="none"
        stroke={`hsla(${hue + i * 3}, ${sat - i * 3}%, ${50 + brightness * 30}%, ${opacity})`}
        strokeWidth={strokeW}
      />
    );
  });

  // Inner pulse dot
  const dotScale = holding ? 1 + Math.sin(time * 3) * 0.15 : pulseScale;
  const dotR = 8 * dotScale;

  return (
    <svg viewBox="0 0 300 300" className="w-64 h-64">
      <defs>
        <radialGradient id="heartCenter">
          <stop offset="0%" stopColor={`hsla(${hue}, ${sat + 10}%, ${60 + brightness * 30}%, ${0.5 + brightness * 0.3})`} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      {rings}
      <circle cx="150" cy="150" r={dotR} fill="url(#heartCenter)" />
    </svg>
  );
}
