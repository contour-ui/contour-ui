import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { RefCallback } from 'react';

import { BARS, TRACKS } from './tracks-data.ts';

/** One loop over the bars of the timeline, in milliseconds. */
const LOOP_MS = 16_000;

/** Where the playhead starts, as a fraction of the loop. */
export const PLAYHEAD_START = 0.08;

/** The beats of a bar the position counts. */
const BEATS = 4;

/** The custom property of the timeline the playhead reads, the fraction of the loop it is at. */
export const PLAYHEAD_PROPERTY = '--docs-playhead';

/** Every clip, by id, with where it starts and ends as fractions of the timeline. */
const CLIP_RANGES = TRACKS.flatMap(({ clips }) =>
  clips.map(({ id, start, width }) => ({ id, from: start / 100, to: (start + width) / 100 })),
);

/** The position of the playhead in bars and beats, as a sequencer shows it: `002.4`. */
function formatPosition(t: number): string {
  const bar = Math.floor(t * BARS) + 1;
  const beat = (Math.floor(t * BARS * BEATS) % BEATS) + 1;
  return `${String(bar).padStart(3, '0')}.${beat}`;
}

/** The ids of the clips under the playhead at `t`, joined, so that equal sets compare equal. */
function activeKey(t: number): string {
  return CLIP_RANGES.filter(({ from, to }) => t >= from && t < to)
    .map(({ id }) => id)
    .join(' ');
}

/** The media query of readers who prefer reduced motion. */
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

function subscribeToReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
}

const prefersReducedMotion = (): boolean => window.matchMedia(REDUCED_MOTION).matches;

/** The server knows no preference: the page renders playing, then pauses as it hydrates. */
const serverPrefersReducedMotion = (): boolean => false;

/** What {@link usePlayhead} returns. */
export interface Playhead {
  readonly playing: boolean;
  /** Pause the playhead, or play it from where it is. */
  readonly toggle: () => void;
  /** The position in bars and beats, such as `002.4`. */
  readonly position: string;
  /** The ids of the clips the playhead is crossing. */
  readonly active: ReadonlySet<string>;
  /** The ref of the element the playhead moves across, which gets the fraction of the loop. */
  readonly timelineRef: RefCallback<HTMLElement>;
}

/**
 * The playhead of the home page's sequencer: it loops over the bars of the timeline in 16
 * seconds, and only while it plays. It starts paused when the reader prefers reduced motion.
 *
 * The playhead moves through a custom property ({@link PLAYHEAD_PROPERTY}) written on the
 * timeline on every frame, outside React; the component renders again only when the position
 * or the clips under the playhead change.
 */
export function usePlayhead(): Playhead {
  const reducedMotion = useSyncExternalStore(
    subscribeToReducedMotion,
    prefersReducedMotion,
    serverPrefersReducedMotion,
  );
  // The reader's own choice, once they press the button; until then, playing unless they prefer
  // reduced motion.
  const [chosen, setChosen] = useState<boolean | null>(null);
  const playing = chosen ?? !reducedMotion;
  const [position, setPosition] = useState(() => formatPosition(PLAYHEAD_START));
  const [active, setActive] = useState(() => activeKey(PLAYHEAD_START));
  const [element, setElement] = useState<HTMLElement | null>(null);
  // Where the loop is, kept across pauses.
  const t = useRef(PLAYHEAD_START);

  useEffect(() => {
    if (!playing || element === null) {
      return undefined;
    }
    let frame = 0;
    const origin = performance.now() - t.current * LOOP_MS;
    const tick = (now: number): void => {
      t.current = ((now - origin) / LOOP_MS) % 1;
      element.style.setProperty(PLAYHEAD_PROPERTY, t.current.toFixed(4));
      setPosition(formatPosition(t.current));
      setActive(activeKey(t.current));
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [playing, element]);

  const toggle = useCallback(() => {
    setChosen(!playing);
  }, [playing]);

  return {
    playing,
    toggle,
    position,
    active: new Set(active === '' ? [] : active.split(' ')),
    timelineRef: setElement,
  };
}
