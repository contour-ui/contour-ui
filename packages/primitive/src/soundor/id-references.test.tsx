/*
 * `aria-labelledby` and `aria-describedby` on a platform without ids (spike S3 of D30): the
 * element takes the text of the elements it points at as `accessibilityLabel` and
 * `accessibilityHint`, and the elements it points at are not read again on their own.
 */
import { act, render, screen } from '@soundor/testing-library/react';
import { useSyncExternalStore } from 'react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vite-plus/test';

import { Primitive } from './primitive.ts';
import type { PrimitiveProps } from './types.ts';

interface FieldProps {
  readonly labelledBy?: string;
  readonly describedBy?: string;
  readonly ariaLabel?: string;
  /** Rendered after the control. */
  readonly after?: ReactElement | null;
  /** Rendered before it. */
  readonly before?: ReactElement | null;
}

/** A slider of bare elements, pointing at others by id. */
function Field({ labelledBy, describedBy, ariaLabel, after = null, before = null }: FieldProps) {
  const slider: PrimitiveProps<'div'> = {
    role: 'slider',
    tabIndex: 0,
    'aria-valuemin': 0,
    'aria-valuemax': 10,
    'aria-valuenow': 5,
    'aria-labelledby': labelledBy,
    'aria-describedby': describedBy,
    'aria-label': ariaLabel,
  };
  return (
    <Primitive.div>
      {before}
      <Primitive.div {...slider} />
      {after}
    </Primitive.div>
  );
}

/** A text that changes from outside React, so that its element alone renders again. */
function createName(initial: string) {
  let name = initial;
  const listeners = new Set<() => void>();
  return {
    read: (): string => name,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    change: (next: string): void => {
      name = next;
      for (const listener of listeners) {
        listener();
      }
    },
  };
}

/** A label whose text comes from `name`. */
function Label({ name }: { readonly name: ReturnType<typeof createName> }): ReactElement {
  const text = useSyncExternalStore(name.subscribe, name.read);
  return <Primitive.text id="l">{text}</Primitive.text>;
}

const slider = () => screen.getByRole('adjustable');

describe('id references on Soundor', () => {
  it('takes the text of a label that renders after the control', async () => {
    await render(
      <Field
        labelledBy="gain-label"
        after={<Primitive.span id="gain-label">Gain</Primitive.span>}
      />,
    );
    expect(screen.getByRole('adjustable', { name: 'Gain' }).accessibility.label).toBe('Gain');
  });

  it('follows the text of the label as it changes', async () => {
    const { rerender } = await render(
      <Field labelledBy="l" before={<Primitive.span id="l">Gain</Primitive.span>} />,
    );
    expect(slider().accessibility.label).toBe('Gain');
    await rerender(<Field labelledBy="l" before={<Primitive.span id="l">Drive</Primitive.span>} />);
    expect(slider().accessibility.label).toBe('Drive');
  });

  it('follows a label that renders again on its own', async () => {
    const name = createName('Gain');
    await render(<Field labelledBy="l" before={<Label name={name} />} />);
    expect(slider().accessibility.label).toBe('Gain');
    // Only the label renders again: the control hears of it through the registry.
    await act(() => {
      name.change('Drive');
    });
    expect(slider().accessibility.label).toBe('Drive');
  });

  it('joins the texts of two ids in their order', async () => {
    await render(
      <Field
        labelledBy="b a"
        before={
          <>
            <Primitive.span id="a">Cut</Primitive.span>
            <Primitive.span id="b">Low</Primitive.span>
          </>
        }
      />,
    );
    expect(screen.getByRole('adjustable', { name: 'Low Cut' })).toBeDefined();
  });

  it('loses the name when the label unmounts, and falls back to aria-label', async () => {
    const label = <Primitive.span id="l">Gain</Primitive.span>;
    const { rerender } = await render(<Field labelledBy="l" ariaLabel="Fallback" before={label} />);
    expect(slider().accessibility.label).toBe('Gain');
    await rerender(<Field labelledBy="l" ariaLabel="Fallback" />);
    expect(slider().accessibility.label).toBe('Fallback');
    await rerender(<Field labelledBy="l" />);
    expect(slider().accessibility.label).toBeUndefined();
  });

  it('takes the text aria-describedby points at as its hint', async () => {
    const { rerender } = await render(
      <Field
        labelledBy="l"
        describedBy="d"
        before={<Primitive.span id="l">Gain</Primitive.span>}
        after={<Primitive.text id="d">Boosts the input</Primitive.text>}
      />,
    );
    expect(slider().accessibility.hint).toBe('Boosts the input');
    await rerender(
      <Field
        labelledBy="l"
        describedBy="d"
        before={<Primitive.span id="l">Gain</Primitive.span>}
      />,
    );
    expect(slider().accessibility.hint).toBeUndefined();
  });

  it('reads the text of a label made of several elements, joined with spaces', async () => {
    await render(
      <Field
        labelledBy="l"
        after={
          <Primitive.div id="l">
            <Primitive.span>Output</Primitive.span>
            <Primitive.text>gain</Primitive.text>
          </Primitive.div>
        }
      />,
    );
    // The web joins the text of inline elements as it is ("Outputgain"); the registry joins
    // the texts of the nodes with spaces, as accname does for blocks.
    expect(slider().accessibility.label).toBe('Output gain');
  });

  it('reads the elements it points at with the control, not again on their own', async () => {
    const { rerender } = await render(
      <Field
        labelledBy="l"
        describedBy="d"
        before={<Primitive.span id="l">Gain</Primitive.span>}
        after={<Primitive.text id="d">Boosts the input</Primitive.text>}
      />,
    );
    expect(screen.getByText('Gain').accessibility.accessible).toBe(false);
    expect(screen.queryByRole('text', { name: 'Gain' })).toBeNull();
    expect(screen.queryByRole('text', { name: 'Boosts the input' })).toBeNull();
    // Pointed at no more, the text is read on its own again.
    await rerender(
      <Field
        before={<Primitive.span id="l">Gain</Primitive.span>}
        after={<Primitive.text id="d">Boosts the input</Primitive.text>}
      />,
    );
    expect(screen.getByRole('text', { name: 'Gain' })).toBeDefined();
    expect(screen.getByRole('text', { name: 'Boosts the input' })).toBeDefined();
  });

  it('keeps an element with a role of its own that names another', async () => {
    const dialog: PrimitiveProps<'div'> = { role: 'dialog', 'aria-labelledby': 'title' };
    const title: PrimitiveProps<'text'> = { id: 'title', role: 'heading' };
    await render(
      <Primitive.div {...dialog}>
        <Primitive.text {...title}>Settings</Primitive.text>
      </Primitive.div>,
    );
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeDefined();
    expect(screen.getByRole('header', { name: 'Settings' })).toBeDefined();
  });
});
