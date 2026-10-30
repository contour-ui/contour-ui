import type { clipboard } from '@contour-ui/core';
import { expectNoAxeViolations } from '@contour-ui/vite-config/visual';
import { useState } from 'react';
import type { MouseEvent, ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Clipboard, useClipboardContext } from '../index.ts';

type WriteText = (text: string) => Promise<void>;

/**
 * Replace `navigator.clipboard` for one test: the real one needs permissions that headless
 * Chromium does not grant. `undefined` removes it, as on a page served over plain http.
 */
function replaceClipboard(writeText: WriteText | undefined): void {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: writeText === undefined ? undefined : { writeText },
  });
}

/** A clipboard that takes every write. */
function acceptingClipboard() {
  const writeText = vi.fn<WriteText>().mockResolvedValue(undefined);
  replaceClipboard(writeText);
  return writeText;
}

const statusSpy = () => vi.fn<(details: clipboard.StatusChangeDetails) => void>();

/** A value to copy, a trigger with an indicator inside. */
function CopyCommand(props: Clipboard.RootProps): ReactElement {
  return (
    <Clipboard.Root {...props}>
      <code>{props.value ?? props.defaultValue}</code>
      <Clipboard.Trigger>
        <Clipboard.Indicator copied="Copied">Copy</Clipboard.Indicator>
      </Clipboard.Trigger>
    </Clipboard.Root>
  );
}

/** A button of its own inside a root that sets the value of the clipboard. */
function SetValue({ value }: { readonly value: string }): ReactElement {
  const api = useClipboardContext();
  return (
    <button
      type="button"
      onClick={() => {
        api.setValue(value);
      }}
    >
      {`Set ${value}`}
    </button>
  );
}

/** The element of a clipboard part. */
function part(container: HTMLElement, name: string): HTMLElement {
  const element = container.querySelector<HTMLElement>(
    `[data-scope="clipboard"][data-part="${name}"]`,
  );
  if (element === null) {
    throw new Error(`No clipboard ${name}.`);
  }
  return element;
}

afterEach(() => {
  // The own property hid the browser's getter on `Navigator.prototype`.
  Reflect.deleteProperty(navigator, 'clipboard');
  vi.useRealTimers();
});

describe('Clipboard', () => {
  it('renders its parts with their attributes, and an empty status', async () => {
    acceptingClipboard();
    const screen = await render(<CopyCommand value="npm i" />);
    const trigger = screen.getByRole('button', { name: 'Copy to clipboard' });

    await expect.element(trigger).toHaveAttribute('type', 'button');
    await expect.element(trigger).toHaveAttribute('data-part', 'trigger');
    await expect.element(screen.getByText('Copy')).toHaveAttribute('data-part', 'indicator');
    for (const name of ['root', 'trigger', 'indicator']) {
      expect(part(screen.container, name)).not.toHaveAttribute('data-copied');
    }
    await expect.element(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('writes the value on click and shows the copied state until the timeout', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const writeText = acceptingClipboard();
    const onStatusChange = statusSpy();
    const screen = await render(
      <CopyCommand value="npm i" timeout={1000} onStatusChange={onStatusChange} />,
    );
    const trigger = screen.getByRole('button', { name: 'Copy to clipboard' });

    await userEvent.click(trigger);
    expect(writeText).toHaveBeenCalledExactlyOnceWith('npm i');
    await expect.element(trigger).toHaveTextContent('Copied');
    for (const name of ['root', 'trigger', 'indicator']) {
      expect(part(screen.container, name)).toHaveAttribute('data-copied', '');
    }
    await expect.element(screen.getByRole('status')).toHaveTextContent('Copied to clipboard');
    expect(onStatusChange.mock.calls).toStrictEqual([[{ copied: true }]]);

    vi.advanceTimersByTime(999);
    await expect.element(trigger).toHaveAttribute('data-copied');
    vi.advanceTimersByTime(1);
    await expect.element(trigger).not.toHaveAttribute('data-copied');
    await expect.element(trigger).toHaveTextContent('Copy');
    await expect.element(screen.getByRole('status')).toBeEmptyDOMElement();
    expect(onStatusChange.mock.calls).toStrictEqual([[{ copied: true }], [{ copied: false }]]);
  });

  it('shows and announces nothing until the browser has written the value', async () => {
    const pendingWrite: { finish?: () => void } = {};
    const writeText = vi.fn<WriteText>(
      () =>
        new Promise((resolve) => {
          pendingWrite.finish = () => {
            resolve();
          };
        }),
    );
    replaceClipboard(writeText);
    const screen = await render(<CopyCommand value="npm i" />);
    const trigger = screen.getByRole('button', { name: 'Copy to clipboard' });

    await userEvent.click(trigger);
    // A click while the write is pending does nothing.
    await userEvent.click(trigger);
    expect(writeText).toHaveBeenCalledOnce();
    await expect.element(trigger).not.toHaveAttribute('data-copied');
    await expect.element(screen.getByRole('status')).toBeEmptyDOMElement();

    pendingWrite.finish?.();
    await expect.element(trigger).toHaveAttribute('data-copied');
    await expect.element(screen.getByRole('status')).toHaveTextContent('Copied to clipboard');
  });

  it('stays idle and reports nothing when the browser refuses the write', async () => {
    const writeText = vi
      .fn<WriteText>()
      .mockRejectedValue(new DOMException('Write permission denied.', 'NotAllowedError'));
    replaceClipboard(writeText);
    const onStatusChange = statusSpy();
    const screen = await render(<CopyCommand value="npm i" onStatusChange={onStatusChange} />);
    const trigger = screen.getByRole('button', { name: 'Copy to clipboard' });

    await userEvent.click(trigger);
    // Back to idle, not waiting for the write: the next click writes again.
    await userEvent.click(trigger);
    expect(writeText).toHaveBeenCalledTimes(2);
    expect(onStatusChange).not.toHaveBeenCalled();
    await expect.element(trigger).not.toHaveAttribute('data-copied');
    await expect.element(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('ends the copied state when a later write is refused', async () => {
    const writeText = vi
      .fn<WriteText>()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new DOMException('Write permission denied.', 'NotAllowedError'));
    replaceClipboard(writeText);
    const onStatusChange = statusSpy();
    const screen = await render(<CopyCommand value="npm i" onStatusChange={onStatusChange} />);
    const trigger = screen.getByRole('button', { name: 'Copy to clipboard' });

    await userEvent.click(trigger);
    await expect.element(trigger).toHaveAttribute('data-copied');
    await userEvent.click(trigger);
    await expect.element(trigger).not.toHaveAttribute('data-copied');
    expect(onStatusChange.mock.calls).toStrictEqual([[{ copied: true }], [{ copied: false }]]);
  });

  it('stays idle on a page without the Clipboard API', async () => {
    replaceClipboard(undefined);
    const onStatusChange = statusSpy();
    const screen = await render(<CopyCommand value="npm i" onStatusChange={onStatusChange} />);
    const trigger = screen.getByRole('button', { name: 'Copy to clipboard' });

    await userEvent.click(trigger);
    expect(onStatusChange).not.toHaveBeenCalled();
    await expect.element(trigger).not.toHaveAttribute('data-copied');
    await expect.element(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('copies its own value, read once from defaultValue', async () => {
    const writeText = acceptingClipboard();
    const screen = await render(<CopyCommand defaultValue="npm i" />);
    await userEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    await screen.rerender(<CopyCommand defaultValue="pnpm add" />);
    await userEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));

    expect(writeText.mock.calls).toStrictEqual([['npm i'], ['npm i']]);
  });

  it('copies the controlled value as the owner changes it', async () => {
    const writeText = acceptingClipboard();
    const screen = await render(<CopyCommand value="npm i" />);
    await userEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    await screen.rerender(<CopyCommand value="pnpm add" />);
    await userEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));

    expect(writeText.mock.calls).toStrictEqual([['npm i'], ['pnpm add']]);
  });

  it('reports setValue through onValueChange and keeps the controlled value', async () => {
    const writeText = acceptingClipboard();
    const onValueChange = vi.fn<(details: clipboard.ValueChangeDetails) => void>();
    const screen = await render(
      <Clipboard.Root value="npm i" onValueChange={onValueChange}>
        <SetValue value="pnpm add" />
        <Clipboard.Trigger />
      </Clipboard.Root>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Set pnpm add' }));
    expect(onValueChange.mock.calls).toStrictEqual([[{ value: 'pnpm add' }]]);
    await userEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    expect(writeText).toHaveBeenCalledExactlyOnceWith('npm i');
  });

  it('takes an aria-label for the trigger and a message for the status', async () => {
    acceptingClipboard();
    const screen = await render(
      <Clipboard.Root value="npm i" copiedMessage="Command copied">
        <Clipboard.Trigger aria-label="Copy the command">Copy</Clipboard.Trigger>
      </Clipboard.Root>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Copy the command' }));
    await expect.element(screen.getByRole('status')).toHaveTextContent('Command copied');
  });

  it('does not copy when a click handler prevents the default', async () => {
    const writeText = acceptingClipboard();
    const screen = await render(
      <Clipboard.Root value="npm i">
        <Clipboard.Trigger
          onClick={(event: MouseEvent) => {
            event.preventDefault();
          }}
        />
      </Clipboard.Root>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    expect(writeText).not.toHaveBeenCalled();
    await expect.element(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('renders the status next to a root rendered asChild', async () => {
    acceptingClipboard();
    const screen = await render(
      <Clipboard.Root asChild value="npm i">
        <section aria-label="Install">
          <Clipboard.Trigger />
        </section>
      </Clipboard.Root>,
    );
    const section = screen.getByRole('region', { name: 'Install' });

    await expect.element(section).toHaveAttribute('data-part', 'root');
    expect(section.element().nextElementSibling).toBe(screen.getByRole('status').element());
  });

  it('throws when a part is rendered outside of a root', () => {
    expect(() => renderToStaticMarkup(<Clipboard.Trigger />)).toThrow(
      'Clipboard: render the parts inside <Clipboard.Root>.',
    );
    expect(() => renderToStaticMarkup(<Clipboard.ValueText />)).toThrow(
      'Clipboard: render the parts inside <Clipboard.Root>.',
    );
  });
});

/** A labeled value in a control: the anatomy a styled clipboard renders. */
function InstallBox({
  label = 'Install',
  ...props
}: Clipboard.RootProps & { readonly label?: string | null }): ReactElement {
  return (
    <Clipboard.Root {...props}>
      {label === null ? null : <Clipboard.Label>{label}</Clipboard.Label>}
      <Clipboard.Control>
        <Clipboard.ValueText />
        <Clipboard.Trigger>
          <Clipboard.Indicator copied="Copied">Copy</Clipboard.Indicator>
        </Clipboard.Trigger>
      </Clipboard.Control>
    </Clipboard.Root>
  );
}

describe('Clipboard label, control and value text', () => {
  it('renders each part as its element, the value in the value text', async () => {
    acceptingClipboard();
    const screen = await render(<InstallBox value="npm i" />);

    expect(part(screen.container, 'label').tagName).toBe('SPAN');
    expect(part(screen.container, 'control').tagName).toBe('DIV');
    expect(part(screen.container, 'control')).not.toHaveAttribute('role');
    expect(part(screen.container, 'value-text').tagName).toBe('SPAN');
    expect(part(screen.container, 'value-text').textContent).toBe('npm i');
    // The control renders its children in place: the value text sits right inside it.
    expect(part(screen.container, 'value-text').parentElement).toBe(
      part(screen.container, 'control'),
    );
    for (const name of ['label', 'control', 'value-text']) {
      expect(part(screen.container, name)).not.toHaveAttribute('data-copied');
    }
  });

  it('makes the root a group named by the label while one is mounted', async () => {
    acceptingClipboard();
    const screen = await render(<InstallBox value="npm i" />);
    const group = screen.getByRole('group', { name: 'Install' });
    const label = part(screen.container, 'label');

    await expect.element(group).toHaveAttribute('data-part', 'root');
    expect(label.id).not.toBe('');
    await expect.element(group).toHaveAttribute('aria-labelledby', label.id);

    await screen.rerender(<InstallBox value="npm i" label={null} />);
    const root = part(screen.container, 'root');
    expect(root).not.toHaveAttribute('role');
    expect(root).not.toHaveAttribute('aria-labelledby');
  });

  it('follows an id given to the label', async () => {
    acceptingClipboard();
    const screen = await render(
      <Clipboard.Root value="npm i">
        <Clipboard.Label id="install-label">Install</Clipboard.Label>
        <Clipboard.Trigger />
      </Clipboard.Root>,
    );

    await expect
      .element(screen.getByRole('group', { name: 'Install' }))
      .toHaveAttribute('aria-labelledby', 'install-label');
  });

  it('makes a root the owner names a group, and leaves an unnamed one without a role', async () => {
    acceptingClipboard();
    const screen = await render(
      <>
        <Clipboard.Root value="npm i" aria-label="Install">
          <Clipboard.Trigger />
        </Clipboard.Root>
        <Clipboard.Root value="pnpm add" data-testid="unnamed">
          <Clipboard.Trigger />
        </Clipboard.Root>
      </>,
    );

    await expect
      .element(screen.getByRole('group', { name: 'Install' }))
      .toHaveAttribute('data-part', 'root');
    await expect.element(screen.getByTestId('unnamed')).not.toHaveAttribute('role');
  });

  it('shows the value as it changes', async () => {
    acceptingClipboard();
    const screen = await render(
      <Clipboard.Root defaultValue="npm i">
        <Clipboard.ValueText />
        <SetValue value="pnpm add" />
      </Clipboard.Root>,
    );
    const valueText = part(screen.container, 'value-text');

    expect(valueText.textContent).toBe('npm i');
    await userEvent.click(screen.getByRole('button', { name: 'Set pnpm add' }));
    await expect.poll(() => valueText.textContent).toBe('pnpm add');

    await screen.rerender(<InstallBox value="yarn add" />);
    expect(part(screen.container, 'value-text').textContent).toBe('yarn add');
    await screen.rerender(<InstallBox value="bun add" />);
    expect(part(screen.container, 'value-text').textContent).toBe('bun add');
  });

  it('shows its children in place of the value, or renders its child with asChild', async () => {
    acceptingClipboard();
    const screen = await render(
      <Clipboard.Root value="pnpm add @contour-ui/headless-react">
        <Clipboard.ValueText>
          pnpm add <b>@contour-ui/headless-react</b>
        </Clipboard.ValueText>
        <Clipboard.ValueText asChild>
          <code>pnpm add @contour-ui/headless-react</code>
        </Clipboard.ValueText>
      </Clipboard.Root>,
    );
    const [marked, code] = screen.container.querySelectorAll('[data-part="value-text"]');

    expect(marked?.querySelector('b')).toHaveTextContent('@contour-ui/headless-react');
    expect(code?.tagName).toBe('CODE');
    expect(code?.textContent).toBe('pnpm add @contour-ui/headless-react');
  });

  it('gives the label, the control and the value text the copied state', async () => {
    acceptingClipboard();
    const screen = await render(<InstallBox value="npm i" />);

    await userEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    await expect.element(screen.getByRole('status')).toHaveTextContent('Copied to clipboard');
    for (const name of ['root', 'label', 'control', 'value-text', 'trigger', 'indicator']) {
      expect(part(screen.container, name)).toHaveAttribute('data-copied', '');
    }
  });
});

/** The props of the icons of the examples, hidden from assistive technology. */
const glyph = {
  'aria-hidden': true,
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Two squares, drawn for the examples: Headless has no icons. */
function CopyGlyph(): ReactElement {
  return (
    <svg {...glyph} data-glyph="copy">
      <rect x="5" y="5" width="8" height="8" rx="1.5" />
      <path d="M3 11V4.5A1.5 1.5 0 0 1 4.5 3H11" />
    </svg>
  );
}

/** A check mark, drawn for the examples. */
function CheckGlyph(): ReactElement {
  return (
    <svg {...glyph} data-glyph="check">
      <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
    </svg>
  );
}

const commands = new Map([
  ['npm', 'npm install @contour-ui/headless-react'],
  ['pnpm', 'pnpm add @contour-ui/headless-react'],
  ['yarn', 'yarn add @contour-ui/headless-react'],
  ['bun', 'bun add @contour-ui/headless-react'],
]);

/** The owner keeps the command in its state and passes it as `value`. */
function InstallCommand(): ReactElement {
  const [manager, setManager] = useState('npm');
  const command = commands.get(manager) ?? '';
  return (
    <Clipboard.Root value={command} timeout={1000}>
      <label>
        Package manager{' '}
        <select
          value={manager}
          onChange={(event) => {
            setManager(event.target.value);
          }}
        >
          {[...commands.keys()].map((name) => (
            <option key={name}>{name}</option>
          ))}
        </select>
      </label>{' '}
      <code>{command}</code> <Clipboard.Trigger>Copy</Clipboard.Trigger>
    </Clipboard.Root>
  );
}

describe('Clipboard accessibility', () => {
  it('has no axe violations: Default', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    acceptingClipboard();
    const value = 'pnpm add @contour-ui/headless-react';
    const screen = await render(
      <Clipboard.Root value={value} timeout={1000}>
        <code>{value}</code> <Clipboard.Trigger>Copy</Clipboard.Trigger>{' '}
        <Clipboard.Indicator copied="Copied" />
      </Clipboard.Root>,
    );
    const trigger = screen.getByRole('button', { name: 'Copy to clipboard' });

    // A copy, then the end of the copied state: the indicator next to the trigger is empty again.
    await userEvent.click(trigger);
    await expect.element(trigger).toHaveAttribute('data-copied');
    vi.advanceTimersByTime(1000);
    await expect.element(trigger).not.toHaveAttribute('data-copied');
    vi.useRealTimers();
    await expectNoAxeViolations();
  });

  it('has no axe violations: Anatomy', async () => {
    acceptingClipboard();
    const screen = await render(
      <Clipboard.Root value="pnpm add @contour-ui/headless-react">
        <Clipboard.Label>Install command</Clipboard.Label>
        <Clipboard.Control style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Clipboard.ValueText style={{ fontFamily: 'monospace' }} />
          <Clipboard.Trigger>Copy</Clipboard.Trigger>
          <Clipboard.Indicator copied="Copied" />
        </Clipboard.Control>
      </Clipboard.Root>,
    );

    // In the copied state, every part shows it.
    await userEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    await expect
      .element(screen.getByRole('group', { name: 'Install command' }))
      .toHaveAttribute('data-copied');
    await expectNoAxeViolations();
  });

  it('has no axe violations: WithIcons', async () => {
    acceptingClipboard();
    const value = 'npm install @contour-ui/headless-react';
    const screen = await render(
      <Clipboard.Root value={value}>
        <code>{value}</code>{' '}
        <Clipboard.Trigger>
          <Clipboard.Indicator copied={<CheckGlyph />}>
            <CopyGlyph />
          </Clipboard.Indicator>
        </Clipboard.Trigger>
      </Clipboard.Root>,
    );
    const trigger = screen.getByRole('button', { name: 'Copy to clipboard' });

    // In the copied state: the trigger, with only an icon, shows the check mark.
    await userEvent.click(trigger);
    await expect.poll(() => trigger.element().querySelector('svg')?.dataset['glyph']).toBe('check');
    await expectNoAxeViolations();
  });

  it('has no axe violations: Controlled', async () => {
    const writeText = acceptingClipboard();
    const screen = await render(<InstallCommand />);

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Package manager' }),
      'pnpm',
    );
    await userEvent.click(screen.getByRole('button', { name: 'Copy to clipboard' }));
    expect(writeText.mock.calls).toStrictEqual([['pnpm add @contour-ui/headless-react']]);
    await expect
      .element(screen.getByRole('button', { name: 'Copy to clipboard' }))
      .toHaveAttribute('data-copied');
    await expectNoAxeViolations();
  });
});
