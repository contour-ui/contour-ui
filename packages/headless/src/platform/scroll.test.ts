import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { byId, mount } from './dom.test-utils.ts';
import { computedPixels, scrollContainerOf, scrollIntoContainer } from './scroll.ts';

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
  window.scrollTo(0, 0);
});

/**
 * A list 100px high, scrolled by itself, far below the fold, so that scrolling every ancestor
 * would scroll the page: 20 rows of 20px, `row-0` to `row-19`. `style` adds to the list's.
 */
function list(style = ''): HTMLElement {
  const rows = Array.from(
    { length: 20 },
    (_, index) => `<div id="row-${index}" style="height: 20px">Row ${index}</div>`,
  ).join('');
  mount(`
    <div style="height: 150vh"></div>
    <div id="list" style="height: 100px; overflow-y: auto; ${style}">${rows}</div>
    <div style="height: 150vh"></div>
  `);
  return byId('list');
}

describe('computedPixels', () => {
  it('reads a length in pixels, and keywords as 0', () => {
    expect(computedPixels('8px')).toBe(8);
    expect(computedPixels('12.5px')).toBe(12.5);
    expect(computedPixels('auto')).toBe(0);
    expect(computedPixels('')).toBe(0);
  });
});

describe('scrollContainerOf', () => {
  it('finds the nearest ancestor that scrolls vertically', () => {
    list();

    expect(scrollContainerOf(byId('row-3'))).toBe(byId('list'));
  });

  it('skips ancestors that do not scroll, or that have nothing to scroll', () => {
    mount(`
      <div id="outer" style="height: 50px; overflow: auto">
        <div id="short" style="height: 200px; overflow: auto">
          <div style="overflow: hidden"><p id="text">Text</p></div>
        </div>
      </div>
    `);

    // `short` lets its content scroll, but the content fits.
    expect(scrollContainerOf(byId('text'))).toBe(byId('outer'));
  });

  it('never returns the page, nor an ancestor that holds the boundary', () => {
    mount(`
      <div id="panel" style="height: 50px; overflow: auto">
        <div id="article" style="height: 200px"></div>
        <p id="item">Item</p>
      </div>
      <p id="loose">Loose</p>
    `);

    expect(scrollContainerOf(byId('loose'))).toBeNull();
    expect(scrollContainerOf(byId('item'))).toBe(byId('panel'));
    expect(scrollContainerOf(byId('item'), byId('article'))).toBeNull();
  });
});

describe('scrollIntoContainer', () => {
  it('scrolls the container by as little as it takes, and never the page', () => {
    const container = list();
    const page = window.scrollY;

    scrollIntoContainer(byId('row-7'), { container });
    // Row 7 ends at 160px: its bottom at the bottom of the 100px room.
    expect(container.scrollTop).toBe(60);
    scrollIntoContainer(byId('row-5'), { container });
    // In view already.
    expect(container.scrollTop).toBe(60);
    scrollIntoContainer(byId('row-1'), { container });
    expect(container.scrollTop).toBe(20);
    expect(window.scrollY).toBe(page);
  });

  it('scrolls the nearest scroll container when none is given', () => {
    const container = list();

    scrollIntoContainer(byId('row-19'));
    expect(container.scrollTop).toBe(300);
    expect(window.scrollY).toBe(0);
  });

  it('leaves room for the scroll padding of the container', () => {
    const container = list('scroll-padding-block: 10px 30px');

    scrollIntoContainer(byId('row-7'), { container });
    expect(container.scrollTop).toBe(90);
    scrollIntoContainer(byId('row-2'), { container });
    expect(container.scrollTop).toBe(30);
  });

  it('scrolls by layout distances in a container drawn scaled, as an overlay growing in is', () => {
    const container = list('scale: 0.5; transform-origin: 0 0; border-top: 4px solid');

    // As in an unscaled list: row 7 ends at 160px, below the 100px room.
    scrollIntoContainer(byId('row-7'), { container });
    expect(container.scrollTop).toBe(60);
    scrollIntoContainer(byId('row-1'), { container });
    expect(container.scrollTop).toBe(20);
  });

  it('shows the start of an element larger than the container', () => {
    mount(`
      <div id="box" style="height: 100px; overflow: auto">
        <div style="height: 150px"></div>
        <div id="tall" style="height: 300px">Tall</div>
      </div>
    `);

    scrollIntoContainer(byId('tall'), { container: byId('box') });
    expect(byId('box').scrollTop).toBe(150);
  });

  it('scrolls sideways a container that scrolls sideways, and not one that clips', () => {
    mount(`
      <div id="row" style="display: flex; width: 100px; overflow-x: auto">
        ${Array.from({ length: 10 }, (_, index) => `<div id="cell-${index}" style="flex: 0 0 40px">${index}</div>`).join('')}
      </div>
      <div id="clipped" style="display: flex; width: 100px; height: 60px; overflow: hidden auto">
        <div id="wide" style="flex: 0 0 300px; height: 200px">Wide</div>
      </div>
    `);

    scrollIntoContainer(byId('cell-4'), { container: byId('row') });
    expect(byId('row').scrollLeft).toBe(100);
    scrollIntoContainer(byId('wide'), { container: byId('clipped') });
    expect(byId('clipped').scrollLeft).toBe(0);
  });

  it('scrolls the way it is told, and does nothing for an element in view', () => {
    const container = list();
    const scrollTo = vi.spyOn(container, 'scrollTo');

    scrollIntoContainer(byId('row-1'), { container, behavior: 'smooth' });
    expect(scrollTo).not.toHaveBeenCalled();
    scrollIntoContainer(byId('row-9'), { container, behavior: 'smooth' });
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ behavior: 'smooth', top: 100 });
  });

  it('does nothing without a container', () => {
    mount('<p id="loose">Loose</p>');

    expect(() => {
      scrollIntoContainer(byId('loose'));
    }).not.toThrow();
    expect(window.scrollY).toBe(0);
  });
});
