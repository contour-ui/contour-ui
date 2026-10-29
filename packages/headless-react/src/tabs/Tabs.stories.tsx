import type { tabs } from '@contour-ui/core';
import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { expect, fn, userEvent, waitFor } from 'storybook/test';

import { Tabs } from '../index.ts';

/**
 * Headless renders no CSS: just enough here to see the selected trigger, the indicator and the
 * panels, by the data attributes of the parts.
 */
const css = `
  [data-scope='tabs'][data-part='list'] { position: relative; display: flex; gap: 4px; border-bottom: 1px solid; }
  [data-scope='tabs'][data-part='list'][data-orientation='vertical'] { flex-direction: column; border-bottom: 0; border-right: 1px solid; }
  [data-scope='tabs'][data-part='root'][data-orientation='vertical'] { display: flex; gap: 12px; }
  [data-scope='tabs'][data-part='trigger'] { padding: 4px 8px; border: 0; background: none; font: inherit; }
  [data-scope='tabs'][data-part='trigger'][data-selected] { font-weight: bold; }
  [data-scope='tabs'][data-part='indicator'] {
    position: absolute; left: var(--left); width: var(--width); bottom: -1px; height: 2px;
    background: currentColor; transition: left 150ms, width 150ms;
  }
  [data-scope='tabs'][data-part='indicator'][data-orientation='vertical'] {
    left: auto; right: -1px; width: 2px; top: var(--top); height: var(--height); bottom: auto;
    transition: top 150ms, height 150ms;
  }
  [data-scope='tabs'][data-part='indicator'][hidden] { display: none; }
  [data-scope='tabs'][data-part='content'] { padding: 8px 0; }
`;

/** Reports the selections of the stories, as an app would act on them. */
const onValueChange = fn<(details: tabs.ValueChangeDetails) => void>().mockName('onValueChange');

/** A custom property of an element in pixels: `'12.5px'` gives `12.5`. */
const pixels = (element: HTMLElement, name: string): number =>
  Number(element.style.getPropertyValue(name).replace(/px$/u, ''));

/** The indicator inside `canvas`; throws when there is none. */
function indicatorIn(canvas: HTMLElement): HTMLElement {
  const element = canvas.querySelector<HTMLElement>('[data-part="indicator"]');
  if (element === null) {
    throw new Error('No indicator.');
  }
  return element;
}

const meta: Meta<typeof Tabs.Root> = {
  title: 'Headless/Tabs',
  component: Tabs.Root,
  tags: ['autodocs'],
  beforeEach: () => {
    onValueChange.mockClear();
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** The tabs of a channel strip: Sends is disabled. */
function Channel(props: Tabs.RootProps): ReactElement {
  return (
    <Tabs.Root onValueChange={onValueChange} {...props}>
      <style>{css}</style>
      <Tabs.List aria-label="Channel">
        <Tabs.Trigger value="mix">Mix</Tabs.Trigger>
        <Tabs.Trigger value="sends" disabled>
          Sends
        </Tabs.Trigger>
        <Tabs.Trigger value="inserts">Inserts</Tabs.Trigger>
        <Tabs.Trigger value="meter">Meter</Tabs.Trigger>
        <Tabs.Indicator />
      </Tabs.List>
      <Tabs.Content value="mix">Volume and pan.</Tabs.Content>
      <Tabs.Content value="sends">Send levels.</Tabs.Content>
      <Tabs.Content value="inserts">Effects in series.</Tabs.Content>
      <Tabs.Content value="meter">Peak and loudness.</Tabs.Content>
    </Tabs.Root>
  );
}

/**
 * Automatic activation: Tab reaches the selected trigger only, the arrow keys move across the
 * triggers past the disabled Sends and wrap around, and each one they reach is selected. Tab
 * then moves into the panel.
 */
export const Default: Story = {
  render: () => <Channel defaultValue="mix" />,
  play: async ({ canvas }) => {
    const tab = (name: string): HTMLElement => canvas.getByRole('tab', { name });
    await expect(canvas.getByRole('tablist', { name: 'Channel' })).toHaveAttribute(
      'aria-orientation',
      'horizontal',
    );
    await expect(canvas.getByRole('tabpanel', { name: 'Mix' })).toHaveTextContent('Volume');

    await userEvent.tab();
    await expect(tab('Mix')).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(tab('Inserts')).toHaveFocus();
    await expect(tab('Inserts')).toHaveAttribute('aria-selected', 'true');
    await expect(canvas.getByRole('tabpanel', { name: 'Inserts' })).toBeVisible();
    await userEvent.keyboard('{End}{ArrowRight}');
    await expect(tab('Mix')).toHaveFocus();
    await expect(onValueChange).toHaveBeenLastCalledWith({ value: 'mix' });

    await userEvent.tab();
    await expect(canvas.getByRole('tabpanel', { name: 'Mix' })).toHaveFocus();
  },
};

/** Manual activation: the arrow keys only move focus; Enter or Space selects. */
export const ManualActivation: Story = {
  render: () => <Channel defaultValue="mix" activationMode="manual" />,
  play: async ({ canvas }) => {
    const tab = (name: string): HTMLElement => canvas.getByRole('tab', { name });
    await userEvent.click(tab('Mix'));
    await userEvent.keyboard('{ArrowRight}');
    await expect(tab('Inserts')).toHaveFocus();
    await expect(tab('Mix')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard(' ');
    await expect(tab('Inserts')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}{Enter}');
    await expect(tab('Meter')).toHaveAttribute('aria-selected', 'true');
    await expect(onValueChange.mock.calls).toStrictEqual([
      [{ value: 'inserts' }],
      [{ value: 'meter' }],
    ]);
  },
};

/** A vertical list: ↓ and ↑ move, and the indicator runs along the side. */
export const Vertical: Story = {
  render: () => <Channel defaultValue="inserts" orientation="vertical" />,
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('tab', { name: 'Inserts' }));
    await userEvent.keyboard('{ArrowDown}');
    await expect(canvas.getByRole('tab', { name: 'Meter' })).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect(canvas.getByRole('tab', { name: 'Meter' })).toHaveFocus();
  },
};

/** Tabs whose value the owner keeps, and changes from outside too. */
export const Controlled: Story = {
  render: function Render() {
    const [value, setValue] = useState('meter');
    return (
      <>
        <Channel
          value={value}
          onValueChange={(details) => {
            setValue(details.value);
          }}
        />
        <button
          type="button"
          onClick={() => {
            setValue('mix');
          }}
        >
          Back to the mix
        </button>
      </>
    );
  },
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('tab', { name: 'Inserts' }));
    await expect(canvas.getByRole('tabpanel', { name: 'Inserts' })).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Back to the mix' }));
    await expect(canvas.getByRole('tab', { name: 'Mix' })).toHaveAttribute('aria-selected', 'true');
  },
};

/** The indicator follows the selected trigger, placed by `--left` and `--width`. */
export const Indicator: Story = {
  render: () => <Channel defaultValue="mix" />,
  play: async ({ canvas, canvasElement }) => {
    const indicator = indicatorIn(canvasElement);
    const meter = canvas.getByRole('tab', { name: 'Meter' });
    await userEvent.click(meter);
    await waitFor(async () => {
      // `offsetLeft` rounds to whole pixels.
      await expect(Math.abs(pixels(indicator, '--left') - meter.offsetLeft)).toBeLessThan(1);
    });
    await expect(indicator).toBeVisible();
  },
};
