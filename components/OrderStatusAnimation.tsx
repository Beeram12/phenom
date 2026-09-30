"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";

type Variant = "success" | "failure";

const COLORS = ["#C8693F", "#7A8B5C", "#E6B89C", "#A4522C", "#C9D2B5"];

/** Deterministic pseudo-random so confetti positions are stable across renders. */
function seeded(i: number) {
  const x = Math.sin(i * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function Confetti() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const angle = seeded(i) * Math.PI * 2;
        const distance = 90 + seeded(i + 100) * 110;
        return {
          id: i,
          x: Math.cos(angle) * distance,
          y: Math.sin(angle) * distance - 30,
          rotate: seeded(i + 200) * 360,
          color: COLORS[i % COLORS.length],
          size: 6 + seeded(i + 300) * 6,
          round: i % 3 === 0,
          delay: 0.55 + seeded(i + 400) * 0.15,
        };
      }),
    [],
  );

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 flex items-center justify-center"
    >
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute"
          style={{
            width: p.size,
            height: p.round ? p.size : p.size * 0.5,
            backgroundColor: p.color,
            borderRadius: p.round ? "9999px" : "2px",
          }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{
            x: p.x,
            y: [0, p.y, p.y + 60],
            opacity: [0, 1, 0],
            scale: 1,
            rotate: p.rotate,
          }}
          transition={{ duration: 1.6, delay: p.delay, ease: "easeOut", times: [0, 0.4, 1] }}
        />
      ))}
    </div>
  );
}

/**
 * Animated result mark: a checkmark that draws in (with a soft pulse and confetti)
 * for success, or a gently drawn cross for cancelled / failed orders.
 */
export function OrderStatusAnimation({ variant }: { variant: Variant }) {
  const reduce = useReducedMotion();
  const success = variant === "success";
  const stroke = success ? "#566540" : "#A4522C";
  const fill = success ? "#EEF0E6" : "#F6E6DC";

  return (
    <div className="relative mx-auto flex size-40 items-center justify-center">
      {success && !reduce && <Confetti />}

      {/* Soft pulse rings */}
      {!reduce &&
        [0, 1].map((i) => (
          <motion.span
            key={`${variant}-${i}`}
            aria-hidden
            className="absolute inset-4 rounded-full"
            style={{ backgroundColor: fill }}
            initial={{ scale: 0.8, opacity: 0.8 }}
            animate={{ scale: 1.5, opacity: 0 }}
            transition={{
              duration: 1.8,
              delay: 0.6 + i * 0.5,
              repeat: success ? 2 : 0,
              repeatDelay: 0.6,
              ease: "easeOut",
            }}
          />
        ))}

      <motion.svg
        key={variant}
        viewBox="0 0 120 120"
        className="relative size-32"
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        role="img"
        aria-label={success ? "Order confirmed" : "Order not completed"}
      >
        <circle cx="60" cy="60" r="54" fill={fill} />
        <motion.circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={stroke}
          strokeWidth="4"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
          style={{ rotate: -90, transformOrigin: "50% 50%" }}
        />
        {success ? (
          <motion.path
            d="M38 62 L53 77 L83 45"
            fill="none"
            stroke={stroke}
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.45, delay: 0.5, ease: "easeOut" }}
          />
        ) : (
          <>
            <motion.path
              d="M44 44 L76 76"
              fill="none"
              stroke={stroke}
              strokeWidth="7"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.5, ease: "easeOut" }}
            />
            <motion.path
              d="M76 44 L44 76"
              fill="none"
              stroke={stroke}
              strokeWidth="7"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3, delay: 0.75, ease: "easeOut" }}
            />
          </>
        )}
      </motion.svg>
    </div>
  );
}
