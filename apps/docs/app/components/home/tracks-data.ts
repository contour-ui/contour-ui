/** A clip on a track: one component of that part of contour-ui, where it sits on the timeline. */
export interface TrackClip {
  readonly id: string;
  /** The name in its header strip. */
  readonly title: string;
  /** Where it starts, in percent of the timeline. */
  readonly start: number;
  /** How wide it is, in percent of the timeline. */
  readonly width: number;
}

/** A track: one part of contour-ui, with a clip per component of it. */
export interface Track {
  readonly id: 'audio' | 'essentials' | 'headless';
  readonly name: string;
  /** The package it ships in. */
  readonly pkg: string;
  readonly description: string;
  /** Its docs section. */
  readonly href: string;
  readonly clips: readonly TrackClip[];
}

/** How many bars the timeline shows. */
export const BARS = 8;

/** The parts of contour-ui, as the tracks of the sequencer on the home page, top to bottom. */
export const TRACKS: readonly Track[] = [
  {
    id: 'audio',
    name: 'Audio',
    pkg: '@contour-ui/react',
    description: 'Controls and displays for sound',
    href: '/docs/audio',
    clips: [
      { id: 'knob', title: 'Knob', start: 0.4, width: 30.4 },
      { id: 'spectrum', title: 'Spectrum', start: 31.6, width: 30.4 },
      { id: 'meter', title: 'Meter', start: 62.9, width: 11.6 },
      { id: 'fader', title: 'Fader', start: 75.4, width: 11.6 },
      { id: 'xy-pad', title: 'XY Pad', start: 87.9, width: 11.7 },
    ],
  },
  {
    id: 'essentials',
    name: 'Essentials',
    pkg: '@contour-ui/react',
    description: 'The everyday parts of any interface',
    href: '/docs/essentials',
    clips: [
      { id: 'button', title: 'Button', start: 0.4, width: 18.3 },
      { id: 'select', title: 'Select', start: 18.9, width: 18.3 },
      { id: 'switch', title: 'Switch', start: 37.4, width: 15.8 },
      { id: 'tabs', title: 'Tabs', start: 53.4, width: 24.6 },
      { id: 'menu', title: 'Menu', start: 78.2, width: 21.4 },
    ],
  },
  {
    id: 'headless',
    name: 'Headless',
    pkg: '@contour-ui/headless-react',
    description: 'Behavior, ARIA and host callbacks for Essentials and Audio. No styles',
    href: '/docs/headless',
    clips: [
      { id: 'headless-knob', title: 'Knob, unstyled', start: 0.4, width: 37 },
      { id: 'headless-slider', title: 'Slider, unstyled', start: 37.9, width: 30.8 },
      { id: 'host-callbacks', title: 'Host callbacks', start: 69.2, width: 30.4 },
    ],
  },
];

/**
 * The columns of a track's lane: a column per clip, with a spacer before it where it starts
 * after the end of the one before, and one after the last; `gridColumn` is the column of each clip.
 */
export function laneLayout(clips: readonly TrackClip[]): {
  readonly columns: string;
  readonly gridColumns: ReadonlyMap<string, number>;
} {
  const columns: string[] = [];
  const gridColumns = new Map<string, number>();
  let end = 0;
  for (const clip of clips) {
    if (clip.start > end) {
      columns.push(`${(clip.start - end).toFixed(1)}%`);
    }
    columns.push(`${clip.width}%`);
    gridColumns.set(clip.id, columns.length);
    end = clip.start + clip.width;
  }
  if (end < 100) {
    columns.push(`${(100 - end).toFixed(1)}%`);
  }
  return { columns: columns.join(' '), gridColumns };
}
