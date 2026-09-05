"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "motion/react";
import type { Transition } from "motion/react";
import { QrSvg } from "@/components/QrSvg";
import { ByzcardExpanded, ByzcardPreviewFace } from "./ExpandableByzcard";
import type { QrSymbol } from "@/core/qr";
import { EXAMPLE_CARD } from "./exampleData";
import { displayName, initialsOf, linkEntryLabel, type LinkGroup } from "@/core/card/types";
import { withMotion } from "./motion";
import styles from "./landing.module.css";

/** Optional entries, flattened the way the recipient screen flattens them. */
const ACTIONS: string[] = (["social", "messaging", "links"] as LinkGroup[]).flatMap((group) =>
  (EXAMPLE_CARD[group] ?? []).map((entry) => linkEntryLabel(group, entry)),
);

const NAME = displayName(EXAMPLE_CARD);
const INITIALS = initialsOf(EXAMPLE_CARD.fullName);

function MockAvatar() {
  return (
    <div aria-hidden="true" className={styles.stackAvatar}>
      {INITIALS}
    </div>
  );
}

/**
 * State 2 — the moment of scanning: a phone camera framed on the card's QR.
 * The QR is the same locally generated demo symbol the owner card renders;
 * the bezel, viewfinder corners and scan beam are decoration around it.
 */
function ScanFace({ qr }: { qr: QrSymbol }) {
  return (
    <div className={styles.scanMock}>
      <div className={styles.scanPhone}>
        <span aria-hidden="true" className={styles.scanLens} />
        <div className={styles.scanView}>
          <p className={styles.scanChips} aria-hidden="true">
            {ACTIONS.join(" · ")}
          </p>
          <div className={styles.scanQrArea}>
            <div className={styles.scanQrBox}>
              <QrSvg symbol={qr} label="QR code linking to this business card" />
            </div>
            <span aria-hidden="true" className={`${styles.scanCorner} ${styles.scanCornerTl}`} />
            <span aria-hidden="true" className={`${styles.scanCorner} ${styles.scanCornerTr}`} />
            <span aria-hidden="true" className={`${styles.scanCorner} ${styles.scanCornerBl}`} />
            <span aria-hidden="true" className={`${styles.scanCorner} ${styles.scanCornerBr}`} />
            <span aria-hidden="true" className={styles.scanBeam} />
          </div>
        </div>
      </div>
    </div>
  );
}

/** State 3 — the optional link groups the card carries. */
function ActionsFace() {
  return (
    <div className={styles.recipientMock}>
      <div className={styles.recipientTop}>
        <MockAvatar />
        <div>
          <p className={styles.recipientName}>{NAME}</p>
          <p className={styles.recipientMeta}>{EXAMPLE_CARD.role}</p>
        </div>
      </div>
      {EXAMPLE_CARD.headline !== undefined && (
        <p className={styles.recipientHeadline}>{EXAMPLE_CARD.headline}</p>
      )}
      <div className={styles.stackActions}>
        {ACTIONS.map((label) => (
          <span key={label} className={styles.stackAction}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}

/** State 4 — the save-contact step the recipient screen offers. */
function SaveFace() {
  return (
    <div className={styles.recipientMock}>
      <p className={styles.recipientName}>{NAME}</p>
      <p className={styles.recipientMeta}>{EXAMPLE_CARD.role}</p>
      <p className={styles.recipientMeta}>{EXAMPLE_CARD.company}</p>
      <div className={styles.stackContact}>
        <p className={styles.recipientRow}>{EXAMPLE_CARD.phone}</p>
        <p className={styles.recipientRow}>{EXAMPLE_CARD.email}</p>
      </div>
      <div className={styles.savePill}>Save contact</div>
      <p className={styles.stackSaveNote}>Straight into their contacts.</p>
    </div>
  );
}

interface ReelItem {
  id: string;
  visual: React.ReactNode;
  title: string;
  description: string;
}

type ReelItems = readonly [ReelItem, ReelItem, ReelItem, ReelItem];

function buildItems(qr: QrSymbol, preview: React.ReactNode): ReelItems {
  return [
    {
      id: "byzcard",
      // A compact, tappable miniature of the full card, so this state's
      // footprint matches its neighbours and the stage never jumps.
      visual: preview,
      title: "Your Byzcard",
      description:
        "Your details and a scannable QR code, created and stored on your device. This is the card you carry.",
    },
    {
      id: "scan",
      visual: <ScanFace qr={qr} />,
      title: "They scan it",
      description:
        "They point their phone camera at your QR. Your card opens in their browser — no app, no signup.",
    },
    {
      id: "connect",
      visual: <ActionsFace />,
      title: "Ways to connect",
      description:
        "The links you chose to add — LinkedIn, WhatsApp, GitHub — are right on your card, one tap away.",
    },
    {
      id: "save",
      visual: <SaveFace />,
      title: "Save contact",
      description: "They tap Save contact — your details go straight into their phone.",
    },
  ];
}

/** Four states — the ReelItems tuple guarantees it. */
const COUNT = 4;
const CYCLE_MS = 5800;

/** How much of a neighbouring state stays visible above and below. */
const PEEK = 56;
/** Breathing room between the active state and its neighbours. */
const GAP = 18;
/** How far past its neighbour seat an exiting state travels before clipping. */
const EXIT = 140;

/** One deliberate glide — keyframes need a tween, and the brief asks no bounce. */
const REEL_TWEEN: Transition = { duration: 0.75, ease: [0.32, 0, 0.24, 1] };
/** The synchronized copy swap on the right; two halves fit inside the glide. */
const COPY_TWEEN: Transition = { duration: 0.3, ease: [0.22, 1, 0.36, 1] };

/** Where a state's centre sits relative to the stage centre. */
function centerOf(rel: number, activeH: number, itemH: number): number {
  if (rel === 0) return 0;
  const sign = rel > 0 ? 1 : -1;
  const seat = activeH / 2 + GAP + itemH / 2;
  return sign * (Math.abs(rel) === 1 ? seat : seat + itemH / 2 + EXIT);
}

/**
 * The Meet/Scan/Save demo as a vertical product reel: the active state is
 * centred and sharp, its neighbours peek above and below — faded, scaled and
 * blurred — and advancing physically moves every state one seat through the
 * reel while the copy beside it changes in step. All four states stay
 * mounted; each keeps its intrinsic height and the stage hugs the active one.
 */
export function ByzcardProductReel({ qr }: { qr: QrSymbol }) {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, { amount: 0.3 });
  const [paused, setPaused] = useState(false);

  // The first state's card expands into a focused overlay; while it is
  // open the reel holds still, and closing hands focus back to the
  // preview so the carousel resumes exactly where it was.
  const [expanded, setExpanded] = useState(false);
  const previewRef = useRef<HTMLButtonElement>(null);
  const openCard = useCallback(() => {
    setExpanded(true);
  }, []);
  const closeCard = useCallback(() => {
    setExpanded(false);
    previewRef.current?.focus();
  }, []);

  // Stable element identities across ticks: the faces are built once per
  // symbol, so a reel advance re-renders seats, not the face subtrees.
  const items = useMemo(
    () => buildItems(qr, <ByzcardPreviewFace qr={qr} onExpand={openCard} buttonRef={previewRef} />),
    [qr, openCard],
  );

  // The seat and the direction of travel live in one state value so a single
  // pure updater sets both; direction decides which side the wrapped state
  // exits and re-enters on.
  const [reel, setReel] = useState<{ active: number; dir: 1 | -1 }>({ active: 0, dir: 1 });
  const { active, dir } = reel;

  const go = useCallback((delta: 1 | -1) => {
    setReel((previous) => ({
      active: (previous.active + delta + COUNT) % COUNT,
      dir: delta,
    }));
  }, []);

  const jump = useCallback((index: number) => {
    setReel((previous) => {
      if (index === previous.active) return previous;
      const forward = (index - previous.active + COUNT) % COUNT;
      return { active: index, dir: forward === COUNT - 1 ? -1 : 1 };
    });
  }, []);

  useEffect(() => {
    if (reduce === true || paused || !inView || expanded) return;
    const timer = window.setInterval(() => {
      go(1);
    }, CYCLE_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [reduce, paused, inView, expanded, go]);

  // Natural content height per state, measured off the inner wrapper so the
  // stage can hug the active one instead of reserving room for the tallest.
  const stageRef = useRef<HTMLDivElement>(null);
  const [heights, setHeights] = useState<Record<string, number>>({});
  const activeH = heights[items[active]?.id ?? ""];
  const measured = activeH !== undefined && items.every((item) => heights[item.id] !== undefined);

  useEffect(() => {
    const stage = stageRef.current;
    if (stage === null) return;
    const nodes = Array.from(stage.querySelectorAll<HTMLElement>("[data-reel-id]"));
    const read = (): void => {
      const next: Record<string, number> = {};
      for (const node of nodes) {
        const id = node.dataset.reelId;
        if (id !== undefined) next[id] = node.offsetHeight;
      }
      setHeights((current) => {
        const same = Object.keys(next).every((id) => current[id] === next[id]);
        return same && Object.keys(current).length === Object.keys(next).length ? current : next;
      });
    };
    const observer = new ResizeObserver(read);
    for (const node of nodes) observer.observe(node);
    read();
    return () => {
      observer.disconnect();
    };
    // Completing measurement remounts the stage, so observe the new nodes.
  }, [measured]);

  const glide = withMotion(reduce, REEL_TWEEN);
  const copyGlide = withMotion(reduce, COPY_TWEEN);

  const current = items[active] ?? items[0];

  return (
    <div
      ref={rootRef}
      className={styles.reelWrap}
      onPointerEnter={() => {
        setPaused(true);
      }}
      onPointerLeave={() => {
        setPaused(false);
      }}
      onFocusCapture={() => {
        setPaused(true);
      }}
      onBlurCapture={() => {
        setPaused(false);
      }}
    >
      {/* Keyed by layout phase: when measuring completes the stage remounts
          and, with enter animations off, every state renders already seated —
          no phantom glide out of the static server layout. */}
      <motion.div
        key={measured ? "measured" : "static"}
        ref={stageRef}
        className={styles.reelStage}
        initial={false}
        animate={measured ? { height: activeH + PEEK * 2 } : undefined}
        transition={glide}
      >
        {items.map((entry, index) => {
          const raw = (((index - active) % COUNT) + COUNT) % COUNT;
          // Seats: 0 centre, 1 below, 3 (→ −1) above. Seat 2 is the wrapped
          // state, parked past whichever edge the current direction exits.
          const rel = raw === 3 ? -1 : raw === 2 ? (dir === 1 ? -2 : 2) : raw;
          const depth = Math.abs(rel);
          const h = heights[entry.id] ?? 0;
          const yTop = centerOf(rel, activeH ?? 0, h) - h / 2;
          // The state re-entering from the parked seat snaps to the edge it
          // should arrive from before gliding in, so it never crosses the
          // stage; the keyframe makes the snap part of the same animation.
          const entering = dir === 1 ? raw === 1 : raw === 3;
          const yFrom = centerOf(rel > 0 ? 2 : -2, activeH ?? 0, h) - h / 2;
          return (
            <motion.div
              key={entry.id}
              initial={false}
              className={measured ? styles.reelItem : styles.reelItemStatic}
              // Only the front state accepts input (its card preview is a
              // button); inert keeps the hidden copies out of the tab order.
              inert={rel !== 0}
              style={{
                zIndex: 3 - depth,
                pointerEvents: rel === 0 ? "auto" : "none",
                ...(measured || index === 0 ? {} : { position: "absolute", visibility: "hidden" }),
              }}
              animate={
                measured
                  ? {
                      y: entering ? [yFrom, yTop] : yTop,
                      opacity: depth === 0 ? 1 : depth === 1 ? 0.3 : 0,
                      scale: depth === 0 ? 1 : 0.92,
                      filter: depth === 0 ? "blur(0px)" : "blur(3px)",
                    }
                  : undefined
              }
              transition={glide}
              aria-hidden={rel !== 0}
            >
              <div data-reel-id={entry.id}>{entry.visual}</div>
            </motion.div>
          );
        })}
      </motion.div>

      <div className={styles.reelSide}>
        <div className={styles.reelCopy}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.id}
              initial={{ opacity: 0, y: 16 * dir }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 * dir }}
              transition={copyGlide}
            >
              <h3 className={styles.reelTitle}>{current.title}</h3>
              <p className={styles.reelDesc}>{current.description}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className={styles.reelControls}>
          <button
            type="button"
            className={styles.reelArrow}
            aria-label="Previous demo state"
            onClick={() => {
              setPaused(true);
              go(-1);
            }}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className={styles.reelArrow}
            aria-label="Next demo state"
            onClick={() => {
              setPaused(true);
              go(1);
            }}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M9 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {/* Plain navigation buttons: these dots jump the reel, they are not
            tabs over panels, so they claim no tab semantics. */}
        <div className={styles.reelDots} role="group" aria-label="Demo states">
          {items.map((entry, index) => (
            <button
              key={entry.id}
              type="button"
              aria-current={index === active ? "true" : undefined}
              className={`${styles.reelDot} ${index === active ? styles.reelDotOn : ""}`}
              onClick={() => {
                setPaused(true);
                jump(index);
              }}
            >
              <span className="visually-hidden">{entry.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Outside the transformed stage items, so position: fixed means the
          viewport; inside the page tree, so the ink tokens still apply. */}
      <AnimatePresence>
        {expanded && <ByzcardExpanded qr={qr} onClose={closeCard} reduce={reduce} />}
      </AnimatePresence>
    </div>
  );
}
