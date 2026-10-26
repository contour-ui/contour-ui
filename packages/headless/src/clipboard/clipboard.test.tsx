import type { clipboard } from '@contour-ui/core';
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
  });
});
