import { describe, expect, it, vi } from 'vite-plus/test';

import { mergeProps } from './merge-props.ts';

describe('mergeProps', () => {
  it('lets the last source win for plain props', () => {
    expect(mergeProps({ id: 'part', title: 'Part' }, { id: 'user' })).toStrictEqual({
      id: 'user',
      title: 'Part',
    });
  });

  it('ignores undefined values', () => {
    expect(
      mergeProps({ id: 'part', className: 'part' }, { id: undefined, className: undefined }),
    ).toStrictEqual({
      id: 'part',
      className: 'part',
    });
  });

  it('joins class names in source order', () => {
    expect(mergeProps({ className: 'a' }, { className: 'b' }, { className: 'c' })).toStrictEqual({
      className: 'a b c',
    });
    expect(mergeProps({ className: 'a' }, { className: '' })).toStrictEqual({ className: 'a' });
    expect(mergeProps({ className: '' }, { className: 'b' })).toStrictEqual({ className: 'b' });
  });

  it('merges styles per property, the last source winning', () => {
    const part = { color: 'red', margin: 0 };
    const user = { color: 'blue', padding: 4 };

    expect(mergeProps({ style: part }, { style: user })).toStrictEqual({
      style: { color: 'blue', margin: 0, padding: 4 },
    });
    expect(part).toStrictEqual({ color: 'red', margin: 0 });
  });

  it('calls every handler with the same arguments, the last source first', () => {
    const calls: string[] = [];
    const merged = mergeProps(
      {
        onClick: (value: number) => {
          calls.push(`part ${value}`);
        },
      },
      {
        onClick: (value: number) => {
          calls.push(`styled ${value}`);
        },
      },
      {
        onClick: (value: number) => {
          calls.push(`user ${value}`);
        },
      },
    );

    merged.onClick(1);

    expect(calls).toStrictEqual(['user 1', 'styled 1', 'part 1']);
  });

  it('still calls earlier handlers after one prevented the default', () => {
    const event = new Event('click', { cancelable: true });
    const builtIn = vi.fn<(event: Event) => void>();
    const merged = mergeProps(
      { onClick: builtIn },
      {
        onClick: (clicked: Event) => {
          clicked.preventDefault();
        },
      },
    );

    merged.onClick(event);

    expect(event.defaultPrevented).toBe(true);
    expect(builtIn).toHaveBeenCalledExactlyOnceWith(event);
  });

  it('chains only `on` + uppercase keys', () => {
    const part = vi.fn<() => void>();
    const user = vi.fn<() => void>();

    expect(mergeProps({ render: part }, { render: user })).toStrictEqual({ render: user });
    expect(mergeProps({ once: part }, { once: user })).toStrictEqual({ once: user });
  });
});
