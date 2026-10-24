import { createRef, StrictMode } from 'react';
import type { ReactElement } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { render, renderHook } from 'vitest-browser-react';

import { composeRefs, useComposedRefs } from './compose-refs.ts';

describe('composeRefs', () => {
  it('lets React attach and detach every ref', async () => {
    const objectRef = createRef<HTMLDivElement>();
    const calls: Array<HTMLDivElement | null> = [];
    const plainRef = (node: HTMLDivElement | null): void => {
      calls.push(node);
    };
    const cleanup = vi.fn<() => void>();
    const refWithCleanup = vi.fn<(node: HTMLDivElement | null) => () => void>(() => cleanup);

    const screen = await render(
      <div ref={composeRefs(objectRef, plainRef, refWithCleanup, null, undefined)}>content</div>,
    );
    const node = screen.getByText('content').element();

    expect(objectRef.current).toBe(node);
    expect(calls).toStrictEqual([node]);
    expect(refWithCleanup).toHaveBeenCalledExactlyOnceWith(node);

    await screen.unmount();

    expect(objectRef.current).toBeNull();
    expect(calls).toStrictEqual([node, null]);
    expect(cleanup).toHaveBeenCalledOnce();
    // A callback ref that returned a cleanup is never called with `null`.
    expect(refWithCleanup).toHaveBeenCalledOnce();
  });

  it('survives the extra attach and detach of Strict Mode', async () => {
    const objectRef = createRef<HTMLDivElement>();
    const cleanup = vi.fn<() => void>();
    const refWithCleanup = vi.fn<(node: HTMLDivElement | null) => () => void>(() => cleanup);

    const screen = await render(<div ref={composeRefs(objectRef, refWithCleanup)}>content</div>, {
      wrapper: StrictMode,
    });
    const node = screen.getByText('content').element();

    // Attach, detach, attach again.
    expect(refWithCleanup.mock.calls).toStrictEqual([[node], [node]]);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(objectRef.current).toBe(node);
  });
});

describe('useComposedRefs', () => {
  it('keeps the combined ref while both refs stay the same', async () => {
    const objectRef = createRef<HTMLDivElement>();
    const callbackRef = vi.fn<(node: HTMLDivElement | null) => void>();

    function Box({ label }: { readonly label: string }): ReactElement {
      return <div ref={useComposedRefs(objectRef, callbackRef)}>{label}</div>;
    }

    const screen = await render(<Box label="first" />);
    await screen.rerender(<Box label="second" />);
    const node = screen.getByText('second').element();

    expect(objectRef.current).toBe(node);
    expect(callbackRef).toHaveBeenCalledExactlyOnceWith(node);
  });

  it('returns the only ref as is', async () => {
    const objectRef = createRef<HTMLDivElement>();
    const { result } = await renderHook(() => useComposedRefs(objectRef, undefined));

    expect(result.current).toBe(objectRef);
  });
});
