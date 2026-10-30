import { checkIcon, copyIcon } from '@contour-ui/icons';
import type { IconData } from '@contour-ui/icons';
import { vars } from '@contour-ui/tokens';
import { createRef } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { cdp, userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Clipboard } from '../index.ts';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';

type WriteText = (text: string) => Promise<void>;

/**
 * Replace `navigator.clipboard` for one test: the real one needs permissions that headless
 * Chromium does not grant. Returns the spy of its `writeText`.
 */
function stubClipboard(write: WriteText = () => Promise.resolve()) {
  const writeText = vi.fn<WriteText>(write);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  return writeText;
}

afterEach(async () => {
  // The own property hid the browser's getter on `Navigator.prototype`.
  Reflect.deleteProperty(navigator, 'clipboard');
  vi.useRealTimers();
  await cdp().send('Emulation.setEmulatedMedia', { features: [] });
});

/** Computed value of `property` when set to `value` (resolves `var(--ct-…)`). */
function computed(property: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const result = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return result;
}

/** A length token in pixels, as the browser computes it. */
const px = (value: string): string => computed('padding-top', value);

/** The element of a clipboard part: the first one, or the one in `root`. */
function part(name: string, root: ParentNode = document): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-scope="clipboard"][data-part="${name}"]`);
  if (element === null) {
    throw new Error(`No clipboard ${name}.`);
  }
  return element;
}

/** The root of the clipboard at `index` in `container`. */
function rootAt(container: ParentNode, index: number): HTMLElement {
  const root = container.querySelectorAll<HTMLElement>('.contour-clipboard')[index];
  if (root === undefined) {
    throw new Error(`No clipboard at ${index}.`);
  }
  return root;
}

/** The path data of the icon in or of `element`. */
function iconOf(element: Element): string | null | undefined {
  return element.querySelector('path')?.getAttribute('d');
}

/** The path data an icon starts with. */
const firstPath = (icon: IconData): string | undefined => icon.paths[0]?.d;

const sizes = ['sm', 'md', 'lg'] as const;

/** An install command: a prompt, the command, and a trigger with an icon and "Copy". */
function InstallCommand(props: Clipboard.RootProps): ReactElement {
  return (
    <Clipboard.Root value="pnpm add @contour-ui/react" {...props}>
      <Clipboard.Control>
        <Clipboard.ValueText prompt="$" />
        <Clipboard.Trigger>
          <Clipboard.Indicator />
          Copy
        </Clipboard.Trigger>
      </Clipboard.Control>
    </Clipboard.Root>
  );
}

/** A labeled link with an icon trigger. */
function ShareLink(props: Clipboard.RootProps): ReactElement {
  return (
    <Clipboard.Root value="https://contour-ui.dev/docs/kit/clipboard" {...props}>
      <Clipboard.Label>Share link</Clipboard.Label>
      <Clipboard.Control>
        <Clipboard.ValueText />
        <Clipboard.Trigger aria-label="Copy the link" />
      </Clipboard.Control>
    </Clipboard.Root>
  );
}

describe('Clipboard', () => {
  it('renders each part with its class, the resolved size and a ghost trigger', async () => {
    stubClipboard();
    const screen = await render(
      <>
        <InstallCommand />
        <ShareLink size="lg" />
      </>,
    );
    const install = rootAt(screen.container, 0);
    const share = rootAt(screen.container, 1);

    expect(install).toHaveAttribute('data-scope', 'clipboard');
    expect(install).toHaveAttribute('data-part', 'root');
    expect(install).toHaveAttribute('data-size', 'md');
    expect(share).toHaveAttribute('data-size', 'lg');
    expect(part('label', share)).toHaveClass('contour-clipboard__label', { exact: true });
    expect(part('control', install)).toHaveClass('contour-clipboard__control', { exact: true });
    expect(part('value-text', install)).toHaveClass('contour-clipboard__value-text', {
      exact: true,
    });
    expect(part('value-text', install).textContent).toBe('pnpm add @contour-ui/react');

    const text = part('trigger', install);
    expect(text).toHaveClass('contour-button contour-clipboard__trigger', { exact: true });
    expect(text).toHaveAttribute('type', 'button');
    expect(text).toHaveAttribute('data-variant', 'ghost');
    expect(text).toHaveAttribute('data-size', 'md');
    const icon = part('trigger', share);
    expect(icon).toHaveClass('contour-button contour-icon-button contour-clipboard__trigger', {
      exact: true,
    });
    expect(icon).toHaveAttribute('data-size', 'lg');

    // The default icons are the element of the indicator, a child of the trigger in both.
    for (const root of [install, share]) {
      const indicator = part('indicator', root);
      expect(indicator.tagName).toBe('svg');
      expect(indicator).toHaveClass('contour-icon contour-clipboard__indicator', { exact: true });
      expect(indicator).toHaveAttribute('aria-hidden', 'true');
      expect(indicator.parentElement).toBe(part('trigger', root));
    }
  });

  it('names the trigger "Copy to clipboard" or its own label, and the group by the label', async () => {
    stubClipboard();
    const screen = await render(
      <>
        <InstallCommand />
        <ShareLink />
      </>,
    );

    await expect
      .element(screen.getByRole('button', { name: 'Copy to clipboard', exact: true }))
      .toHaveTextContent('Copy');
    await expect
      .element(screen.getByRole('group', { name: 'Share link' }))
      .toContainElement(screen.getByRole('button', { name: 'Copy the link' }).element());
  });

  it('is styled with semantic tokens', async () => {
    stubClipboard();
    const screen = await render(<ShareLink />);
    const trigger = screen.getByRole('button', { name: 'Copy the link' });
    // The pointer stays where earlier tests on the page left it; over the trigger, it would give
    // it the hover colors.
    await userEvent.unhover(trigger);
    const control = getComputedStyle(part('control'));
    const value = getComputedStyle(part('value-text'));
    const label = getComputedStyle(part('label'));

    expect({
      borderTopWidth: control.borderTopWidth,
      borderTopColor: control.borderTopColor,
      borderTopLeftRadius: control.borderTopLeftRadius,
      backgroundColor: control.backgroundColor,
    }).toStrictEqual({
      borderTopWidth: px(vars['border-width'].default),
      borderTopColor: computed('color', vars.color.border.default),
      borderTopLeftRadius: px(vars.radius.control),
      backgroundColor: computed('background-color', 'transparent'),
    });
    expect({
      color: value.color,
      fontFamily: value.fontFamily,
      fontSize: value.fontSize,
      fontVariantLigatures: value.fontVariantLigatures,
      textOverflow: value.textOverflow,
      whiteSpace: value.whiteSpace,
    }).toStrictEqual({
      color: computed('color', vars.color.fg.default),
      fontFamily: computed('font-family', vars.text.value.fontFamily),
      fontSize: computed('font-size', vars.text.value.fontSize),
      fontVariantLigatures: 'none',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    });
    expect({ color: label.color, fontSize: label.fontSize }).toStrictEqual({
      color: computed('color', vars.color.fg.default),
      fontSize: computed('font-size', vars.text.label.fontSize),
    });
    // A ghost trigger stays muted next to the value until it is hovered. If the pointer was over
    // it before `unhover`, its color takes the length of its transition to come back.
    await expect
      .poll(() => getComputedStyle(trigger.element()).color)
      .toBe(computed('color', vars.color.fg.muted));
  });

  it('takes the control height of its size, with a larger value, label and inset in lg', async () => {
    stubClipboard();
    const screen = await render(
      <>
        {sizes.map((size) => (
          <ShareLink key={size} size={size} />
        ))}
      </>,
    );
    const roots = [...screen.container.querySelectorAll<HTMLElement>('.contour-clipboard')];
    const roles = {
      sm: { height: 'control-sm', inset: 'control-inset', value: 'value', label: 'label' },
      md: { height: 'control-md', inset: 'control-inset', value: 'value', label: 'label' },
      lg: { height: 'control-lg', inset: 'control-inset-lg', value: 'code', label: 'label-lg' },
    } as const;

    expect(
      roots.map((root) => ({
        size: root.dataset['size'],
        trigger: part('trigger', root).dataset['size'],
        height: getComputedStyle(part('control', root)).blockSize,
        inset: getComputedStyle(part('control', root)).paddingInlineStart,
        value: getComputedStyle(part('value-text', root)).fontSize,
        label: getComputedStyle(part('label', root)).fontSize,
      })),
    ).toStrictEqual(
      sizes.map((size) => {
        const { height, inset, value, label } = roles[size];
        return {
          size,
          trigger: size,
          height: px(vars.size[height]),
          inset: px(vars.space[inset]),
          value: computed('font-size', vars.text[value].fontSize),
          label: computed('font-size', vars.text[label].fontSize),
        };
      }),
    );
  });

  it('fills the end of the row with the trigger, square when it shows only an icon', async () => {
    stubClipboard();
    const screen = await render(
      <>
        {sizes.map((size) => (
          <div key={size}>
            <InstallCommand size={size} />
            <ShareLink size={size} />
          </div>
        ))}
      </>,
    );
    const border = px(vars['border-width'].default);
    const iconSizes = { sm: 'icon-sm', md: 'icon-md', lg: 'icon-lg' } as const;

    for (const root of screen.container.querySelectorAll<HTMLElement>('.contour-clipboard')) {
      const control = part('control', root).getBoundingClientRect();
      const trigger = part('trigger', root).getBoundingClientRect();
      // Inside the border on three sides, at the end of the row.
      expect(`${trigger.top - control.top}px`).toBe(border);
      expect(`${control.bottom - trigger.bottom}px`).toBe(border);
      expect(`${control.right - trigger.right}px`).toBe(border);
      expect(getComputedStyle(part('control', root)).paddingInlineEnd).toBe('0px');
      expect(getComputedStyle(part('trigger', root)).borderTopRightRadius).toBe(
        computed('padding-top', `calc(${vars.radius.control} - ${vars['border-width'].default})`),
      );
    }
    for (const size of sizes) {
      const root = screen.getByRole('group', { name: 'Share link' }).nth(sizes.indexOf(size));
      const trigger = part('trigger', root.element());
      const box = trigger.getBoundingClientRect();
      expect(box.width).toBeCloseTo(box.height, 1);
      expect(getComputedStyle(part('indicator', root.element())).inlineSize).toBe(
        px(vars.size[iconSizes[size]]),
      );
    }
  });

  it('ends the value in an ellipsis when the row is narrow, and keeps the trigger whole', async () => {
    stubClipboard();
    const screen = await render(
      <div data-testid="row" style={{ display: 'flex', inlineSize: '10rem' }}>
        <InstallCommand />
      </div>,
    );
    const root = part('root');
    const control = part('control').getBoundingClientRect();
    const value = part('value-text');
    const trigger = part('trigger').getBoundingClientRect();

    expect(root.getBoundingClientRect().width).toBeLessThanOrEqual(
      screen.getByTestId('row').element().getBoundingClientRect().width,
    );
    expect(value.scrollWidth).toBeGreaterThan(value.clientWidth);
    expect(trigger.right).toBeLessThanOrEqual(control.right);
    expect(trigger.width).toBeGreaterThan(0);
  });

  it('draws the prompt before the value, out of its text and of the copy', async () => {
    const writeText = stubClipboard();
    const screen = await render(
      <>
        <InstallCommand />
        <Clipboard.Root value="npm i">
          <Clipboard.ValueText prompt="" data-testid="no-prompt" />
        </Clipboard.Root>
      </>,
    );
    const value = part('value-text');
    const prompt = getComputedStyle(value, '::before');

    expect(value).toHaveAttribute('data-prompt', '$');
    expect(value.textContent).toBe('pnpm add @contour-ui/react');
    expect(prompt.content).toContain('"$"');
    expect(prompt.color).toBe(computed('color', vars.color.fg.muted));
    await expect.element(screen.getByTestId('no-prompt')).not.toHaveAttribute('data-prompt');

    await userEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    expect(writeText).toHaveBeenCalledExactlyOnceWith('pnpm add @contour-ui/react');
  });

  it('shows a check mark and announces the copy until the timeout, under the same text and name', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const writeText = stubClipboard();
    const onStatusChange = vi.fn<(details: { copied: boolean }) => void>();
    const screen = await render(<InstallCommand timeout={1500} onStatusChange={onStatusChange} />);
    const trigger = screen.getByRole('button', { name: 'Copy to clipboard' });
    const status = screen.getByRole('status');

    expect(iconOf(trigger.element())).toBe(firstPath(copyIcon));
    await userEvent.click(trigger);
    expect(writeText).toHaveBeenCalledExactlyOnceWith('pnpm add @contour-ui/react');
    await expect.element(trigger).toHaveAttribute('data-copied', '');
    expect(iconOf(trigger.element())).toBe(firstPath(checkIcon));
    expect(trigger.element().textContent).toBe('Copy');
    await expect.element(status).toHaveTextContent('Copied to clipboard');
    await expect
      .element(screen.getByRole('button', { name: 'Copy to clipboard' }))
      .toBe(trigger.element());
    expect(onStatusChange.mock.calls).toStrictEqual([[{ copied: true }]]);

    vi.advanceTimersByTime(1500);
    await expect.element(trigger).not.toHaveAttribute('data-copied');
    expect(iconOf(trigger.element())).toBe(firstPath(copyIcon));
    await expect.element(status).toBeEmptyDOMElement();
  });

  it('shows text in a span indicator, and copied in its place while copied', async () => {
    stubClipboard();
    const screen = await render(
      <Clipboard.Root value="npm i">
        <Clipboard.Control>
          <Clipboard.ValueText />
          <Clipboard.Indicator copied="Copied" />
          <Clipboard.Trigger aria-label="Copy the command" />
        </Clipboard.Control>
      </Clipboard.Root>,
    );
    const indicator = part('indicator');

    expect(indicator.tagName).toBe('SPAN');
    expect(indicator).toHaveAttribute('aria-hidden', 'true');
    expect(indicator).toBeEmptyDOMElement();
    await userEvent.click(screen.getByRole('button', { name: 'Copy the command' }));
    await expect.poll(() => indicator.textContent).toBe('Copied');
  });

  it('turns the copy icon of an icon trigger into a check mark while copied', async () => {
    stubClipboard();
    const screen = await render(<ShareLink />);
    const trigger = screen.getByRole('button', { name: 'Copy the link' });

    expect(iconOf(trigger.element())).toBe(firstPath(copyIcon));
    await userEvent.click(trigger);
    await expect.element(trigger).toHaveAttribute('data-copied', '');
    expect(iconOf(trigger.element())).toBe(firstPath(checkIcon));
    await expect.element(screen.getByRole('status')).toHaveTextContent('Copied to clipboard');
  });

  it('pops the copied indicator in, and only fades it in under reduced motion', async () => {
    stubClipboard();
    const screen = await render(<InstallCommand />);
    const indicator = part('indicator');

    expect(getComputedStyle(indicator).animationName).toBe('none');
    await userEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    await expect
      .poll(() => getComputedStyle(indicator).animationName)
      .toBe('contour-clipboard-copied');

    await cdp().send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
    });
    await expect
      .poll(() => getComputedStyle(indicator).animationName)
      .toBe('contour-clipboard-copied-fade');
  });

  it('takes a variant and a size of its own, and passes props and the ref through', async () => {
    const writeText = stubClipboard();
    const ref = createRef<HTMLButtonElement>();
    const screen = await render(
      <Clipboard.Root value="npm i" size="lg" className="install">
        <Clipboard.Control>
          <Clipboard.ValueText />
          <Clipboard.Trigger
            ref={ref}
            variant="solid"
            size="sm"
            className="copy"
            aria-label="Copy the command"
            onClick={(event: MouseEvent) => {
              event.preventDefault();
            }}
          >
            Copy
          </Clipboard.Trigger>
        </Clipboard.Control>
      </Clipboard.Root>,
    );
    const trigger = screen.getByRole('button', { name: 'Copy the command' });

    expect(part('root')).toHaveClass('contour-clipboard install', { exact: true });
    await expect.element(trigger).toHaveAttribute('data-variant', 'solid');
    await expect.element(trigger).toHaveAttribute('data-size', 'sm');
    await expect.element(trigger).toHaveClass('copy');
    expect(ref.current).toBe(trigger.element());

    // The owner's handler runs first and cancels the copy.
    await userEvent.click(trigger);
    expect(writeText).not.toHaveBeenCalled();
  });
});
