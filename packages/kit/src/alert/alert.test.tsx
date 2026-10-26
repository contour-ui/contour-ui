import {
  circleCheckIcon,
  circleXIcon,
  infoIcon,
  lightbulbIcon,
  moonIcon,
  triangleAlertIcon,
} from '@contour-ui/icons';
import type { IconData } from '@contour-ui/icons';
import { vars } from '@contour-ui/tokens';
import { describe, expect, test } from 'vite-plus/test';
import { render } from 'vitest-browser-react';

import { Alert, Icon } from '../index.ts';

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

/** `value`, failing the test when the element is missing. */
function present<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('Expected the element to be rendered.');
  }
  return value;
}

/** The computed style of the first element in `container` that matches `selector`. */
function styleOf(container: Element, selector: string): CSSStyleDeclaration {
  return getComputedStyle(present(container.querySelector(selector)));
}

/** The `d` of every path drawn in `container`. */
function pathsIn(container: Element): Array<string | null> {
  return [...container.querySelectorAll('path')].map((path) => path.getAttribute('d'));
}

const STATUS_ICONS: ReadonlyArray<readonly [NonNullable<Alert.RootProps['status']>, IconData]> = [
  ['info', infoIcon],
  ['success', circleCheckIcon],
  ['warning', triangleAlertIcon],
  ['danger', circleXIcon],
  ['neutral', lightbulbIcon],
];

describe('Alert', () => {
  test('renders every part with its class and attributes, defaults included', async () => {
    const screen = await render(
      <Alert.Root className="mine">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Pre-release</Alert.Title>
          <Alert.Description>The packages are not on npm yet.</Alert.Description>
        </Alert.Content>
      </Alert.Root>,
    );
    const root = present(screen.container.querySelector<HTMLElement>('[data-scope="alert"]'));
    const parts = [root, ...root.querySelectorAll<HTMLElement>('[data-scope="alert"]')].map(
      ({ dataset, className }) => [dataset['part'], className],
    );

    expect(parts).toStrictEqual([
      ['root', 'contour-alert mine'],
      ['indicator', 'contour-alert__indicator'],
      ['content', 'contour-alert__content'],
      ['title', 'contour-alert__title'],
      ['description', 'contour-alert__description'],
    ]);
    expect(root).toHaveAttribute('data-status', 'info');
    expect(root).toHaveAttribute('data-variant', 'subtle');
    // Static text: no role, so nothing is announced.
    expect(root).not.toHaveAttribute('role');
  });

  test('is styled with the semantic tokens of its status', async () => {
    const screen = await render(
      <Alert.Root status="warning">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>Output is clipping</Alert.Title>
          <Alert.Description>Lower the gain.</Alert.Description>
        </Alert.Content>
      </Alert.Root>,
    );
    const { container } = screen;
    const root = styleOf(container, '.contour-alert');
    const title = styleOf(container, '.contour-alert__title');
    const description = styleOf(container, '.contour-alert__description');
    const icon = styleOf(container, '.contour-alert__indicator svg');
    const background = computed('background-color', vars.color.warning.bg);

    // The token resolves to a real color (tokens.css is loaded), and the kit uses it.
    expect(background).toMatch(/^oklch\(/u);
    expect(root.backgroundColor).toBe(background);
    expect(root.borderTopColor).toBe(computed('border-top-color', vars.color.warning.border));
    expect(root.borderTopLeftRadius).toBe(computed('border-top-left-radius', vars.radius.panel));
    expect(root.paddingTop).toBe(computed('padding-top', vars.space['panel-inset']));
    expect(root.columnGap).toBe(computed('column-gap', vars.space['group-gap']));
    expect(styleOf(container, '.contour-alert__indicator').color).toBe(
      computed('color', vars.color.warning.fg),
    );
    expect([icon.width, icon.height]).toStrictEqual([
      computed('width', vars.size['icon-md']),
      computed('height', vars.size['icon-md']),
    ]);
    expect(title.color).toBe(computed('color', vars.color.fg.default));
    expect(title.fontSize).toBe(computed('font-size', vars.text.heading.fontSize));
    expect(title.fontWeight).toBe(computed('font-weight', vars.text.heading.fontWeight));
    expect(description.color).toBe(computed('color', vars.color.fg.default));
    expect(description.fontSize).toBe(computed('font-size', vars.text.body.fontSize));
  });

  test('the outline variant keeps the status border and icon on a transparent background', async () => {
    const screen = await render(
      <Alert.Root status="success" variant="outline">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>Preset saved.</Alert.Description>
        </Alert.Content>
      </Alert.Root>,
    );
    const root = styleOf(screen.container, '.contour-alert');

    expect(root.backgroundColor).toBe('rgba(0, 0, 0, 0)');
    expect(root.borderTopColor).toBe(computed('border-top-color', vars.color.success.border));
    expect(styleOf(screen.container, '.contour-alert__indicator').color).toBe(
      computed('color', vars.color.success.fg),
    );
  });

  test('neutral takes the surface, the default border and a muted icon', async () => {
    const screen = await render(
      <Alert.Root status="neutral">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>Hold Shift to fine-tune.</Alert.Description>
        </Alert.Content>
      </Alert.Root>,
    );
    const root = styleOf(screen.container, '.contour-alert');

    expect(root.backgroundColor).toBe(computed('background-color', vars.color.bg.surface));
    expect(root.borderTopColor).toBe(computed('border-top-color', vars.color.border.default));
    expect(styleOf(screen.container, '.contour-alert__indicator').color).toBe(
      computed('color', vars.color.fg.muted),
    );
  });

  test.each(STATUS_ICONS)(
    'the indicator of %s shows its icon, hidden from assistive technology',
    async (status, icon) => {
      const screen = await render(
        <Alert.Root status={status}>
          <Alert.Indicator />
        </Alert.Root>,
      );
      const indicator = present(screen.container.querySelector('.contour-alert__indicator'));

      expect(pathsIn(indicator)).toStrictEqual(icon.paths.map((path) => path.d));
      expect(indicator.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    },
  );

  test('indicator children replace the status icon', async () => {
    const screen = await render(
      <Alert.Root status="neutral">
        <Alert.Indicator>
          <Icon icon={moonIcon} />
        </Alert.Indicator>
      </Alert.Root>,
    );
    const indicator = present(screen.container.querySelector('.contour-alert__indicator'));

    expect(pathsIn(indicator)).toStrictEqual(moonIcon.paths.map((path) => path.d));
  });

  test('an alert inside another one keeps its own colors and icon', async () => {
    const screen = await render(
      <Alert.Root status="info">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Description>
            <Alert.Root status="danger" className="inner">
              <Alert.Indicator />
            </Alert.Root>
          </Alert.Description>
        </Alert.Content>
      </Alert.Root>,
    );
    const inner = present(screen.container.querySelector('.inner'));

    expect(getComputedStyle(inner).backgroundColor).toBe(
      computed('background-color', vars.color.danger.bg),
    );
    expect(styleOf(inner, '.contour-alert__indicator').color).toBe(
      computed('color', vars.color.danger.fg),
    );
    expect(pathsIn(inner)).toStrictEqual(circleXIcon.paths.map((path) => path.d));
  });

  test('parts pass their props through and render their child with asChild', async () => {
    const screen = await render(
      <Alert.Root role="alert" id="stopped" status="danger">
        <Alert.Content>
          <Alert.Title asChild>
            <h3>Audio engine stopped</h3>
          </Alert.Title>
        </Alert.Content>
      </Alert.Root>,
    );
    const heading = screen.getByRole('heading', { level: 3, name: 'Audio engine stopped' });

    await expect.element(screen.getByRole('alert')).toHaveAttribute('id', 'stopped');
    await expect.element(heading).toHaveClass('contour-alert__title');
    await expect.element(heading).toHaveAttribute('data-part', 'title');
    // The part's styles replace the heading's own margins and font.
    await expect.element(heading).toHaveStyle({
      marginTop: '0px',
      fontSize: computed('font-size', vars.text.heading.fontSize),
    });
  });

  test('the icon centers on the first line of text, with or without a title', async () => {
    const screen = await render(
      <div style={{ inlineSize: '320px' }}>
        <Alert.Root>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>Pre-release</Alert.Title>
            <Alert.Description>The packages are not on npm yet.</Alert.Description>
          </Alert.Content>
        </Alert.Root>
        <Alert.Root>
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>The packages are not on npm yet.</Alert.Description>
          </Alert.Content>
        </Alert.Root>
      </div>,
    );
    const offsets = [...screen.container.querySelectorAll('.contour-alert')].map((alert) => {
      const icon = present(alert.querySelector('svg')).getBoundingClientRect();
      const line = present(
        alert.querySelector('.contour-alert__content > *'),
      ).getBoundingClientRect();
      return Math.abs(icon.top + icon.height / 2 - (line.top + line.height / 2));
    });

    // One line each, so the text box is its line; a title line is 1.4 px shorter than a body line.
    expect(offsets).toHaveLength(2);
    for (const offset of offsets) {
      expect(offset).toBeLessThanOrEqual(1);
    }
  });

  test('parts that set a display still hide with `hidden`', async () => {
    const screen = await render(
      <Alert.Root hidden>
        <Alert.Indicator hidden />
        <Alert.Content hidden />
      </Alert.Root>,
    );

    const selectors = ['.contour-alert', '.contour-alert__indicator', '.contour-alert__content'];

    // The display of each part itself, whatever its ancestors show.
    expect(
      selectors.map((selector) => [selector, styleOf(screen.container, selector).display]),
    ).toStrictEqual(selectors.map((selector) => [selector, 'none']));
  });
});
