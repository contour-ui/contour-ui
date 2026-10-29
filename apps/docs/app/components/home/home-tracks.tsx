import { chevronLeftIcon, chevronRightIcon } from '@contour-ui/icons';
import { Button, Icon, IconButton, Link, Placeholder, Tabs } from '@contour-ui/kit';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';

import { BARS, laneLayout, TRACKS } from './tracks-data.ts';
import type { Track } from './tracks-data.ts';
import { PLAYHEAD_PROPERTY, PLAYHEAD_START, usePlayhead } from './use-playhead.ts';

/** The panels of the Tabs clip: a section of a synth each, with a line of its settings. */
const SYNTH_SECTIONS = [
  { value: 'filter', label: 'Filter', detail: 'Low-pass · 822 Hz · Q 4.78' },
  { value: 'env', label: 'Env', detail: 'A 12 ms · D 240 ms · S −6 dB · R 380 ms' },
  { value: 'lfo', label: 'LFO', detail: 'Sine · 1/4 · depth 35 %' },
  { value: 'out', label: 'Out', detail: 'Mix 62 % · Gain −1.5 dB' },
] as const;

/**
 * A component that contour-ui does not ship yet: Kit's placeholder in its place, until the real
 * one renders here.
 */
function Planned(): ReactElement {
  return <Placeholder.Root className="docs-clip__placeholder">Planned</Placeholder.Root>;
}

/** The Button clip: Kit's buttons as a plugin's preset bar has them. */
function ButtonsClip(): ReactElement {
  return (
    <div className="docs-clip__stack">
      <div className="docs-clip__row">
        <Button>Save preset</Button>
        <Button variant="outline">A/B</Button>
      </div>
      <div className="docs-clip__row">
        <IconButton variant="outline" label="Previous preset" icon={chevronLeftIcon} />
        <IconButton variant="outline" label="Next preset" icon={chevronRightIcon} />
      </div>
    </div>
  );
}

/** The Tabs clip: Kit's tabs over the sections of a synth. */
function TabsClip(): ReactElement {
  return (
    <Tabs.Root defaultValue="filter" className="docs-clip__tabs">
      <Tabs.List aria-label="Synth section">
        {SYNTH_SECTIONS.map(({ value, label }) => (
          <Tabs.Trigger key={value} value={value}>
            {label}
          </Tabs.Trigger>
        ))}
        <Tabs.Indicator />
      </Tabs.List>
      {SYNTH_SECTIONS.map(({ value, detail }) => (
        <Tabs.Content key={value} value={value} className="docs-clip__detail">
          {detail}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}

/** What a clip shows: a component of Kit, or a placeholder for one not shipped yet. */
const CLIP_CONTENT: Readonly<Record<string, () => ReactElement>> = {
  button: ButtonsClip,
  tabs: TabsClip,
};

interface ClipProps {
  readonly track: Track['id'];
  readonly title: string;
  readonly column: number | undefined;
  /** Whether the playhead is crossing it. */
  readonly active: boolean;
  readonly children: ReactNode;
}

/** A clip on a track: a framed box with its name in a header strip, the component below. */
function Clip({ track, title, column, active, children }: ClipProps): ReactElement {
  return (
    <div
      className="docs-clip"
      data-track={track}
      data-active={active ? '' : undefined}
      style={{ gridColumn: column }}
    >
      <div className="docs-clip__header">{title}</div>
      <div className="docs-clip__body">{children}</div>
    </div>
  );
}

interface TrackRowProps {
  readonly track: Track;
  readonly active: ReadonlySet<string>;
}

/** A track: its name, package and docs link on the left, its clips on the timeline. */
function TrackRow({ track, active }: TrackRowProps): ReactElement {
  const { columns, gridColumns } = laneLayout(track.clips);
  return (
    <div className="docs-tracks__row">
      <div className="docs-tracks__head">
        <div className="docs-tracks__about">
          <h2 className="docs-tracks__name">{track.name}</h2>
          <span className="docs-tracks__package">{track.pkg}</span>
          <p className="docs-tracks__description">{track.description}</p>
        </div>
        <Link asChild className="docs-tracks__browse">
          <RouterLink to={track.href} aria-label={`Browse ${track.name}`}>
            Browse
            <Icon icon={chevronRightIcon} />
          </RouterLink>
        </Link>
      </div>
      <div className="docs-tracks__lane" style={{ gridTemplateColumns: columns }}>
        {track.clips.map(({ id, title }) => {
          const Content = CLIP_CONTENT[id] ?? Planned;
          return (
            <Clip
              key={id}
              track={track.id}
              title={title}
              column={gridColumns.get(id)}
              active={active.has(id)}
            >
              <Content />
            </Clip>
          );
        })}
      </div>
    </div>
  );
}

/** Where the playhead is before the page hydrates: the start of the loop. */
const PLAYHEAD_START_STYLE: CSSProperties & Record<typeof PLAYHEAD_PROPERTY, number> = {
  [PLAYHEAD_PROPERTY]: PLAYHEAD_START,
};

/**
 * The sequencer of the home page (`home-tracks.css`): each track is a part of contour-ui, each
 * clip on it a component of that part, and a playhead loops over the bars, outlining the clips
 * it crosses. Kit's components render in their clips; the others are placeholders until they
 * ship. It scrolls sideways on narrow screens.
 */
export function HomeTracks(): ReactElement {
  const { playing, toggle, position, active, timelineRef } = usePlayhead();
  return (
    <section className="docs-tracks" aria-label="What contour-ui is made of">
      <div className="docs-tracks__frame">
        <div ref={timelineRef} className="docs-tracks__grid" style={PLAYHEAD_START_STYLE}>
          <div className="docs-tracks__row docs-tracks__ruler">
            <div className="docs-tracks__head">
              <Button size="sm" variant="outline" onClick={toggle}>
                {playing ? 'Pause' : 'Play'}
              </Button>
              <span className="docs-tracks__position">{position}</span>
            </div>
            <div className="docs-tracks__bars" aria-hidden="true">
              {Array.from({ length: BARS }, (_, index) => (
                <span key={index}>{index + 1}</span>
              ))}
            </div>
          </div>
          {TRACKS.map((track) => (
            <TrackRow key={track.id} track={track} active={active} />
          ))}
          <div className="docs-tracks__playhead" aria-hidden="true" />
        </div>
      </div>
    </section>
  );
}
