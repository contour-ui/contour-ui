import type { Meta, StoryObj } from '@storybook/react-vite';
import type { CSSProperties } from 'react';
import { expect } from 'storybook/test';

import { defaultTheme, themes } from '../index.ts';
import {
  ColorChip,
  EasingCurve,
  PaletteTable,
  Parts,
  Sample,
  ThemeValue,
  TokenTable,
  Value,
  groupTokens,
  partOf,
  tokensIn,
} from './token-docs.tsx';
import type { Column } from './token-docs.tsx';

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

/** Semantic color roles, the only colors components use, in every theme. */
export const ColorRoles: Story = {
  render: () => (
    <div className="token-stack">
      {[...groupTokens(tokensIn('color.'), (doc) => doc.token.split('.')[1] ?? '')].map(
        ([group, rows]) => (
          <TokenTable
            key={group}
            caption={`Color: ${colorGroup(group)}`}
            rows={rows}
            columns={colorColumns}
          />
        ),
      )}
    </div>
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
          render: (doc) => (
            <span
              style={{
                font: `var(${doc.name})`,
                letterSpacing: `var(${partOf(doc.token, 'letterSpacing')?.name ?? ''})`,
                whiteSpace: 'nowrap',
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

/** Control heights. */
export const Size: Story = {
  render: () => (
    <TokenTable
      caption="Size"
      rows={tokensIn('size.')}
      columns={[sample('token-box', (ref) => ({ inlineSize: ref, blockSize: ref })), value]}
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
