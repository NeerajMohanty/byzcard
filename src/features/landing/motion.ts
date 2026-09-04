/**
 * One motion language for the landing page. Every animated surface draws its
 * timing from here so nothing bounces, floats or snaps out of character.
 * Nothing in this file animates on its own — there are no looping effects.
 */
import type { Transition } from "motion/react";

/** Card-like objects settling into place: calm, barely any overshoot. */
export const SPRING_SOFT: Transition = { type: "spring", stiffness: 170, damping: 26, mass: 0.9 };

/** Direct manipulation (pointer tilt): responsive, controlled. */
export const SPRING_SNAP: Transition = { type: "spring", stiffness: 220, damping: 28, mass: 1 };

/** Non-spatial fades and height changes. */
export const EASE_OUT: Transition = { duration: 0.34, ease: [0.22, 1, 0.36, 1] };

/** What every transition collapses to when the user asks for less motion. */
const REDUCED: Transition = { duration: 0 };

/** Pick the right transition for the user's motion preference. */
export function withMotion(preference: boolean | null, transition: Transition): Transition {
  return preference === true ? REDUCED : transition;
}
