"use client";

import { useRef, type ReactNode } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "motion/react";
import { SPRING_SNAP } from "./motion";
import styles from "./landing.module.css";

interface TiltSurfaceProps {
  children: ReactNode;
  className?: string;
  /** Maximum rotation in degrees on each axis. Kept small on purpose. */
  amplitude?: number;
  /** Vertical lift while a pointer is engaged. */
  lift?: number;
  scale?: number;
  /** Render the pointer-following light sweep across the surface. */
  glare?: boolean;
}

/**
 * A surface that leans very slightly toward the pointer and springs back.
 *
 * Pointer events only — no device orientation, no permissions, no sensors.
 * Nothing here calls preventDefault and no touch-action is set, so a finger
 * dragging vertically still scrolls the page normally; the browser simply
 * cancels the pointer and the surface springs home.
 */
export function TiltSurface({
  children,
  className = "",
  amplitude = 4,
  lift = -3,
  scale = 1.008,
  glare = false,
}: TiltSurfaceProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Pointer position within the surface, normalised to -0.5 … 0.5.
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const engaged = useMotionValue(0);

  const sx = useSpring(px, SPRING_SNAP);
  const sy = useSpring(py, SPRING_SNAP);
  const sEngaged = useSpring(engaged, SPRING_SNAP);

  const rotateX = useTransform(sy, [-0.5, 0.5], [amplitude, -amplitude]);
  const rotateY = useTransform(sx, [-0.5, 0.5], [-amplitude, amplitude]);
  const y = useTransform(sEngaged, [0, 1], [0, lift]);
  const scaleValue = useTransform(sEngaged, [0, 1], [1, scale]);

  // The highlight tracks the pointer across the surface and fades with it.
  const glareX = useTransform(sx, [-0.5, 0.5], ["12%", "88%"]);
  const glareY = useTransform(sy, [-0.5, 0.5], ["6%", "94%"]);
  const glareOpacity = useTransform(sEngaged, [0, 1], [0, 1]);
  const glareBackground = useMotionTemplate`radial-gradient(34% 40% at ${glareX} ${glareY}, rgba(190,214,255,0.3) 0%, rgba(140,175,235,0.1) 40%, rgba(255,255,255,0) 70%)`;

  if (reduce === true) {
    return <div className={className}>{children}</div>;
  }

  const track = (event: React.PointerEvent<HTMLDivElement>): void => {
    const box = ref.current?.getBoundingClientRect();
    if (box === undefined || box.width === 0 || box.height === 0) return;
    px.set((event.clientX - box.left) / box.width - 0.5);
    py.set((event.clientY - box.top) / box.height - 0.5);
  };

  const release = (): void => {
    px.set(0);
    py.set(0);
    engaged.set(0);
  };

  return (
    <motion.div
      ref={ref}
      className={`${styles.tiltSurface} ${className}`}
      style={{ rotateX, rotateY, y, scale: scaleValue }}
      onPointerMove={(event) => {
        // Touch reports movement only while pressed; hover updates continuously.
        if (event.pointerType === "mouse" || event.pressure > 0 || event.buttons > 0) {
          engaged.set(1);
          track(event);
        }
      }}
      onPointerDown={(event) => {
        engaged.set(1);
        track(event);
      }}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
    >
      {glare && (
        <motion.span
          aria-hidden="true"
          className={styles.tiltGlare}
          style={{ background: glareBackground, opacity: glareOpacity }}
        />
      )}
      {children}
    </motion.div>
  );
}
