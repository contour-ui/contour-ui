import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';

import { createCleanups, mount, nextFrame } from './dom.test-utils.ts';
import { lockScroll } from './scroll-lock.ts';

const cleanups = createCleanups();
const root = document.documentElement;

afterEach(() => {
  cleanups.run();
  vi.restoreAllMocks();
  root.style.cssText = '';
  // Chromium writes CSSOM changes to the attribute lazily: read it, or the removal does not hold.
  root.getAttribute('style');
  root.removeAttribute('style');
  root.removeAttribute('dir');
  document.head.querySelector('#test-style')?.remove();
  document.body.replaceChildren();
  window.scrollTo(0, 0);
});

/** Lock the page; the lock is released after the test if the test does not. */
function lock(): () => void {
  return cleanups.add(lockScroll());
}

/**
 * Make the page report a classic scrollbar of `width` pixels: headless Chromium hides its
 * scrollbars, so the viewport is as wide as the root element.
 */
function fakeScrollbar(width: number): void {
  const clientWidth = root.clientWidth;
  vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(clientWidth + width);
}

/** Add a stylesheet for the test. */
function addStyle(css: string): void {
  const style = document.createElement('style');
  style.id = 'test-style';
  style.textContent = css;
  document.head.append(style);
}

describe('lockScroll', () => {
  it('hides the overflow of the root element, and takes it off on unlock', () => {
    const unlock = lock();
    expect(root.style.overflow).toBe('hidden');
    expect(getComputedStyle(root).overflowY).toBe('hidden');

    unlock();
    expect(root.style.overflow).toBe('');
    expect(root).not.toHaveAttribute('style');
  });

  it('stops the page from scrolling, where it was', async () => {
    mount('<div style="height: 3000px">Tall</div>');
    window.scrollTo(0, 100);
    const unlock = lock();
    expect(window.scrollY).toBe(100);

    await userEvent.wheel(document.body, { delta: { y: 300 } });
    await nextFrame();
    await nextFrame();
    expect(window.scrollY).toBe(100);

    unlock();
    await userEvent.wheel(document.body, { delta: { y: 300 } });
    await expect.poll(() => window.scrollY).toBeGreaterThan(100);
  });

  it('puts back the inline styles the root element had', () => {
    root.style.setProperty('overflow-y', 'scroll', 'important');
    root.style.setProperty('color-scheme', 'dark');
    const unlock = lock();
    expect(root.style.overflowY).toBe('hidden');

    unlock();
    expect(root.style.getPropertyValue('overflow-y')).toBe('scroll');
    expect(root.style.getPropertyPriority('overflow-y')).toBe('important');
    expect(root.style.overflowX).toBe('');
    expect(root.style.getPropertyValue('color-scheme')).toBe('dark');
  });

  it('counts nested locks: the last unlock puts the styles back', () => {
    const unlockOuter = lock();
    const unlockInner = lock();

    unlockOuter();
    // A second call of the same unlock releases nothing more.
    unlockOuter();
    expect(root.style.overflow).toBe('hidden');

    unlockInner();
    expect(root.style.overflow).toBe('');
  });

  describe('the room of the scrollbar', () => {
    it('comes back as padding at the inline end, its width in --scrollbar-width', () => {
      fakeScrollbar(15);
      const unlock = lock();
      expect(getComputedStyle(root).paddingRight).toBe('15px');
      expect(root.style.getPropertyValue('--scrollbar-width')).toBe('15px');
      expect(root.style.getPropertyValue('scrollbar-gutter')).toBe('');

      unlock();
      expect(getComputedStyle(root).paddingRight).toBe('0px');
      expect(root.style.getPropertyValue('--scrollbar-width')).toBe('');
      expect(root).not.toHaveAttribute('style');
    });

    it('adds to the padding the page has', () => {
      fakeScrollbar(15);
      addStyle('html { padding-inline-end: 10px; }');
      const unlock = lock();
      expect(getComputedStyle(root).paddingRight).toBe('25px');

      unlock();
      expect(getComputedStyle(root).paddingRight).toBe('10px');
    });

    it('is on the left of a right-to-left page', () => {
      fakeScrollbar(15);
      root.dir = 'rtl';
      lock();

      expect(getComputedStyle(root).paddingLeft).toBe('15px');
      expect(getComputedStyle(root).paddingRight).toBe('0px');
    });

    it('is nothing without a scrollbar that takes room, nor beside a gutter of the page', () => {
      const unlock = lock();
      expect(root.style.getPropertyValue('padding-inline-end')).toBe('');
      expect(root.style.getPropertyValue('--scrollbar-width')).toBe('0px');
      unlock();

      fakeScrollbar(15);
      addStyle('html { scrollbar-gutter: stable; }');
      lock();
      expect(root.style.getPropertyValue('padding-inline-end')).toBe('');
      expect(root.style.getPropertyValue('--scrollbar-width')).toBe('0px');
    });

    it('puts back the padding and the --scrollbar-width the root element had inline', () => {
      fakeScrollbar(15);
      root.style.setProperty('padding-inline-end', '4px');
      root.style.setProperty('--scrollbar-width', '7px');
      const unlock = lock();
      expect(getComputedStyle(root).paddingRight).toBe('19px');
      expect(root.style.getPropertyValue('--scrollbar-width')).toBe('15px');

      unlock();
      expect(root.style.getPropertyValue('padding-inline-end')).toBe('4px');
      expect(root.style.getPropertyValue('--scrollbar-width')).toBe('7px');
    });
  });
});
