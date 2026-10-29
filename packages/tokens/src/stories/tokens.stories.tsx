import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { expect } from 'storybook/test';

import { defaultTheme, themes } from '../index.ts';
import {
  CodeSample,
  ColorChip,
  EasingCurve,
  PaletteTable,
  Parts,
  Sample,
  ShadowSample,
  ShadowValue,
  ThemeValue,
  TokenTable,
  Value,
  groupTokens,
  partOf,
  tokensIn,
} from './token-docs.tsx';
import type { Column, TokenDoc } from './token-docs.tsx';

/**
 * Token reference built from `src/generated/docs.json` (the Style Dictionary build):
 * every custom property of `tokens.css` with its resolved value and alias in each theme.
 */
const meta: Meta = {
  title: 'Tokens',
  tags: ['autodocs'],
};

export default meta;

type Story = StoryObj;

const value: Column = { title: 'Value', render: (doc) => <Value doc={doc} /> };

/** Sample element styled with the token, e.g. `(ref) => ({ inlineSize: ref })`. */
const sample = (className: string, style: (ref: string) => CSSProperties): Column => ({
  title: 'Sample',
  render: (doc) => <Sample className={className} style={style(`var(${doc.name})`)} />,
});

const colorColumns: Column[] = themes.map((theme) => ({
  title: theme,
  render: (doc) => (
    <span className="token-row">
      <ColorChip name={doc.name} theme={theme} />
      <ThemeValue doc={doc} theme={theme} />
    </span>
  ),
}));

const COLOR_GROUPS: Readonly<Record<string, string>> = { bg: 'Background', fg: 'Foreground' };

/** `color.<group>.<role>` */
const colorGroup = (group: string): string =>
  COLOR_GROUPS[group] ?? `${group.charAt(0).toUpperCase()}${group.slice(1)}`;

const SYNTAX = 'color.syntax.';

/** Semantic color roles, the only colors components use, in every theme (syntax colors below). */
export const ColorRoles: Story = {
  render: () => (
    <div className="token-stack">
      {[
        ...groupTokens(
          tokensIn('color.').filter((doc) => !doc.token.startsWith(SYNTAX)),
          (doc) => doc.token.split('.')[1] ?? '',
        ),
      ].map(([group, rows]) => (
        <TokenTable
          key={group}
          caption={`Color: ${colorGroup(group)}`}
          rows={rows}
          columns={colorColumns}
        />
      ))}
    </div>
  ),
};

/** What each `color.syntax.<role>` colors, as code text. */
const SYNTAX_SAMPLES: Readonly<Record<string, string>> = {
  constant: 'MAX_GAIN 0.71 true',
  string: 'add @contour-ui/kit',
  comment: '// Follow the system theme',
  keyword: 'export const return',
  parameter: 'theme event',
  function: 'useTheme() Button',
  'string-expression': "'dark' /px$/",
  punctuation: '{ } ( ) , ;',
  link: 'https://example.com',
};

/**
 * Code highlighting roles, named after the variables of Shiki's `css-variables`
 * theme: `--shiki-token-<role>: var(--ct-color-syntax-<role>)`. Each is at least
 * 4.5:1 on `bg.inset`, the code block background.
 */
export const SyntaxColors: Story = {
  render: () => (
    <TokenTable
      caption="Color: Syntax"
      rows={tokensIn(SYNTAX)}
      columns={themes.map((theme) => ({
        title: theme,
        render: (doc) => (
          <span className="token-row">
            <CodeSample name={doc.name} theme={theme}>
              {SYNTAX_SAMPLES[doc.token.slice(SYNTAX.length)] ?? doc.token}
            </CodeSample>
            <ThemeValue doc={doc} theme={theme} />
          </span>
        ),
      }))}
    />
  ),
};

/** Base palette. Internal: components reference semantic roles, never `--ct-base-*`. */
export const Palette: Story = {
  render: () => <PaletteTable caption="Base palette" rows={tokensIn('base.color.')} />,
};

/** Every font stack × weight the tokens use: `fonts.css` must provide each face. */
const fontFaces = tokensIn('base.font-family.').flatMap((family) =>
  tokensIn('base.font-weight.').map((weight) => ({
    font: `${weight.themes[defaultTheme].value} 13px ${family.themes[defaultTheme].value}`,
    weight: weight.themes[defaultTheme].value,
  })),
);

const TEXT_PARTS = [
  ['fontFamily', 'Family'],
  ['fontSize', 'Size'],
  ['lineHeight', 'Line height'],
  ['fontWeight', 'Weight'],
  ['letterSpacing', 'Letter spacing'],
] as const;

/** Text styles: `font: var(--ct-text-<style>)` plus `letter-spacing: var(--ct-text-<style>-letter-spacing)`. */
export const Typography: Story = {
  play: async () => {
    const loaded = await Promise.all(
      fontFaces.map(async ({ font, weight }) => ({
        font,
        found: (await document.fonts.load(font, 'Gain')).some((face) => face.weight === weight),
      })),
    );
    await expect(loaded.filter(({ found }) => !found).map(({ font }) => font)).toEqual([]);
  },
  render: () => (
    <TokenTable
      caption="Text styles"
      rows={tokensIn('text.').filter((doc) => doc.part === 'font')}
      columns={[
        {
          title: 'Sample',
          // Samples may wrap: the large styles (hero) then show their line height, and the
          // other columns keep their room.
          render: (doc) => (
            <span
              style={{
                font: `var(${doc.name})`,
                letterSpacing: `var(${partOf(doc.token, 'letterSpacing')?.name ?? ''})`,
              }}
            >
              Gain −6.0 dB 1.20 kHz
            </span>
          ),
        },
        { title: 'Properties', render: (doc) => <Parts doc={doc} parts={TEXT_PARTS} /> },
      ]}
    />
  ),
};

/** Padding and gaps. */
export const Space: Story = {
  render: () => (
    <TokenTable
      caption="Space"
      rows={tokensIn('space.')}
      columns={[sample('token-bar', (ref) => ({ inlineSize: ref })), value]}
    />
  ),
};

/** Overlays whose sizes are `size.<overlay>` or `size.<overlay>-<size>`. */
const OVERLAYS = new Set(['dialog', 'drawer', 'popover']);

const isOverlaySize = (doc: TokenDoc): boolean =>
  OVERLAYS.has(doc.token.slice('size.'.length).split('-')[0] ?? '');

/** Control heights and icon sizes. */
export const Size: Story = {
  render: () => (
    <TokenTable
      caption="Size"
      rows={tokensIn('size.').filter((doc) => !isOverlaySize(doc))}
      columns={[sample('token-box', (ref) => ({ inlineSize: ref, blockSize: ref })), value]}
    />
  ),
};

/**
 * How wide dialogs and popovers grow, and how far drawers reach in. The samples are drawn at a
 * quarter of the size.
 */
export const OverlaySize: Story = {
  render: () => (
    <TokenTable
      caption="Overlay size"
      rows={tokensIn('size.').filter((doc) => isOverlaySize(doc))}
      columns={[
        {
          title: 'Sample (1:4)',
          render: (doc) => (
            <Sample className="token-bar" style={{ inlineSize: `calc(var(${doc.name}) / 4)` }} />
          ),
        },
        value,
      ]}
    />
  ),
};

/** Corner radii. */
export const Radius: Story = {
  render: () => (
    <TokenTable
      caption="Radius"
      rows={tokensIn('radius.')}
      columns={[sample('token-box', (ref) => ({ borderRadius: ref })), value]}
    />
  ),
};

/** Border and focus ring widths. */
export const BorderWidth: Story = {
  render: () => (
    <TokenTable
      caption="Border width"
      rows={tokensIn('border-width.')}
      columns={[sample('token-box', (ref) => ({ borderWidth: ref })), value]}
    />
  ),
};

/** `box-shadow: var(--ct-shadow-<name>)`. Decoration only: surfaces with a shadow also have a border. */
export const Shadow: Story = {
  render: () => (
    <TokenTable
      caption="Shadow"
      rows={tokensIn('shadow.')}
      columns={themes.map((theme) => ({
        title: theme,
        render: (doc) => (
          <span className="token-row">
            <ShadowSample name={doc.name} theme={theme} />
            <ShadowValue doc={doc} theme={theme} />
          </span>
        ),
      }))}
    />
  ),
};

/** Stacking order: `z-index: var(--ct-layer-<name>)`. */
export const Layer: Story = {
  render: () => <TokenTable caption="Layer" rows={tokensIn('layer.')} columns={[value]} />,
};

/** Transitions: `transition: <property> var(--ct-motion-<name>)`. */
export const Motion: Story = {
  render: () => (
    <TokenTable
      caption="Transitions"
      rows={tokensIn('motion.')}
      columns={[
        {
          title: 'Curve',
          render: (doc) => <EasingCurve value={doc.themes[defaultTheme].value} />,
        },
        value,
      ]}
    />
  ),
};
