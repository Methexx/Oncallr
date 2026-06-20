"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type GravityIntensity = "hero" | "ambient" | "pulse";
type GravityTone = "brand" | "critical" | "warning" | "ok" | "info";

interface GravityWellProps {
  className?: string;
  intensity?: GravityIntensity;
  size?: number | "sm" | "md" | "lg";
  tone?: GravityTone;
}

const toneMap: Record<GravityTone, string> = {
  brand: "var(--primary)",
  critical: "var(--status-critical)",
  warning: "var(--status-warning)",
  ok: "var(--status-ok)",
  info: "var(--status-info)",
};

const sizeMap = {
  sm: 20,
  md: 140,
  lg: 360,
} as const;

const heroRings = [
  { inset: "10%", duration: 18, opacity: 0.85, border: "1.5px" },
  { inset: "20%", duration: 28, opacity: 0.55, border: "1px" },
  { inset: "31%", duration: 45, opacity: 0.4, border: "1px" },
  { inset: "41%", duration: 62, opacity: 0.24, border: "1px" },
];

const ambientRings = [
  { inset: "16%", duration: 20, opacity: 0.6, border: "1px" },
  { inset: "30%", duration: 32, opacity: 0.34, border: "1px" },
];

const orbitParticles = [
  { radius: 0.44, duration: 12, delay: 0, size: 8 },
  { radius: 0.39, duration: 18, delay: 1.5, size: 6 },
  { radius: 0.33, duration: 24, delay: 2.2, size: 7 },
  { radius: 0.51, duration: 30, delay: 0.7, size: 5 },
  { radius: 0.29, duration: 20, delay: 2.8, size: 4 },
  { radius: 0.46, duration: 26, delay: 1.1, size: 5 },
  { radius: 0.36, duration: 16, delay: 3.4, size: 6 },
  { radius: 0.56, duration: 34, delay: 0.4, size: 5 },
];

function getSize(size: GravityWellProps["size"], intensity: GravityIntensity) {
  if (typeof size === "number") {
    return size;
  }

  if (size) {
    return sizeMap[size];
  }

  if (intensity === "pulse") {
    return 18;
  }

  if (intensity === "ambient") {
    return 180;
  }

  return 380;
}

export function GravityWell({
  className,
  intensity = "hero",
  size,
  tone = "brand",
}: GravityWellProps) {
  const prefersReducedMotion = useReducedMotion();
  const dimension = getSize(size, intensity);
  const rings = intensity === "hero" ? heroRings : ambientRings;
  const particles =
    intensity === "hero" ? orbitParticles : orbitParticles.slice(0, 4);

  const style = {
    "--gravity-tone": toneMap[tone],
    width: dimension,
    height: dimension,
  } as React.CSSProperties;

  if (intensity === "pulse") {
    return (
      <span
        aria-hidden="true"
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center",
          className
        )}
        style={style}
      >
        <span
          className="absolute inset-0 rounded-full border"
          style={{
            borderColor: "color-mix(in oklch, var(--gravity-tone) 55%, transparent)",
            boxShadow:
              "0 0 0 1px color-mix(in oklch, var(--gravity-tone) 12%, transparent), 0 0 24px color-mix(in oklch, var(--gravity-tone) 28%, transparent)",
          }}
        />
        {!prefersReducedMotion ? (
          <motion.span
            animate={{
              opacity: [0.22, 0, 0.22],
              scale: [1, 2.2, 1],
            }}
            className="absolute inset-0 rounded-full border"
            style={{
              borderColor:
                "color-mix(in oklch, var(--gravity-tone) 65%, transparent)",
            }}
            transition={{
              duration: 2.2,
              ease: "easeInOut",
              repeat: Infinity,
            }}
          />
        ) : null}
        <span
          className="relative size-[42%] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 35% 35%, color-mix(in oklch, white 30%, var(--gravity-tone)) 0%, var(--gravity-tone) 48%, color-mix(in oklch, var(--gravity-tone) 40%, black) 100%)",
            boxShadow:
              "0 0 20px color-mix(in oklch, var(--gravity-tone) 48%, transparent)",
          }}
        />
      </span>
    );
  }

  return (
    <motion.div
      animate={
        prefersReducedMotion
          ? undefined
          : {
              opacity: 1,
              scale: 1,
            }
      }
      className={cn("relative isolate shrink-0", className)}
      initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.92 }}
      style={style}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        className="absolute inset-[18%] rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle, color-mix(in oklch, var(--gravity-tone) 48%, transparent) 0%, color-mix(in oklch, var(--gravity-tone) 12%, transparent) 48%, transparent 76%)",
        }}
      />

      <div className="absolute inset-0 rounded-full border border-white/5 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04),transparent_62%)]" />

      {rings.map((ring, index) => (
        <motion.div
          key={`${ring.inset}-${ring.duration}`}
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  rotate: index % 2 === 0 ? 360 : -360,
                }
          }
          className="absolute rounded-full"
          style={{
            inset: ring.inset,
            opacity: ring.opacity,
            border: `${ring.border} solid color-mix(in oklch, var(--gravity-tone) 30%, transparent)`,
            boxShadow:
              "inset 0 0 20px color-mix(in oklch, var(--gravity-tone) 10%, transparent), 0 0 32px color-mix(in oklch, var(--gravity-tone) 10%, transparent)",
            background:
              "conic-gradient(from 90deg, transparent 0deg, color-mix(in oklch, var(--gravity-tone) 55%, transparent) 60deg, transparent 145deg, transparent 240deg, color-mix(in oklch, var(--gravity-tone) 36%, transparent) 300deg, transparent 360deg)",
          }}
          transition={{
            duration: ring.duration,
            ease: "linear",
            repeat: Infinity,
          }}
        />
      ))}

      <div className="absolute inset-[34%] rounded-full border border-white/8 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.16),rgba(255,255,255,0.03)_22%,transparent_22%)] shadow-[inset_0_0_36px_rgba(255,255,255,0.06)]" />

      <div
        className="absolute inset-[37%] rounded-full"
        style={{
          background:
            "radial-gradient(circle at 38% 35%, color-mix(in oklch, white 12%, var(--gravity-tone)) 0%, color-mix(in oklch, var(--gravity-tone) 34%, black) 26%, rgba(0,0,0,0.92) 55%, rgba(0,0,0,0.98) 100%)",
          boxShadow:
            "0 0 40px color-mix(in oklch, var(--gravity-tone) 24%, transparent), inset 0 0 22px rgba(255,255,255,0.05)",
        }}
      />

      {particles.map((particle, index) => {
        const radius = dimension * particle.radius;

        return (
          <motion.div
            key={`${particle.radius}-${particle.duration}-${index}`}
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    rotate: 360,
                  }
            }
            className="absolute inset-0"
            style={{
              rotate: `${index * 38}deg`,
            }}
            transition={{
              delay: particle.delay,
              duration: particle.duration,
              ease: "linear",
              repeat: Infinity,
            }}
          >
            <span
              className="absolute left-1/2 top-1/2 rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                transform: `translate(-50%, -50%) translateX(${radius}px)`,
                background:
                  "radial-gradient(circle, color-mix(in oklch, white 36%, var(--gravity-tone)) 0%, var(--gravity-tone) 56%, transparent 100%)",
                boxShadow:
                  "0 0 16px color-mix(in oklch, var(--gravity-tone) 64%, transparent)",
              }}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
