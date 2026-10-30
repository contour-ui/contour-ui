import { vars } from '@contour-ui/tokens';
import type { CSSProperties, ReactElement } from 'react';
import { beforeEach, vi } from 'vite-plus/test';
import { page, userEvent } from 'vite-plus/test/browser';

import { Button, Clipboard } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

/**
 * Stands in for `navigator.clipboard.writeText`: the states never touch the real clipboard, whose
 * permissions a test browser does not grant.
 */
const writeText = (_text: string): Promise<void> => Promise.resolve();

/** How long a copied state shows its check mark: past the screenshot, however slow the run. */
const COPIED_FOR = 60_000;

beforeEach(() => {
  // An own property hides the browser's getter on `Navigator.prototype` until the cleanup.
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  return () => {
    Reflect.deleteProperty(navigator, 'clipboard');
  };
});

/**
 * Copies as the story's play did, from the keyboard: its click focused the trigger with a ring.
 * Resolves once the trigger shows the copy.
 */
async function copy(): Promise<void> {
  await userEvent.tab();
  await userEvent.keyboard('{Enter}');
  await vi.waitFor(() => {
    const trigger = document.activeElement;
    if (!(trigger instanceof HTMLElement) || trigger.dataset['copied'] === undefined) {
      throw new Error('The trigger shows no copy yet.');
    }
  });
}

const sizes = ['sm', 'md', 'lg'] as const satisfies ReadonlyArray<Clipboard.RootProps['size']>;

const caption: CSSProperties = {
  font: vars.text.caption.font,
  letterSpacing: vars.text.caption.letterSpacing,
  color: vars.color.fg.muted,
};

const INSTALL = 'pnpm add @contour-ui/react';
const LINK = 'https://contour-ui.dev/docs/essentials/clipboard';

/** An install command: a `$` prompt, the command, and a trigger with an icon and "Copy". */
function InstallCommand(props: Clipboard.RootProps): ReactElement {
  return (
    <Clipboard.Root value={INSTALL} {...props}>
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

/** One row of the grid: every kind of trigger in one size. */
function SizeRow({ size }: { readonly size: (typeof sizes)[number] }): ReactElement {
  return (
    <>
      <span style={caption}>{size}</span>
      <InstallCommand size={size} />
      <Clipboard.Root size={size} value="https://contour-ui.dev">
        <Clipboard.Control>
          <Clipboard.ValueText />
          <Clipboard.Trigger aria-label={`Copy the link ${size}`} />
        </Clipboard.Control>
      </Clipboard.Root>
      <Clipboard.Root size={size} value="bun add">
        <Clipboard.Control>
          <Clipboard.ValueText />
          <Clipboard.Trigger variant="subtle">
            <Clipboard.Indicator />
            Copy
          </Clipboard.Trigger>
        </Clipboard.Control>
      </Clipboard.Root>
      <Clipboard.Root size={size} value="yarn add">
        <Clipboard.Control>
          <Clipboard.ValueText />
          <Clipboard.Trigger variant="solid">
            <Clipboard.Indicator />
            Copy
          </Clipboard.Trigger>
        </Clipboard.Control>
      </Clipboard.Root>
      <Clipboard.Root size={size} value="sk-live-4f9a2c">
        <Clipboard.Label>API key</Clipboard.Label>
        <Clipboard.Control>
          <Clipboard.ValueText />
          <Clipboard.Trigger aria-label={`Copy the key ${size}`} />
        </Clipboard.Control>
      </Clipboard.Root>
    </>
  );
}

visualStates({
  // An install command, copied: the copy icon of the trigger turns into a check mark, its text
  // and its name stay, and screen readers hear "Copied to clipboard", which axe checks too.
  default: {
    render: () => <InstallCommand timeout={COPIED_FOR} />,
    ready: copy,
    focused: () => page.getByRole('button', { name: 'Copy to clipboard' }),
  },
  // A label above the control, which names the group, and a trigger without children: a square
  // icon button whose copy icon turns into a check mark, as it does here once copied.
  'label-and-icon': {
    render: () => (
      <Clipboard.Root value={LINK} timeout={COPIED_FOR} style={{ inlineSize: '25rem' }}>
        <Clipboard.Label>Share link</Clipboard.Label>
        <Clipboard.Control>
          <Clipboard.ValueText />
          <Clipboard.Trigger aria-label="Copy the link" />
        </Clipboard.Control>
      </Clipboard.Root>
    ),
    ready: copy,
    focused: () => page.getByRole('button', { name: 'Copy the link' }),
  },
  // Every size with a ghost trigger (the default) that shows an icon and "Copy", an icon trigger,
  // a `subtle` and a `solid` trigger, and a label above the control.
  variants: {
    render: () => (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, max-content)',
          alignItems: 'end',
          justifyItems: 'start',
          gap: vars.space['group-gap'],
        }}
      >
        {sizes.map((size) => (
          <SizeRow key={size} size={size} />
        ))}
      </div>
    ),
  },
  // In a narrow container, the value ends in an ellipsis and the trigger stays whole; copied.
  narrow: {
    render: () => (
      <div style={{ display: 'flex', inlineSize: '12rem' }}>
        <InstallCommand timeout={COPIED_FOR} />
      </div>
    ),
    ready: copy,
    focused: () => page.getByRole('button', { name: 'Copy to clipboard' }),
  },
  // In a row with a button of the same size: the control is as high as the button.
  'beside-a-button': {
    render: () => (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: vars.space['group-gap'],
        }}
      >
        <Button size="lg">Get started</Button>
        <InstallCommand
          value="pnpm add @contour-ui/react"
          size="lg"
          timeout={1500}
          aria-label="Install"
        />
      </div>
    ),
  },
});
