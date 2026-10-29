import type { ReactElement } from 'react';
import { describe, expect, it } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Tabs } from '../index.ts';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';

/** Computed value of `property` when set to `value` (resolves `var(--ct-…)`). */
function computed(property: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const result = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return result;
}

/** The triggers in the document, in order. */
function triggers(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('.contour-tabs__trigger')];
}

/** The element at `index`; throws when there is none. */
function at<E extends Element>(elements: readonly E[], index: number): E {
  const element = elements[index];
  if (element === undefined) {
    throw new Error(`No element at ${index}.`);
  }
  return element;
}

/** The `display` of the bar a trigger draws itself. */
const bar = (element: Element): string => getComputedStyle(element, '::after').display;

function Synth({
  indicator = true,
  ...props
}: Tabs.RootProps & { readonly indicator?: boolean }): ReactElement {
  return (
    <Tabs.Root defaultValue="osc" {...props}>
      <Tabs.List aria-label="Synth">
        <Tabs.Trigger value="osc">Oscillator</Tabs.Trigger>
        <Tabs.Trigger value="filter">Filter</Tabs.Trigger>
        {indicator ? <Tabs.Indicator /> : null}
      </Tabs.List>
      <Tabs.Content value="osc">Waveform</Tabs.Content>
      <Tabs.Content value="filter">Cutoff</Tabs.Content>
    </Tabs.Root>
  );
}

const PARTS = [
  ['root', 'contour-tabs'],
  ['list', 'contour-tabs__list'],
  ['trigger', 'contour-tabs__trigger'],
  ['content', 'contour-tabs__content'],
  ['indicator', 'contour-tabs__indicator'],
] as const;

describe('Tabs', () => {
  it('gives every part its class, the default variant and size, and the user class', async () => {
    await render(<Synth className="mine" />);
    for (const [part, className] of PARTS) {
      const element = document.querySelector(`[data-scope="tabs"][data-part="${part}"]`);
      expect(element).toHaveClass(className);
      expect(element).toHaveAttribute('data-variant', 'line');
      expect(element).toHaveAttribute('data-size', 'md');
    }
    expect(document.querySelector('.contour-tabs')).toHaveClass('mine');
  });

  it('renders the variant and size on every part, apart from a nested Tabs', async () => {
    await render(
      <Tabs.Root defaultValue="a" variant="enclosed" size="lg">
        <Tabs.List>
          <Tabs.Trigger value="a">A</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="a">
          <Synth />
        </Tabs.Content>
      </Tabs.Root>,
    );
    const outer = document.querySelectorAll('.contour-tabs__trigger');
    expect(outer[0]).toHaveAttribute('data-variant', 'enclosed');
    expect(outer[0]).toHaveAttribute('data-size', 'lg');
    expect(outer[1]).toHaveAttribute('data-variant', 'line');
    expect(outer[1]).toHaveAttribute('data-size', 'md');
  });

  it('sizes the triggers with the control heights', async () => {
    await render(
      <>
        <Synth size="sm" />
        <Synth size="lg" />
      </>,
    );
    const sm = at(triggers(), 0);
    const lg = at(triggers(), 2);
    expect(getComputedStyle(sm).blockSize).toBe(
      computed('block-size', 'var(--ct-size-control-sm)'),
    );
    expect(getComputedStyle(lg).blockSize).toBe(
      computed('block-size', 'var(--ct-size-control-lg)'),
    );
  });

  it('marks the selected trigger with a bar, until the indicator takes it over', async () => {
    await render(
      <>
        <Synth indicator={false} />
        <Synth />
      </>,
    );
    const plain = at(triggers(), 0);
    const withIndicator = at(triggers(), 2);
    expect(bar(plain)).toBe('block');
    await expect.poll(() => bar(withIndicator)).toBe('none');
    const indicator = at([...document.querySelectorAll('.contour-tabs__indicator')], 0);
    expect(getComputedStyle(indicator).backgroundColor).toBe(
      computed('background-color', 'var(--ct-color-accent-fill)'),
    );
  });

  it('raises the selected trigger of the enclosed variant with a border', async () => {
    const screen = await render(<Synth variant="enclosed" indicator={false} />);
    const selected = screen.getByRole('tab', { name: 'Oscillator' }).element();
    await userEvent.unhover(selected);
    expect(getComputedStyle(selected).borderTopColor).toBe(
      computed('color', 'var(--ct-color-border-default)'),
    );
    expect(getComputedStyle(selected).backgroundColor).toBe(
      computed('background-color', 'var(--ct-color-bg-raised)'),
    );
  });
});
