import { afterEach, describe, expect, it } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';

import { byId, createCleanups, mount, nextFrame } from './dom.test-utils.ts';
import { moveFocusIn, returnFocus, trapFocus } from './focus-trap.ts';
import type { FocusTrapOptions } from './focus-trap.ts';
import { trackLayer } from './layer-stack.ts';

const cleanups = createCleanups();

afterEach(() => {
  cleanups.run();
  document.body.replaceChildren();
});

/** The id of the focused element, or `body`. */
function focusedId(): string {
  const active = document.activeElement;
  return active === null || active === document.body ? 'body' : active.id;
}

/** Prevent the default of Tab, as a widget that uses Tab itself does. */
function preventTab(event: KeyboardEvent): void {
  if (event.key === 'Tab') {
    event.preventDefault();
  }
}

/** A trap on the element with `id`, started from the element focused now; returns its stop. */
function trap(id: string, options: FocusTrapOptions = {}): () => void {
  return cleanups.add(trapFocus(() => document.querySelector<HTMLElement>(`#${id}`), options));
}

/** A page with a trigger, a dialog with three buttons, and a button after it. */
function mountDialog(): void {
  mount(`
    <button id="trigger">Open</button>
    <p id="text">Some text</p>
    <div id="dialog" tabindex="-1">
      <button id="first">First</button>
      <button id="middle">Middle</button>
      <button id="last">Last</button>
    </div>
    <button id="after">After</button>
  `);
  byId('trigger').focus();
}

describe('trapFocus', () => {
  describe('on start', () => {
    it('moves focus to the first tabbable element, on the next frame', async () => {
      mountDialog();
      trap('dialog');
      expect(focusedId()).toBe('trigger');

      await nextFrame();
      expect(focusedId()).toBe('first');
    });

    it('moves focus to initialFocus, unless it gives nothing that takes focus', async () => {
      mountDialog();
      const stop = trap('dialog', { initialFocus: () => byId('middle'), restoreFocus: false });
      await nextFrame();
      expect(focusedId()).toBe('middle');
      stop();

      byId('trigger').focus();
      const stopAgain = trap('dialog', { initialFocus: () => byId('text'), restoreFocus: false });
      await nextFrame();
      expect(focusedId()).toBe('first');
      stopAgain();

      byId('trigger').focus();
      trap('dialog', { initialFocus: () => null });
      await nextFrame();
      expect(focusedId()).toBe('first');
    });

    it('moves focus to the container when nothing inside is tabbable', async () => {
      mount('<div id="dialog" tabindex="-1"><p>Text only</p></div>');
      trap('dialog');
      await nextFrame();

      expect(focusedId()).toBe('dialog');
    });

    it('leaves focus that is already inside, and focus anywhere without autoFocus', async () => {
      mountDialog();
      byId('last').focus();
      const stop = trap('dialog', { restoreFocus: false });
      await nextFrame();
      expect(focusedId()).toBe('last');
      stop();

      byId('trigger').focus();
      trap('dialog', { autoFocus: false });
      await nextFrame();
      expect(focusedId()).toBe('trigger');
    });

    it('waits for a container that is rendered later', async () => {
      // The container does not exist yet.
      trap('dialog');
      await nextFrame();

      mountDialog();
      byId('trigger').focus();
      await expect.poll(focusedId).toBe('first');
    });
  });

  describe('Tab', () => {
    it('goes round: from the last element to the first, and back with Shift', async () => {
      mountDialog();
      trap('dialog');
      await nextFrame();

      await userEvent.tab();
      expect(focusedId()).toBe('middle');
      await userEvent.tab();
      expect(focusedId()).toBe('last');
      await userEvent.tab();
      expect(focusedId()).toBe('first');
      await userEvent.tab({ shift: true });
      expect(focusedId()).toBe('last');
    });

    it('goes round in a container whose own layer starts after the trap', async () => {
      mountDialog();
      trap('dialog');
      cleanups.add(trackLayer(() => byId('dialog')));
      await nextFrame();
      const focused: string[] = [];
      byId('after').addEventListener('focus', () => {
        focused.push('after');
      });

      byId('last').focus();
      await userEvent.tab();
      expect(focusedId()).toBe('first');
      // Round the trap directly, not out and back.
      expect(focused).toStrictEqual([]);

      byId('middle').focus();
      byId('after').focus();
      expect(focusedId()).toBe('middle');
    });

    it('goes to the last element on Shift+Tab from the container', async () => {
      mount(`
        <button id="before">Before</button>
        <div id="dialog" tabindex="-1"><p>Text</p><button id="only">Only</button></div>
      `);
      trap('dialog', { initialFocus: () => byId('dialog') });
      await nextFrame();
      expect(focusedId()).toBe('dialog');

      await userEvent.tab({ shift: true });
      expect(focusedId()).toBe('only');
      await userEvent.tab();
      expect(focusedId()).toBe('only');
    });

    it('keeps focus on the container when nothing inside is tabbable', async () => {
      mount(`
        <button id="before">Before</button>
        <div id="dialog" tabindex="-1"><p>Text only</p></div>
        <button id="after">After</button>
      `);
      trap('dialog');
      await nextFrame();

      await userEvent.tab();
      expect(focusedId()).toBe('dialog');
      await userEvent.tab({ shift: true });
      expect(focusedId()).toBe('dialog');
    });

    it('brings focus from outside in: to the first element, or the last with Shift', async () => {
      mountDialog();
      trap('dialog');
      await nextFrame();

      await userEvent.click(byId('text'));
      expect(focusedId()).toBe('body');
      await userEvent.tab();
      expect(focusedId()).toBe('first');

      await userEvent.click(byId('text'));
      await userEvent.tab({ shift: true });
      expect(focusedId()).toBe('last');
    });

    it('leaves a Tab that an element used', async () => {
      mountDialog();
      byId('last').addEventListener('keydown', preventTab);
      trap('dialog', { initialFocus: () => byId('last') });
      await nextFrame();

      await userEvent.tab();
      expect(focusedId()).toBe('last');
    });
  });

  describe('focus that escapes', () => {
    it('comes back to the element focused last', async () => {
      mountDialog();
      trap('dialog');
      await nextFrame();
      await userEvent.tab();
      expect(focusedId()).toBe('middle');

      byId('after').focus();
      expect(focusedId()).toBe('middle');

      await userEvent.click(byId('trigger'));
      expect(focusedId()).toBe('middle');
    });

    it('may go to a layer opened above the trap, though it is outside the container', async () => {
      mountDialog();
      mount(
        '<div id="popover"><button id="in-popover">In the popover</button><button id="next">Next</button></div>',
      );
      trap('dialog');
      await nextFrame();
      cleanups.add(trackLayer(() => byId('popover')));
      await nextFrame();

      await userEvent.click(byId('in-popover'));
      expect(focusedId()).toBe('in-popover');
      // Tab in the popover is its own.
      await userEvent.tab();
      expect(focusedId()).toBe('next');
    });

    it('comes back from a layer opened below the trap', async () => {
      mountDialog();
      mount('<div id="popover"><button id="in-popover">In the popover</button></div>');
      cleanups.add(trackLayer(() => byId('popover')));
      await nextFrame();
      trap('dialog');
      await nextFrame();

      byId('in-popover').focus();
      expect(focusedId()).toBe('first');
    });
  });

  describe('on stop', () => {
    it('moves focus back to the element focused on start, on the next frame', async () => {
      mountDialog();
      const stop = trap('dialog');
      await nextFrame();
      expect(focusedId()).toBe('first');

      stop();
      expect(focusedId()).toBe('first');
      await nextFrame();
      expect(focusedId()).toBe('trigger');
    });

    it('moves focus to finalFocus, and nowhere without restoreFocus', async () => {
      mountDialog();
      const stop = trap('dialog', { finalFocus: () => byId('after') });
      await nextFrame();
      stop();
      await nextFrame();
      expect(focusedId()).toBe('after');

      byId('trigger').focus();
      const stopAgain = trap('dialog', { restoreFocus: false });
      await nextFrame();
      stopAgain();
      await nextFrame();
      expect(focusedId()).toBe('first');
    });

    it('leaves focus that moved on to another element, and restores focus that is nowhere', async () => {
      mountDialog();
      const stop = trap('dialog');
      await nextFrame();
      // A press outside closes the dialog, then the browser focuses what was pressed.
      stop();
      byId('after').focus();
      await nextFrame();
      expect(focusedId()).toBe('after');

      byId('trigger').focus();
      const stopAgain = trap('dialog');
      await nextFrame();
      stopAgain();
      byId('first').blur();
      await nextFrame();
      expect(focusedId()).toBe('trigger');
    });

    it('moves no focus when stopped before it started', async () => {
      mountDialog();
      const stop = trap('dialog');
      stop();
      byId('after').focus();
      await nextFrame();
      await nextFrame();

      expect(focusedId()).toBe('after');
    });
  });

  it('nests: the newest trap is active, and the one below resumes when it stops', async () => {
    mount(`
      <div id="outer" tabindex="-1">
        <button id="outer-first">Outer first</button>
        <button id="open-inner">Open the inner dialog</button>
      </div>
      <div id="inner" tabindex="-1">
        <button id="inner-first">Inner first</button>
        <button id="inner-last">Inner last</button>
      </div>
    `);
    trap('outer');
    await nextFrame();
    await userEvent.tab();
    expect(focusedId()).toBe('open-inner');

    const stopInner = trap('inner');
    await nextFrame();
    expect(focusedId()).toBe('inner-first');
    await userEvent.tab();
    await userEvent.tab();
    expect(focusedId()).toBe('inner-first');
    // The outer trap is paused: it lets the inner one keep focus.
    byId('outer-first').focus();
    expect(focusedId()).toBe('inner-first');

    stopInner();
    await nextFrame();
    expect(focusedId()).toBe('open-inner');
    await userEvent.tab();
    expect(focusedId()).toBe('outer-first');
    byId('inner-first').focus();
    expect(focusedId()).toBe('outer-first');
  });
});

describe('moveFocusIn', () => {
  it('moves focus in on the next frame, unless cancelled before', async () => {
    mountDialog();
    const cancel = cleanups.add(moveFocusIn(() => byId('dialog')));
    cancel();
    await nextFrame();
    expect(focusedId()).toBe('trigger');

    cleanups.add(moveFocusIn(() => byId('dialog'), { initialFocus: () => byId('last') }));
    await nextFrame();
    expect(focusedId()).toBe('last');
    // It traps nothing.
    await userEvent.tab();
    expect(focusedId()).toBe('after');
  });
});

describe('returnFocus', () => {
  it('moves focus back from inside `from` or from nowhere, on the next frame', async () => {
    mountDialog();
    byId('middle').focus();
    cleanups.add(returnFocus(byId('trigger'), { from: () => byId('dialog') }));
    expect(focusedId()).toBe('middle');
    await nextFrame();
    expect(focusedId()).toBe('trigger');

    byId('trigger').blur();
    cleanups.add(returnFocus(() => byId('trigger')));
    await nextFrame();
    expect(focusedId()).toBe('trigger');
  });

  it('leaves focus on another element, and does nothing once cancelled', async () => {
    mountDialog();
    byId('after').focus();
    cleanups.add(returnFocus(byId('trigger'), { from: () => byId('dialog') }));
    await nextFrame();
    expect(focusedId()).toBe('after');

    byId('first').focus();
    const cancel = returnFocus(byId('trigger'), { from: () => byId('dialog') });
    cancel();
    await nextFrame();
    expect(focusedId()).toBe('first');
  });

  it('does nothing when the target cannot take focus', async () => {
    mountDialog();
    byId('first').focus();
    byId('trigger').inert = true;
    cleanups.add(returnFocus(byId('trigger'), { from: () => byId('dialog') }));
    await nextFrame();

    expect(focusedId()).toBe('first');
  });
});
