import { describe, expect, it } from 'vite-plus/test';

import type { KeyLike } from './key-like.ts';
import { getListIntent } from './list-navigation.ts';
import type { ListIntent, ListNavigationOptions } from './list-navigation.ts';

/** A key press, with the modifiers given and no others. */
function press(key: string, modifiers: Partial<Omit<KeyLike, 'key'>> = {}): KeyLike {
  return { key, shiftKey: false, ctrlKey: false, metaKey: false, altKey: false, ...modifiers };
}

const KEYS = [
  'ArrowDown',
  'ArrowUp',
  'ArrowRight',
  'ArrowLeft',
  'Home',
  'End',
  'PageDown',
  'Enter',
  ' ',
  'a',
] as const;

type Key = (typeof KEYS)[number];

/** The intent of every key in a list laid out by `options`. */
function intents(
  options?: ListNavigationOptions,
  modifiers?: Partial<Omit<KeyLike, 'key'>>,
): Record<Key, ListIntent | null> {
  // Built from every key of `KEYS`.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return Object.fromEntries(
    KEYS.map((key) => [key, getListIntent(press(key, modifiers), options)]),
  ) as Record<Key, ListIntent | null>;
}

const none = { PageDown: null, Enter: null, ' ': null, a: null } as const;

describe('getListIntent', () => {
  it.each<readonly [string, ListNavigationOptions | undefined, Record<Key, ListIntent | null>]>([
    [
      'a vertical list',
      undefined,
      {
        ArrowDown: 'next',
        ArrowUp: 'previous',
        ArrowRight: null,
        ArrowLeft: null,
        Home: 'first',
        End: 'last',
        ...none,
      },
    ],
    [
      'a vertical list in right-to-left text',
      { orientation: 'vertical', dir: 'rtl' },
      {
        ArrowDown: 'next',
        ArrowUp: 'previous',
        ArrowRight: null,
        ArrowLeft: null,
        Home: 'first',
        End: 'last',
        ...none,
      },
    ],
    [
      'a horizontal list',
      { orientation: 'horizontal' },
      {
        ArrowDown: null,
        ArrowUp: null,
        ArrowRight: 'next',
        ArrowLeft: 'previous',
        Home: 'first',
        End: 'last',
        ...none,
      },
    ],
    [
      'a horizontal list in right-to-left text',
      { orientation: 'horizontal', dir: 'rtl' },
      {
        ArrowDown: null,
        ArrowUp: null,
        ArrowRight: 'previous',
        ArrowLeft: 'next',
        Home: 'first',
        End: 'last',
        ...none,
      },
    ],
  ])('maps the keys of %s to intents', (_name, options, expected) => {
    expect(intents(options)).toStrictEqual(expected);
  });

  it('keeps the intent of a key pressed with Shift', () => {
    expect(intents(undefined, { shiftKey: true })).toStrictEqual(intents());
    expect(intents({ orientation: 'horizontal' }, { shiftKey: true })).toStrictEqual(
      intents({ orientation: 'horizontal' }),
    );
  });

  it.each(['ctrlKey', 'altKey', 'metaKey'] as const)(
    'leaves a key pressed with %s to the platform',
    (modifier) => {
      for (const orientation of ['vertical', 'horizontal'] as const) {
        expect(Object.values(intents({ orientation }, { [modifier]: true }))).toStrictEqual(
          KEYS.map(() => null),
        );
      }
    },
  );
});
