import { afterEach, describe, expect, it } from 'vite-plus/test';

import { byId, createCleanups, mount, nextFrame } from './dom.test-utils.ts';
import { hideOutside } from './hide-outside.ts';
import type { HideOutsideOptions } from './hide-outside.ts';
import { trackLayer } from './layer-stack.ts';
import { isFocusable } from './tabbable.ts';

const cleanups = createCleanups();

afterEach(() => {
  cleanups.run();
  document.body.replaceChildren();
});

/** The ids of the elements with `inert`, in document order. */
function inertIds(): string[] {
  return [...document.querySelectorAll('[inert]')].map((element) => element.id);
}

/** Hide everything outside the element with `id`; the lock ends after the test if not before. */
function hide(id: string, options: HideOutsideOptions = {}): () => void {
  return cleanups.add(hideOutside(() => document.querySelector(`#${id}`), options));
}

/** A layer on the element with `id`. */
function layer(id: string): () => void {
  return cleanups.add(trackLayer(() => document.querySelector<HTMLElement>(`#${id}`)));
}

/** A page with a dialog deep inside it, live regions and elements that render nothing. */
function mountPage(): void {
  mount(`
    <header id="header">Header</header>
    <main id="main">
      <p id="intro">Intro</p>
      <section id="section">
        <p id="before">Before</p>
        <div id="dialog"><button id="inside">Inside</button><p id="nested">Nested</p></div>
        <p id="after">After</p>
      </section>
      <aside id="aside">Aside</aside>
    </main>
    <div id="toasts" aria-live="polite"></div>
    <div id="status" role="status"></div>
    <div id="alert" role="alert"></div>
    <output id="output"></output>
    <div id="quiet" aria-live="off">Not live</div>
    <script id="script"></script>
    <template id="template"></template>
    <footer id="footer">Footer</footer>
  `);
}

describe('hideOutside', () => {
  it('makes the siblings of the element and of its ancestors inert, on the next frame', async () => {
    mountPage();
    const stop = hide('dialog');
    expect(inertIds()).toStrictEqual([]);

    await nextFrame();
    expect(inertIds()).toStrictEqual([
      'header',
      'intro',
      'before',
      'after',
      'aside',
      'quiet',
      'footer',
    ]);
    expect(isFocusable(byId('inside'))).toBe(true);

    stop();
    expect(inertIds()).toStrictEqual([]);
  });

  it('leaves live regions and elements that render nothing', async () => {
    mountPage();
    hide('dialog');
    await nextFrame();

    for (const id of ['toasts', 'status', 'alert', 'output', 'script', 'template']) {
      expect(byId(id)).not.toHaveAttribute('inert');
    }
  });

  it('keeps exclude elements reachable', async () => {
    mountPage();
    hide('dialog', { exclude: () => [byId('header'), null] });
    await nextFrame();

    expect(inertIds()).toStrictEqual(['intro', 'before', 'after', 'aside', 'quiet', 'footer']);
  });

  it('leaves an element that was inert for a reason of its own inert', async () => {
    mountPage();
    byId('aside').inert = true;
    const stop = hide('dialog');
    await nextFrame();
    expect(byId('aside')).toHaveAttribute('inert');

    stop();
    expect(inertIds()).toStrictEqual(['aside']);
  });

  it('counts the locks that hold an element: the last one takes inert off', async () => {
    mountPage();
    const stopFirst = hide('dialog');
    const stopSecond = hide('dialog', { exclude: () => [byId('footer')] });
    await nextFrame();

    stopFirst();
    expect(inertIds()).toStrictEqual(['header', 'intro', 'before', 'after', 'aside', 'quiet']);
    stopSecond();
    expect(inertIds()).toStrictEqual([]);
  });

  it('nests modal dialogs portalled to the body, with their layers', async () => {
    const page = mount(`
      <button id="page-button">Page</button>
      <div id="outer"><button id="open-inner">Open the inner dialog</button></div>
    `);
    page.id = 'page';
    layer('outer');
    hide('outer');
    await nextFrame();
    expect(inertIds()).toStrictEqual(['page-button']);

    // The inner dialog renders at the end of the body as it opens.
    const innerPortal = mount('<div id="inner"><button id="inner-button">Inner</button></div>');
    innerPortal.id = 'inner-portal';
    const stopInnerLayer = layer('inner');
    const stopInnerHide = hide('inner');
    await nextFrame();
    // The page around the outer dialog, a sibling of the inner one at the body.
    expect(inertIds()).toStrictEqual(['page', 'page-button']);
    expect(isFocusable(byId('open-inner'))).toBe(false);
    expect(isFocusable(byId('inner-button'))).toBe(true);

    stopInnerHide();
    stopInnerLayer();
    // Closed, still rendered: the outer dialog hides it again.
    expect(inertIds()).toStrictEqual(['page-button', 'inner-portal']);
  });

  it('takes inert off a hidden layer rendered before the dialog opened, when it opens above it', async () => {
    mount('<div id="dialog"><button id="trigger">Open the popover</button></div>');
    const popoverPortal = mount(
      '<div id="popover"><button id="in-popover">In the popover</button></div>',
    );
    popoverPortal.id = 'popover-portal';
    hide('dialog');
    await nextFrame();
    expect(inertIds()).toStrictEqual(['popover-portal']);

    const stopPopover = layer('popover');
    await nextFrame();
    expect(inertIds()).toStrictEqual([]);
    expect(isFocusable(byId('in-popover'))).toBe(true);

    stopPopover();
    expect(inertIds()).toStrictEqual(['popover-portal']);
  });

  it('starts nothing when it stops before the element is rendered', async () => {
    const stop = hide('dialog');
    mountPage();
    stop();
    await nextFrame();

    expect(inertIds()).toStrictEqual([]);
  });
});
