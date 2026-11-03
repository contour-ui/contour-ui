import { describe, expect, it, vi } from 'vite-plus/test';

import { createIdRegistry, idsOf } from './id-registry.ts';

describe('idsOf', () => {
  it('splits a list of ids at white space', () => {
    expect(idsOf(' a  b\tc\n')).toEqual(['a', 'b', 'c']);
    expect(idsOf('')).toEqual([]);
    expect(idsOf(undefined)).toEqual([]);
  });
});

describe('createIdRegistry', () => {
  it('joins the texts of ids in their order, with spaces, skipping the missing ones', () => {
    const registry = createIdRegistry();
    const owner = {};
    registry.publish('a', owner, ' Cut ');
    registry.publish('b', owner, 'Low');
    expect(registry.textOf(['b', 'missing', 'a'])).toBe('Low Cut');
    expect(registry.textOf([])).toBe('');
  });

  it('takes a text back only from the element that published it', () => {
    const registry = createIdRegistry();
    const first = {};
    const second = {};
    registry.publish('a', first, 'First');
    registry.publish('a', second, 'Second');
    registry.unpublish('a', first);
    expect(registry.textOf(['a'])).toBe('Second');
    registry.unpublish('a', second);
    expect(registry.textOf(['a'])).toBe('');
  });

  it('counts the references to an id until each lets go', () => {
    const registry = createIdRegistry();
    const release = registry.reference(['a', 'b']);
    const again = registry.reference(['a']);
    release();
    expect(registry.isReferenced('a')).toBe(true);
    expect(registry.isReferenced('b')).toBe(false);
    again();
    expect(registry.isReferenced('a')).toBe(false);
  });

  it('tells only the listeners of an id about its changes', () => {
    const registry = createIdRegistry();
    const ofA = vi.fn<() => void>();
    const ofB = vi.fn<() => void>();
    registry.subscribe(['a'], ofA);
    const stop = registry.subscribe(['b'], ofB);
    registry.publish('a', {}, 'A');
    // The same text again changes nothing.
    const owner = {};
    registry.publish('b', owner, 'B');
    registry.publish('b', owner, 'B');
    const release = registry.reference(['a']);
    // A second reference changes nothing either.
    const again = registry.reference(['a']);
    again();
    release();
    stop();
    registry.publish('b', owner, 'C');
    expect(ofA).toHaveBeenCalledTimes(3);
    expect(ofB).toHaveBeenCalledOnce();
  });
});
