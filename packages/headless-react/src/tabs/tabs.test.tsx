import type { tabs } from '@contour-ui/core';
import { expectNoAxeViolations } from '@contour-ui/vite-config/visual';
import { useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Tabs, useTabsContext } from '../index.ts';

interface Tab {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

const TABS: readonly Tab[] = [
  { value: 'osc', label: 'Oscillator' },
  { value: 'filter', label: 'Filter' },
  { value: 'env', label: 'Envelope', disabled: true },
  { value: 'lfo', label: 'LFO' },
];

interface SynthProps extends Tabs.RootProps {
  readonly items?: readonly Tab[];
  readonly extra?: ReactNode;
}

/** Tabs over `items`, with a content per tab and an indicator. */
function Synth({ items = TABS, extra, ...props }: SynthProps): ReactElement {
  return (
    <Tabs.Root {...props}>
      <Tabs.List aria-label="Synth">
        {items.map((item) => (
          <Tabs.Trigger key={item.value} value={item.value} disabled={item.disabled}>
            {item.label}
          </Tabs.Trigger>
        ))}
        <Tabs.Indicator style={{ position: 'absolute' }} />
      </Tabs.List>
      {items.map((item) => (
        <Tabs.Content key={item.value} value={item.value}>
          <p>{`${item.label} panel`}</p>
        </Tabs.Content>
      ))}
      {extra}
    </Tabs.Root>
  );
}

async function setup(props: SynthProps = {}) {
  const screen = await render(<Synth {...props} />);
  const tab = (name: string) => screen.getByRole('tab', { name, exact: true });
  const panel = (name: string) => screen.getByRole('tabpanel', { name, exact: true });
  return { screen, tab, panel };
}

const valueSpy = () => vi.fn<(details: tabs.ValueChangeDetails) => void>();

/** The element of a part; throws when there is none. */
function partElement(name: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`[data-scope="tabs"][data-part="${name}"]`);
  if (element === null) {
    throw new Error(`No ${name} part.`);
  }
  return element;
}

/** An element found by id; throws when there is none. */
function byId(id: string): HTMLElement {
  const element = document.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  if (element === null) {
    throw new Error(`No element #${id}.`);
  }
  return element;
}

/** The trigger named `name`; throws when there is none. */
function tabElement(name: string): HTMLElement {
  const element = [...document.querySelectorAll<HTMLElement>('[role="tab"]')].find(
    (trigger) => trigger.textContent === name,
  );
  if (element === undefined) {
    throw new Error(`No tab ${name}.`);
  }
  return element;
}

/** A custom property of an element in pixels: `'12.5px'` gives `12.5`. */
const pixels = (element: HTMLElement, name: string): number =>
  Number(element.style.getPropertyValue(name).replace(/px$/u, ''));

/** The texts of the mounted children of the contents. */
const mounted = (): string[] =>
  [...document.querySelectorAll('[data-part="content"] p')].map((p) => p.textContent);

/** Tabs whose owner takes every value but `lfo`. */
function Picky({
  onValueChange,
}: {
  readonly onValueChange: (details: tabs.ValueChangeDetails) => void;
}): ReactElement {
  const [value, setValue] = useState('osc');
  return (
    <Synth
      value={value}
      onValueChange={(details) => {
        onValueChange(details);
        if (details.value !== 'lfo') {
          setValue(details.value);
        }
      }}
    />
  );
}

/** Tabs whose triggers a button reverses, without remounting them. */
function Moving(): ReactElement {
  const [items, setItems] = useState(TABS);
  return (
    <Synth
      defaultValue="osc"
      items={items}
      extra={
        <button
          type="button"
          onClick={() => {
            setItems(TABS.toReversed());
          }}
        >
          Reverse
        </button>
      }
    />
  );
}

/**
 * The examples' own styles: just enough to see the selected trigger, the indicator and the
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

/** The tabs of a channel strip: Sends is disabled. */
function Channel(props: Tabs.RootProps): ReactElement {
  return (
    <Tabs.Root {...props}>
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

/** Tabs whose value the owner keeps, and changes from outside too. */
function OwnedChannel(): ReactElement {
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
}

/** A part of one's own: shows the value and selects LFO. */
function Current(): ReactElement {
  const { value, setValue } = useTabsContext();
  return (
    <button
      type="button"
      onClick={() => {
        setValue('lfo');
      }}
    >
      {`Now ${String(value)}`}
    </button>
  );
}

describe('Tabs', () => {
  describe('anatomy', () => {
    it('renders the roles, ids and links of WAI-ARIA tabs', async () => {
      const { screen, tab, panel } = await setup({ defaultValue: 'filter' });
      const list = screen.getByRole('tablist', { name: 'Synth' });
      await expect.element(list).toHaveAttribute('aria-orientation', 'horizontal');
      await expect.element(list).toHaveAttribute('data-orientation', 'horizontal');

      const filter = tab('Filter').element();
      const content = panel('Filter').element();
      expect(filter.getAttribute('aria-controls')).toBe(content.id);
      expect(content.getAttribute('aria-labelledby')).toBe(filter.id);
      expect(filter).toHaveAttribute('type', 'button');
      expect(filter).toHaveAttribute('aria-selected', 'true');
      expect(filter).toHaveAttribute('data-selected', '');
      expect(filter).toHaveAttribute('data-value', 'filter');
      expect(content).toHaveAttribute('tabindex', '0');
      expect(content).toHaveAttribute('data-selected', '');
      expect(tab('Oscillator').element()).toHaveAttribute('aria-selected', 'false');
      expect(tab('Envelope').element()).toBeDisabled();
      expect(tab('Envelope').element()).toHaveAttribute('data-disabled', '');
      for (const part of ['root', 'list', 'trigger', 'content', 'indicator']) {
        expect(document.querySelector(`[data-scope="tabs"][data-part="${part}"]`)).not.toBeNull();
      }
    });

    it('hides the contents of the tabs that are not selected', async () => {
      const { screen } = await setup({ defaultValue: 'osc' });
      const contents = [...document.querySelectorAll('[data-part="content"]')];
      expect(contents.map((content) => content.hasAttribute('hidden'))).toStrictEqual([
        false,
        true,
        true,
        true,
      ]);
      await expect.element(screen.getByText('Oscillator panel')).toBeVisible();
    });

    it('rolls the tab stop: only the selected trigger is in the tab order', async () => {
      const { tab } = await setup({ defaultValue: 'lfo' });
      expect(TABS.map((item) => tab(item.label).element().tabIndex)).toStrictEqual([-1, -1, -1, 0]);
    });

    it('reaches the selected trigger with Tab, and its panel with the next Tab', async () => {
      const { tab, panel } = await setup({ defaultValue: 'filter' });

      await userEvent.tab();
      await expect.element(tab('Filter')).toHaveFocus();
      await userEvent.tab();
      await expect.element(panel('Filter')).toHaveFocus();
    });

    it('follows ids given to the triggers and the contents', async () => {
      await render(
        <Tabs.Root defaultValue="a">
          <Tabs.List>
            <Tabs.Trigger value="a" id="trigger-a">
              A
            </Tabs.Trigger>
          </Tabs.List>
          <Tabs.Content value="a" id="panel-a">
            Panel
          </Tabs.Content>
        </Tabs.Root>,
      );
      await expect.element(byId('trigger-a')).toHaveAttribute('aria-controls', 'panel-a');
      await expect.element(byId('panel-a')).toHaveAttribute('aria-labelledby', 'trigger-a');
    });

    it('takes any string as a value', async () => {
      const value = 'npm install @contour-ui/react';
      const { tab, panel } = await setup({
        items: [
          { value, label: 'npm' },
          { value: 'pnpm add', label: 'pnpm' },
        ],
        defaultValue: value,
      });
      await expect.element(panel('npm')).toBeVisible();
      await userEvent.click(tab('pnpm'));
      await expect.element(panel('pnpm')).toBeVisible();
    });

    it('renders on a server with the selected trigger as the tab stop and no links yet', () => {
      const html = renderToStaticMarkup(<Synth defaultValue="filter" />);
      expect(html).toContain('role="tablist"');
      expect(html).not.toContain('aria-controls');
      const stops = [...html.matchAll(/<button[^>]*tabindex="0"[^>]*>/gu)].map(([tag]) => tag);
      expect(stops).toHaveLength(1);
      expect(stops.join('')).toContain('aria-selected="true"');
    });
  });

  describe('selection', () => {
    it('selects nothing without a value, with the first enabled trigger as the tab stop', async () => {
      const { tab } = await setup({ items: [...TABS.slice(2, 3), ...TABS.slice(0, 2)] });
      expect(document.querySelectorAll('[data-part="content"]:not([hidden])')).toHaveLength(0);
      await expect.element(tab('Oscillator')).toHaveAttribute('tabindex', '0');
      expect(document.querySelector('[data-part="indicator"]')).toHaveAttribute('hidden');
    });

    it('shows the content of a value without a trigger, and no selected trigger', async () => {
      const { screen } = await setup({
        defaultValue: 'extra',
        extra: <Tabs.Content value="extra">Extra panel</Tabs.Content>,
      });
      await expect.element(screen.getByText('Extra panel')).toBeVisible();
      expect(document.querySelectorAll('[aria-selected="true"]')).toHaveLength(0);
      await expect
        .element(screen.getByRole('tab', { name: 'Oscillator' }))
        .toHaveAttribute('tabindex', '0');
    });

    it('selects with a click, and ignores a disabled trigger', async () => {
      const onValueChange = valueSpy();
      const { tab, panel } = await setup({ defaultValue: 'osc', onValueChange });
      await userEvent.click(tab('LFO'));
      await expect.element(panel('LFO')).toBeVisible();
      await userEvent.click(tab('Envelope'), { force: true });
      expect(onValueChange.mock.calls).toStrictEqual([[{ value: 'lfo' }]]);
    });

    it('follows a controlled value', async () => {
      const onValueChange = valueSpy();
      const screen = await render(<Picky onValueChange={onValueChange} />);
      const tab = (name: string) => screen.getByRole('tab', { name, exact: true });
      await userEvent.click(tab('Filter'));
      await expect.element(tab('Filter')).toHaveAttribute('aria-selected', 'true');
      // The owner refuses this one.
      await userEvent.click(tab('LFO'));
      await expect.element(tab('Filter')).toHaveAttribute('aria-selected', 'true');
      expect(onValueChange.mock.calls).toStrictEqual([[{ value: 'filter' }], [{ value: 'lfo' }]]);
    });
  });

  describe('controlled from outside', () => {
    it('follows a value its owner changes on its own', async () => {
      const screen = await render(<OwnedChannel />);

      await userEvent.click(screen.getByRole('tab', { name: 'Inserts' }));
      await expect.element(screen.getByRole('tabpanel', { name: 'Inserts' })).toBeVisible();
      await userEvent.click(screen.getByRole('button', { name: 'Back to the mix' }));
      await expect
        .element(screen.getByRole('tab', { name: 'Mix' }))
        .toHaveAttribute('aria-selected', 'true');
      await expect.element(screen.getByRole('tabpanel', { name: 'Mix' })).toBeVisible();
    });
  });

  describe('keyboard', () => {
    it('moves and selects with the arrow keys, Home and End, past disabled triggers', async () => {
      const onValueChange = valueSpy();
      const { tab } = await setup({ defaultValue: 'osc', onValueChange });
      await userEvent.click(tab('Oscillator'));
      await userEvent.keyboard('{ArrowRight}{ArrowRight}');
      await expect.element(tab('LFO')).toHaveFocus();
      // Loops by default.
      await userEvent.keyboard('{ArrowRight}');
      await expect.element(tab('Oscillator')).toHaveFocus();
      await userEvent.keyboard('{ArrowLeft}');
      await expect.element(tab('LFO')).toHaveFocus();
      await userEvent.keyboard('{Home}');
      await expect.element(tab('Oscillator')).toHaveFocus();
      await userEvent.keyboard('{End}');
      await expect.element(tab('LFO')).toHaveAttribute('aria-selected', 'true');
      // ↓ and ↑ do nothing in a horizontal list.
      await userEvent.keyboard('{ArrowDown}');
      await expect.element(tab('LFO')).toHaveFocus();
      expect(onValueChange.mock.calls.map(([details]) => details.value)).toStrictEqual([
        'filter',
        'lfo',
        'osc',
        'lfo',
        'osc',
        'lfo',
      ]);
    });

    it('stops at the ends without loopFocus', async () => {
      const { tab } = await setup({ defaultValue: 'lfo', loopFocus: false });
      await userEvent.click(tab('LFO'));
      await userEvent.keyboard('{ArrowRight}');
      await expect.element(tab('LFO')).toHaveFocus();
    });

    it('selects with Enter and Space only, in the manual mode', async () => {
      const onValueChange = valueSpy();
      const { tab } = await setup({ defaultValue: 'osc', activationMode: 'manual', onValueChange });
      await userEvent.click(tab('Oscillator'));
      await userEvent.keyboard('{ArrowRight}');
      await expect.element(tab('Filter')).toHaveFocus();
      await expect.element(tab('Oscillator')).toHaveAttribute('aria-selected', 'true');
      await expect.element(tab('Filter')).toHaveAttribute('data-focus', '');
      await userEvent.keyboard('{Enter}');
      await expect.element(tab('Filter')).toHaveAttribute('aria-selected', 'true');
      await userEvent.keyboard('{ArrowRight} ');
      await expect.element(tab('LFO')).toHaveAttribute('aria-selected', 'true');
      // Moves of the focus report nothing.
      expect(onValueChange.mock.calls).toStrictEqual([[{ value: 'filter' }], [{ value: 'lfo' }]]);
    });

    it('moves with ↓ and ↑ in a vertical list', async () => {
      const { tab, screen } = await setup({ defaultValue: 'osc', orientation: 'vertical' });
      await expect
        .element(screen.getByRole('tablist'))
        .toHaveAttribute('aria-orientation', 'vertical');
      await userEvent.click(tab('Oscillator'));
      await userEvent.keyboard('{ArrowDown}');
      await expect.element(tab('Filter')).toHaveFocus();
      await userEvent.keyboard('{ArrowRight}{ArrowUp}');
      await expect.element(tab('Oscillator')).toHaveFocus();
    });

    it('swaps ← and → right to left', async () => {
      const screen = await render(
        <div dir="rtl">
          <Synth defaultValue="osc" />
        </div>,
      );
      await userEvent.click(screen.getByRole('tab', { name: 'Oscillator' }));
      await userEvent.keyboard('{ArrowLeft}');
      await expect.element(screen.getByRole('tab', { name: 'Filter' })).toHaveFocus();
    });

    it('follows triggers that move', async () => {
      const screen = await render(<Moving />);
      await userEvent.click(screen.getByRole('button', { name: 'Reverse' }));
      await userEvent.click(screen.getByRole('tab', { name: 'Filter' }));
      await userEvent.keyboard('{ArrowRight}');
      await expect.element(screen.getByRole('tab', { name: 'Oscillator' })).toHaveFocus();
    });
  });

  describe('mounting contents', () => {
    it('mounts every content by default', async () => {
      await setup({ defaultValue: 'osc' });
      expect(mounted()).toHaveLength(4);
    });

    it('mounts a content when it is first selected, with lazyMount', async () => {
      const { tab } = await setup({ defaultValue: 'osc', lazyMount: true });
      expect(mounted()).toStrictEqual(['Oscillator panel']);
      await userEvent.click(tab('Filter'));
      expect(mounted()).toStrictEqual(['Oscillator panel', 'Filter panel']);
    });

    it('unmounts a deselected content, with unmountOnExit', async () => {
      const { tab } = await setup({ defaultValue: 'osc', unmountOnExit: true });
      expect(mounted()).toStrictEqual(['Oscillator panel']);
      await userEvent.click(tab('Filter'));
      expect(mounted()).toStrictEqual(['Filter panel']);
      // The elements stay, so the triggers still point to them.
      expect(document.querySelectorAll('[data-part="content"]')).toHaveLength(4);
    });
  });

  describe('indicator', () => {
    it('carries the box of the selected trigger, relative to the list', async () => {
      const { tab } = await setup({ defaultValue: 'filter' });
      const list = partElement('list');
      list.style.position = 'relative';
      list.style.display = 'flex';
      const indicator = partElement('indicator');
      const expectAt = async (name: string): Promise<void> => {
        const box = tabElement(name);
        // `offset*` round to whole pixels.
        await expect
          .poll(() => Math.abs(pixels(indicator, '--left') - box.offsetLeft))
          .toBeLessThan(1);
        expect(Math.abs(pixels(indicator, '--width') - box.offsetWidth)).toBeLessThan(1);
        expect(Math.abs(pixels(indicator, '--top') - box.offsetTop)).toBeLessThan(1);
        expect(indicator.hidden).toBe(false);
      };
      await expectAt('Filter');
      await userEvent.click(tab('LFO'));
      await expectAt('LFO');
      // A trigger before it that grows moves it.
      const osc = tab('Oscillator').element();
      osc.textContent = 'Oscillator with a long name';
      await expectAt('LFO');
      expect(indicator).toHaveAttribute('aria-hidden', 'true');
    });

    it('hides while the list is not laid out', async () => {
      await setup({ defaultValue: 'filter' });
      const indicator = partElement('indicator');
      await expect.poll(() => indicator.hidden).toBe(false);
      partElement('list').style.display = 'none';
      await expect.poll(() => indicator.hidden).toBe(true);
    });
  });

  it('gives custom parts the API', async () => {
    const screen = await render(<Synth defaultValue="osc" extra={<Current />} />);
    await userEvent.click(screen.getByRole('button', { name: 'Now osc' }));
    await expect.element(screen.getByRole('button', { name: 'Now lfo' })).toBeVisible();
    expect(() => renderToStaticMarkup(<Current />)).toThrow('inside <Tabs.Root>');
  });
});

describe('Tabs accessibility', () => {
  it('has no axe violations: Default', async () => {
    const screen = await render(<Channel defaultValue="mix" />);
    const tab = (name: string) => screen.getByRole('tab', { name });

    // Round the triggers with the arrow keys, then into the panel of Mix with Tab.
    await userEvent.tab();
    await expect.element(tab('Mix')).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(tab('Inserts')).toHaveFocus();
    await userEvent.keyboard('{End}{ArrowRight}');
    await expect.element(tab('Mix')).toHaveFocus();
    await userEvent.tab();
    await expect.element(screen.getByRole('tabpanel', { name: 'Mix' })).toHaveFocus();
    await expectNoAxeViolations();
  });

  it('has no axe violations: ManualActivation', async () => {
    const screen = await render(<Channel defaultValue="mix" activationMode="manual" />);
    const tab = (name: string) => screen.getByRole('tab', { name });

    // Inserts selected with Space, then Meter with Enter.
    await userEvent.click(tab('Mix'));
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(tab('Inserts')).toHaveFocus();
    await userEvent.keyboard(' ');
    await expect.element(tab('Inserts')).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowRight}{Enter}');
    await expect.element(tab('Meter')).toHaveAttribute('aria-selected', 'true');
    await expectNoAxeViolations();
  });

  it('has no axe violations: Vertical', async () => {
    const screen = await render(<Channel defaultValue="inserts" orientation="vertical" />);
    const meter = screen.getByRole('tab', { name: 'Meter' });

    await userEvent.click(screen.getByRole('tab', { name: 'Inserts' }));
    await userEvent.keyboard('{ArrowDown}');
    await expect.element(meter).toHaveFocus();
    await userEvent.keyboard('{ArrowRight}');
    await expect.element(meter).toHaveFocus();
    await expectNoAxeViolations();
  });

  it('has no axe violations: Controlled', async () => {
    const screen = await render(<OwnedChannel />);

    await userEvent.click(screen.getByRole('tab', { name: 'Inserts' }));
    await expect.element(screen.getByRole('tabpanel', { name: 'Inserts' })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Back to the mix' }));
    await expect
      .element(screen.getByRole('tab', { name: 'Mix' }))
      .toHaveAttribute('aria-selected', 'true');
    await expectNoAxeViolations();
  });

  it('has no axe violations: Indicator', async () => {
    const screen = await render(<Channel defaultValue="mix" />);
    const indicator = partElement('indicator');

    // The indicator under Meter.
    await userEvent.click(screen.getByRole('tab', { name: 'Meter' }));
    await expect
      .poll(() => Math.abs(pixels(indicator, '--left') - tabElement('Meter').offsetLeft))
      .toBeLessThan(1);
    await expect.element(indicator).toBeVisible();
    await expectNoAxeViolations();
  });
});
