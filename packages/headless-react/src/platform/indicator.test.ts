import { afterEach, describe, expect, it } from 'vite-plus/test';

import { byId, mount, nextFrame } from './dom.test-utils.ts';
import { INDICATOR_PROPERTIES, measureIndicator, trackIndicator } from './indicator.ts';

afterEach(() => {
  document.body.replaceChildren();
});

/**
 * A list with a 2px border and 4px padding, scrolled 10px to the right, holding three items 50px
 * wide, and an indicator.
 */
function list(): HTMLElement {
  mount(`
    <div id="list" style="position: relative; display: flex; width: 120px; overflow-x: auto;
      border: 2px solid; padding: 4px">
      <div id="a" style="flex: none; width: 50px; height: 20px">A</div>
      <div id="b" style="flex: none; width: 50px; height: 20px">B</div>
      <div id="c" style="flex: none; width: 50px; height: 20px">C</div>
      <div id="indicator" hidden style="position: absolute"></div>
    </div>
  `);
  const element = byId('list');
  element.scrollLeft = 10;
  return element;
}

const variables = (element: HTMLElement): string[] =>
  Object.values(INDICATOR_PROPERTIES).map((name) => element.style.getPropertyValue(name));

describe('measureIndicator', () => {
  it('measures relative to the padding box, in the scrolled content', () => {
    const container = list();
    expect(measureIndicator(byId('b'), container)).toStrictEqual({
      left: 54,
      top: 4,
      width: 50,
      height: 20,
    });
  });

  it('measures nothing that is not laid out', () => {
    const container = list();
    byId('b').style.display = 'none';
    expect(measureIndicator(byId('b'), container)).toBeNull();
  });
});

describe('trackIndicator', () => {
  it('writes the box of the target and shows the indicator', () => {
    list();
    const indicator = byId('indicator');
    const stop = trackIndicator(indicator, byId('c'));
    expect(variables(indicator)).toStrictEqual(['104px', '4px', '50px', '20px']);
    expect(indicator.hidden).toBe(false);
    stop();
  });

  it('hides the indicator without a target, and follows a getter', async () => {
    list();
    const indicator = byId('indicator');
    let target: HTMLElement | null = null;
    const stop = trackIndicator(indicator, () => target);
    expect(indicator.hidden).toBe(true);

    target = byId('a');
    // A change of the list measures again.
    byId('list').append(document.createElement('span'));
    await expect.poll(() => indicator.hidden).toBe(false);
    expect(variables(indicator)[0]).toBe('4px');
    stop();
  });

  it('follows the target as it resizes or moves, until stopped', async () => {
    list();
    const indicator = byId('indicator');
    const stop = trackIndicator(indicator, byId('b'));
    byId('a').style.width = '60px';
    await expect.poll(() => variables(indicator)[0]).toBe('64px');
    byId('b').style.width = '30px';
    await expect.poll(() => variables(indicator)[2]).toBe('30px');

    stop();
    byId('a').style.width = '50px';
    byId('list').append(document.createElement('span'));
    await nextFrame();
    expect(variables(indicator)[0]).toBe('64px');
  });
});
