import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';

import { byId, createCleanups, mount, nextFrame } from './dom.test-utils.ts';
import { trackLayer } from './layer-stack.ts';
import type { LayerOptions, PointerDownOutsideDetails } from './layer-stack.ts';

const cleanups = createCleanups();

afterEach(() => {
  cleanups.run();
  document.body.replaceChildren();
});

type EscapeSpy = (event: KeyboardEvent) => void;
type PointerSpy = (event: PointerEvent, details: PointerDownOutsideDetails) => void;
type FocusSpy = (event: FocusEvent) => void;

/** A layer on the element with `id`, with a spy for each report, and its cleanup. */
function layer(id: string, options: LayerOptions = {}) {
  const onEscapeKeyDown = vi.fn<EscapeSpy>();
  const onPointerDownOutside = vi.fn<PointerSpy>();
  const onFocusOutside = vi.fn<FocusSpy>();
  const stop = cleanups.add(
    trackLayer(() => document.querySelector<HTMLElement>(`#${id}`), {
      onEscapeKeyDown,
      onPointerDownOutside,
      onFocusOutside,
      ...options,
    }),
  );
  return { onEscapeKeyDown, onPointerDownOutside, onFocusOutside, stop };
}

/**
 * A page with a dialog (`#dialog`, holding the trigger of a popover) and a popover portalled to
 * the end of the body (`#popover`), as React renders a popover opened from a dialog.
 */
function mountNested(): void {
  mount(`
    <button id="outside">Outside</button>
    <p id="text">Some text</p>
    <div id="dialog">
      <button id="dialog-button">In the dialog</button>
      <button id="popover-trigger">Open the popover</button>
    </div>
    <div id="popover"><button id="popover-button">In the popover</button></div>
  `);
}

/** The `--layer-index` written on the element with an id; empty when there is none. */
function layerIndex(id: string): string {
  return byId(id).style.getPropertyValue('--layer-index');
}

/** A pointer event of a touch. */
function touchEvent(type: string): PointerEvent {
  return new PointerEvent(type, { pointerType: 'touch', bubbles: true, composed: true });
}

/** Bring focus that moves to `#out` back to `#inside` at once, as a focus trap does. */
function bringFocusBack(event: FocusEvent): void {
  if (event.target === document.querySelector('#out')) {
    byId('inside').focus();
  }
}

/** Open the dialog, then the popover above it, as the user would, one frame apart. */
async function openNested() {
  const dialog = layer('dialog');
  await nextFrame();
  const popover = layer('popover', { exclude: () => [byId('popover-trigger')] });
  await nextFrame();
  return { dialog, popover };
}

/**
 * Open a dialog with layers nested in it, and one that is not, each recording `onParentClose`
 * in `log`: a layer rendered in place inside the dialog, a popover portalled out of it (its
 * trigger inside), a submenu opened from the popover, and an unrelated layer opened last from
 * outside. With `close`, a layer stops when told, as its machine would.
 */
async function openCascade(log: string[], close: boolean) {
  mount(`
    <button id="unrelated-trigger">Unrelated</button>
    <div id="dialog">
      <button id="popover-trigger">Open the popover</button>
      <div id="inline">In place</div>
    </div>
    <div id="popover"><button id="submenu-trigger">Open the submenu</button></div>
    <div id="submenu">Submenu</div>
    <div id="unrelated">Unrelated</div>
  `);
  const open = (id: string, trigger?: string) => {
    const opened = layer(id, {
      exclude: () => (trigger === undefined ? [] : [byId(trigger)]),
      onParentClose: () => {
        log.push(id);
        if (close) {
          opened.stop();
        }
      },
    });
    return opened;
  };
  const dialog = open('dialog');
  await nextFrame();
  const inline = open('inline');
  const popover = open('popover', 'popover-trigger');
  await nextFrame();
  const submenu = open('submenu', 'submenu-trigger');
  const unrelated = open('unrelated', 'unrelated-trigger');
  await nextFrame();
  return { dialog, inline, popover, submenu, unrelated };
}

describe('trackLayer', () => {
  it('starts on the next frame, once its element is rendered', async () => {
    const { onEscapeKeyDown } = layer('content');
    await nextFrame();
    await userEvent.keyboard('{Escape}');
    expect(onEscapeKeyDown).not.toHaveBeenCalled();

    // Mounted later, as lazily mounted content.
    mount('<div id="content">Content</div>');
    await expect.poll(() => layerIndex('content')).toBe('0');
    await userEvent.keyboard('{Escape}');
    expect(onEscapeKeyDown).toHaveBeenCalledOnce();
  });

  it('starts nothing when it stops before its element is rendered', async () => {
    mount('<div id="content">Content</div>');
    const { onEscapeKeyDown, stop } = layer('content');
    stop();
    await nextFrame();

    await userEvent.keyboard('{Escape}');
    expect(onEscapeKeyDown).not.toHaveBeenCalled();
    expect(layerIndex('content')).toBe('');
  });

  describe('Escape', () => {
    it('reaches the top-most layer only, and the next one once that one closes', async () => {
      mountNested();
      const { dialog, popover } = await openNested();
      // Each layer closes on Escape, as its machine would.
      popover.onEscapeKeyDown.mockImplementation(popover.stop);
      dialog.onEscapeKeyDown.mockImplementation(dialog.stop);

      await userEvent.keyboard('{Escape}');
      expect(popover.onEscapeKeyDown).toHaveBeenCalledOnce();
      expect(dialog.onEscapeKeyDown).not.toHaveBeenCalled();

      await userEvent.keyboard('{Escape}');
      expect(popover.onEscapeKeyDown).toHaveBeenCalledOnce();
      expect(dialog.onEscapeKeyDown).toHaveBeenCalledOnce();
    });

    it('is not reported when an element used it, nor while an IME composes', async () => {
      mount('<div id="content"><input id="field" aria-label="Field"></div>');
      const field = byId('field');
      field.addEventListener('keydown', (event) => {
        event.preventDefault();
      });
      const { onEscapeKeyDown } = layer('content');
      await nextFrame();

      await userEvent.type(field, '{Escape}');
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', isComposing: true, bubbles: true }),
      );
      expect(onEscapeKeyDown).not.toHaveBeenCalled();
    });

    it('is not reported while the top-most layer waits for its element', async () => {
      mount('<div id="content">Content</div>');
      const below = layer('content');
      await nextFrame();
      const waiting = layer('not-rendered-yet');
      await nextFrame();

      await userEvent.keyboard('{Escape}');
      expect(below.onEscapeKeyDown).not.toHaveBeenCalled();
      expect(waiting.onEscapeKeyDown).not.toHaveBeenCalled();
    });
  });

  describe('a press outside', () => {
    it('reaches the top-most layer only, with the target and whether it takes focus', async () => {
      mountNested();
      const { dialog, popover } = await openNested();

      await userEvent.click(byId('outside'));
      expect(popover.onPointerDownOutside).toHaveBeenCalledExactlyOnceWith(
        expect.any(PointerEvent),
        { target: byId('outside'), focusable: true },
      );
      expect(dialog.onPointerDownOutside).not.toHaveBeenCalled();

      await userEvent.click(byId('text'));
      expect(popover.onPointerDownOutside).toHaveBeenLastCalledWith(expect.any(PointerEvent), {
        target: byId('text'),
        focusable: false,
      });
      expect(dialog.onPointerDownOutside).not.toHaveBeenCalled();
    });

    it('in a lower layer reaches the top-most one; one inside it reaches none', async () => {
      mountNested();
      const { dialog, popover } = await openNested();

      await userEvent.click(byId('popover-button'));
      expect(popover.onPointerDownOutside).not.toHaveBeenCalled();
      expect(dialog.onPointerDownOutside).not.toHaveBeenCalled();

      await userEvent.click(byId('dialog-button'));
      expect(popover.onPointerDownOutside).toHaveBeenCalledOnce();
      expect(dialog.onPointerDownOutside).not.toHaveBeenCalled();
    });

    it('reaches the next layer once the top-most one closes', async () => {
      mountNested();
      const { dialog, popover } = await openNested();
      popover.onPointerDownOutside.mockImplementation(popover.stop);

      await userEvent.click(byId('outside'));
      await userEvent.click(byId('outside'));
      expect(popover.onPointerDownOutside).toHaveBeenCalledOnce();
      expect(dialog.onPointerDownOutside).toHaveBeenCalledOnce();
    });

    it('is not reported on an exclude element, such as the trigger', async () => {
      mountNested();
      const { popover } = await openNested();

      await userEvent.click(byId('popover-trigger'));
      expect(popover.onPointerDownOutside).not.toHaveBeenCalled();
    });

    it('takes focus when the target is inside an element that does', async () => {
      mount('<button id="button"><span id="label">Label</span></button><div id="content"></div>');
      const { onPointerDownOutside } = layer('content');
      await nextFrame();

      await userEvent.click(byId('label'));
      expect(onPointerDownOutside).toHaveBeenCalledWith(expect.any(PointerEvent), {
        target: byId('label'),
        focusable: true,
      });
    });

    it('by touch is reported on the click that follows it, not when it turns into a scroll', async () => {
      mount('<p id="text">Some text</p><div id="content"></div>');
      const { onPointerDownOutside } = layer('content');
      await nextFrame();
      const text = byId('text');

      const press = touchEvent('pointerdown');
      text.dispatchEvent(press);
      expect(onPointerDownOutside).not.toHaveBeenCalled();
      text.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onPointerDownOutside).toHaveBeenCalledExactlyOnceWith(press, {
        target: text,
        focusable: false,
      });

      text.dispatchEvent(touchEvent('pointerdown'));
      text.dispatchEvent(touchEvent('pointercancel'));
      text.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(onPointerDownOutside).toHaveBeenCalledOnce();
    });
  });

  describe('focus outside', () => {
    it('reaches every layer focus left, but not one it moved into or above', async () => {
      mountNested();
      const { dialog, popover } = await openNested();

      byId('popover-button').focus();
      byId('dialog-button').focus();
      await nextFrame();
      expect(popover.onFocusOutside).toHaveBeenCalledOnce();
      expect(dialog.onFocusOutside).not.toHaveBeenCalled();

      // The popover is above the dialog: inside it, though portalled out of its DOM.
      byId('popover-button').focus();
      await nextFrame();
      expect(dialog.onFocusOutside).not.toHaveBeenCalled();

      byId('outside').focus();
      await nextFrame();
      expect(popover.onFocusOutside).toHaveBeenCalledTimes(2);
      expect(dialog.onFocusOutside).toHaveBeenCalledOnce();
      expect(dialog.onFocusOutside).toHaveBeenCalledWith(expect.any(FocusEvent));
    });

    it('is reported for Tab out of a layer, and not for focus on an exclude element', async () => {
      mount(`
        <button id="trigger">Trigger</button>
        <div id="content"><button id="inside">Inside</button></div>
        <button id="after">After</button>
      `);
      const { onFocusOutside } = layer('content', { exclude: () => [byId('trigger')] });
      await nextFrame();

      byId('inside').focus();
      await userEvent.tab({ shift: true });
      await nextFrame();
      expect(document.activeElement).toBe(byId('trigger'));
      expect(onFocusOutside).not.toHaveBeenCalled();

      byId('inside').focus();
      await userEvent.tab();
      await nextFrame();
      expect(document.activeElement).toBe(byId('after'));
      expect(onFocusOutside).toHaveBeenCalledOnce();
    });

    it('is not reported when focus comes back at once, as a focus trap brings it', async () => {
      mount(
        '<div id="content"><button id="inside">Inside</button></div><button id="out">Out</button>',
      );
      const { onFocusOutside } = layer('content');
      await nextFrame();
      document.addEventListener('focusin', bringFocusBack);
      cleanups.add(() => {
        document.removeEventListener('focusin', bringFocusBack);
      });

      byId('out').focus();
      await nextFrame();
      expect(document.activeElement).toBe(byId('inside'));
      expect(onFocusOutside).not.toHaveBeenCalled();
    });

    it('is not reported for focus that a press moved, which only the top-most layer reports', async () => {
      mountNested();
      const { dialog, popover } = await openNested();

      await userEvent.click(byId('outside'));
      await nextFrame();
      expect(document.activeElement).toBe(byId('outside'));
      expect(popover.onPointerDownOutside).toHaveBeenCalledOnce();
      expect(popover.onFocusOutside).not.toHaveBeenCalled();
      expect(dialog.onFocusOutside).not.toHaveBeenCalled();

      // The press is over: focus that a script moves is reported again.
      byId('popover-button').focus();
      byId('outside').focus();
      await nextFrame();
      expect(popover.onFocusOutside).toHaveBeenCalledOnce();
      expect(dialog.onFocusOutside).toHaveBeenCalledOnce();
    });
  });

  describe('a layer that closes', () => {
    it('reports it to the layers nested in it, top-most first, not to an unrelated one', async () => {
      const log: string[] = [];
      const { dialog } = await openCascade(log, false);

      // Closed by its owner: nothing nested in it reported it first.
      dialog.stop();
      expect(log).toStrictEqual(['submenu', 'popover', 'inline']);
    });

    it('reports it once to each, as nested layers close when told', async () => {
      const log: string[] = [];
      const { dialog, unrelated } = await openCascade(log, true);

      dialog.stop();
      expect(log).toStrictEqual(['submenu', 'popover', 'inline']);
      // The unrelated layer is the only one left: the top-most.
      await userEvent.keyboard('{Escape}');
      expect(unrelated.onEscapeKeyDown).toHaveBeenCalledOnce();
    });

    it('reports it to the layers nested in a nested layer only', async () => {
      const log: string[] = [];
      const { popover } = await openCascade(log, false);

      popover.stop();
      expect(log).toStrictEqual(['submenu']);
    });
  });

  describe('--layer-index', () => {
    it('is written on each layer and its style targets, follows the stack, and is cleared', async () => {
      mount(`
        <div id="backdrop-a"></div><div id="positioner-a"><div id="a"></div></div>
        <div id="backdrop-b"></div><div id="positioner-b"><div id="b"></div></div>
      `);
      const a = layer('a', { styleTargets: () => [byId('backdrop-a'), byId('positioner-a')] });
      const b = layer('b', {
        styleTargets: () => [byId('backdrop-b'), byId('positioner-b'), null],
      });
      await nextFrame();

      expect(['a', 'backdrop-a', 'positioner-a'].map((id) => layerIndex(id))).toStrictEqual([
        '0',
        '0',
        '0',
      ]);
      expect(['b', 'backdrop-b', 'positioner-b'].map((id) => layerIndex(id))).toStrictEqual([
        '1',
        '1',
        '1',
      ]);

      a.stop();
      expect(['a', 'backdrop-a', 'positioner-a'].map((id) => layerIndex(id))).toStrictEqual([
        '',
        '',
        '',
      ]);
      expect(['b', 'backdrop-b', 'positioner-b'].map((id) => layerIndex(id))).toStrictEqual([
        '0',
        '0',
        '0',
      ]);

      b.stop();
      expect(['b', 'backdrop-b', 'positioner-b'].map((id) => layerIndex(id))).toStrictEqual([
        '',
        '',
        '',
      ]);
    });
  });
});
