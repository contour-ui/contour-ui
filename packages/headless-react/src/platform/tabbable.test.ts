import { afterEach, describe, expect, it } from 'vite-plus/test';

import { byId, mount } from './dom.test-utils.ts';
import {
  getFirstTabbable,
  getLastTabbable,
  getTabbables,
  isFocusable,
  isTabbable,
} from './tabbable.ts';

afterEach(() => {
  document.body.replaceChildren();
});

describe('isFocusable and isTabbable', () => {
  it.each([
    ['a link', '<a id="x" href="#top">Top</a>', true, true],
    ['a button', '<button id="x">OK</button>', true, true],
    ['a text field', '<input id="x">', true, true],
    ['a select', '<select id="x"><option>A</option></select>', true, true],
    ['a text area', '<textarea id="x"></textarea>', true, true],
    ['an editable region', '<div id="x" contenteditable>Edit</div>', true, true],
    [
      'the summary of a details',
      '<details><summary id="x">More</summary>Text</details>',
      true,
      true,
    ],
    ['media with controls', '<video id="x" controls></video>', true, true],
    ['an element with tabindex 0', '<div id="x" tabindex="0">Box</div>', true, true],
    ['an element with tabindex -1', '<div id="x" tabindex="-1">Box</div>', true, false],
    ['a link without href', '<a id="x">Anchor</a>', false, false],
    ['a hidden input', '<input id="x" type="hidden">', false, false],
    ['a plain element', '<div id="x">Text</div>', false, false],
    [
      'an editable region turned off',
      '<div id="x" contenteditable="false">Text</div>',
      false,
      false,
    ],
    ['a disabled button', '<button id="x" disabled>OK</button>', false, false],
    [
      'a field in a disabled fieldset',
      '<fieldset disabled><input id="x"></fieldset>',
      false,
      false,
    ],
    [
      'a field in the legend of a disabled fieldset',
      '<fieldset disabled><legend><input id="x"></legend></fieldset>',
      true,
      true,
    ],
    [
      'a button inside an inert subtree',
      '<div inert><button id="x">OK</button></div>',
      false,
      false,
    ],
    ['an inert button', '<button id="x" inert>OK</button>', false, false],
    [
      'a button inside display: none',
      '<div style="display: none"><button id="x">OK</button></div>',
      false,
      false,
    ],
    ['a hidden button', '<button id="x" hidden>OK</button>', false, false],
    [
      'a button with visibility: hidden',
      '<button id="x" style="visibility: hidden">OK</button>',
      false,
      false,
    ],
    [
      'a visible button inside visibility: hidden',
      '<div style="visibility: hidden"><button id="x" style="visibility: visible">OK</button></div>',
      true,
      true,
    ],
    ['a transparent button', '<button id="x" style="opacity: 0">OK</button>', true, true],
    [
      'a button in closed details',
      '<details><summary>More</summary><button id="x">OK</button></details>',
      false,
      false,
    ],
    [
      'a button in open details',
      '<details open><summary>More</summary><button id="x">OK</button></details>',
      true,
      true,
    ],
    ['an SVG link', '<svg><a id="x" href="#top"><text>Top</text></a></svg>', true, true],
  ])('%s: focusable %s, tabbable %s', (_name, html, focusable, tabbable) => {
    mount(html);
    expect(isFocusable(byId('x'))).toBe(focusable);
    expect(isTabbable(byId('x'))).toBe(tabbable);
  });

  it('reaches only the checked radio of a group with Tab', () => {
    mount(`
      <input type="radio" name="size" id="small">
      <input type="radio" name="size" id="medium" checked>
      <input type="radio" name="size" id="large">
    `);
    expect(['small', 'medium', 'large'].map((id) => isTabbable(byId(id)))).toStrictEqual([
      false,
      true,
      false,
    ]);
    expect(isFocusable(byId('small'))).toBe(true);
  });

  it('reaches the first radio of a group while none is checked, and groups radios by form', () => {
    mount(`
      <form><input type="radio" name="size" id="a"><input type="radio" name="size" id="b"></form>
      <form><input type="radio" name="size" id="c"><input type="radio" name="size" id="d"></form>
      <input type="radio" name="size" id="e" disabled>
      <input type="radio" name="size" id="f">
      <input type="radio" id="g"><input type="radio" id="h">
    `);
    expect(
      ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'].map((id) => isTabbable(byId(id))),
    ).toStrictEqual([true, false, true, false, false, true, true, true]);
  });
});

describe('getTabbables', () => {
  it('lists the tabbable elements inside the root, in document order, without the root', () => {
    const container = mount(`
      <div id="root" tabindex="-1">
        <button id="first">First</button>
        <div tabindex="-1">Skipped: tabindex -1</div>
        <section><a id="second" href="#top">Second</a><button disabled>Skipped: disabled</button></section>
        <div hidden><button>Skipped: hidden</button></div>
        <input id="third">
        <div tabindex="0" id="fourth">Fourth</div>
      </div>
    `);
    const root = byId('root');

    expect(getTabbables(root).map((element) => element.id)).toStrictEqual([
      'first',
      'second',
      'third',
      'fourth',
    ]);
    expect(getFirstTabbable(root)?.id).toBe('first');
    expect(getLastTabbable(root)?.id).toBe('fourth');
    expect(getTabbables(container)[0]?.id).toBe('first');
  });

  it('gives nothing for a root without tabbable elements', () => {
    mount('<div id="root"><p>Text</p><button disabled>Off</button></div>');

    expect(getTabbables(byId('root'))).toStrictEqual([]);
    expect(getFirstTabbable(byId('root'))).toBeNull();
    expect(getLastTabbable(byId('root'))).toBeNull();
  });
});
