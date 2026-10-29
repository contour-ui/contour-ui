import { useState } from 'react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { byId, createCleanups, mount, nextFrame } from './dom.test-utils.ts';
import { whenRendered } from './when-rendered.ts';

const cleanups = createCleanups();

afterEach(() => {
  cleanups.run();
  document.body.replaceChildren();
});

type Start = (element: HTMLElement) => () => void;

/** A start that records its name in `log`, and its stop as `stop <name>`. */
function logged(log: string[], name: string): Start {
  return () => {
    log.push(name);
    return () => {
      log.push(`stop ${name}`);
    };
  };
}

/** The content element, if it is rendered. */
function getContent(): HTMLElement | null {
  return document.querySelector('#content');
}

/** The element with an id, or `null` while it is not rendered. */
function byIdOrNull(id: string): HTMLElement | null {
  return document.querySelector(`#${id}`);
}

/** A start that records whether its element shows when it starts. */
function logVisibility(log: string[], name: string): Start {
  return (element) => {
    log.push(`${name} ${element.checkVisibility() ? 'shown' : 'hidden'}`);
    return () => undefined;
  };
}

/**
 * A button that opens an overlay and calls `onOpen` in its click handler, before React renders
 * the open state: a content mounted lazily, and one mounted from the start, hidden until open.
 */
function Overlay({ onOpen }: { readonly onOpen: () => void }): ReactElement {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          onOpen();
        }}
      >
        Open
      </button>
      {open ? <div id="lazy">Lazy</div> : null}
      <div id="mounted" hidden={!open}>
        Mounted
      </div>
    </>
  );
}

describe('whenRendered', () => {
  it('starts with the element on the next frame, and stops it once', async () => {
    mount('<div id="content"></div>');
    const log: string[] = [];
    const start = vi.fn<Start>(logged(log, 'start'));
    const stop = whenRendered(getContent, 'layer', start);
    expect(start).not.toHaveBeenCalled();

    await nextFrame();
    expect(start).toHaveBeenCalledExactlyOnceWith(byId('content'));
    stop();
    stop();
    expect(log).toStrictEqual(['start', 'stop start']);
  });

  it('takes the element itself as well as a getter', async () => {
    const element = mount('');
    const log: string[] = [];
    cleanups.add(whenRendered(element, 'layer', logged(log, 'start')));
    await nextFrame();

    expect(log).toStrictEqual(['start']);
  });

  it('waits for an element added later, and drops a start stopped before it happened', async () => {
    const log: string[] = [];
    cleanups.add(whenRendered(getContent, 'layer', logged(log, 'kept')));
    const stopDropped = whenRendered(getContent, 'layer', logged(log, 'dropped'));
    await nextFrame();
    await nextFrame();
    expect(log).toStrictEqual([]);

    stopDropped();
    mount('<div id="content"></div>');
    await expect.poll(() => log).toStrictEqual(['kept']);
  });

  it('runs the starts of a frame phase by phase, then in call order', async () => {
    mount('<div id="content"></div>');
    const log: string[] = [];
    cleanups.add(whenRendered(getContent, 'focus', logged(log, 'focus')));
    cleanups.add(whenRendered(getContent, 'inert', logged(log, 'inert 1')));
    cleanups.add(whenRendered(getContent, 'layer', logged(log, 'layer')));
    cleanups.add(whenRendered(getContent, 'inert', logged(log, 'inert 2')));
    await nextFrame();

    expect(log).toStrictEqual(['layer', 'inert 1', 'inert 2', 'focus']);
  });

  it('drops a start that an earlier start of the same frame stopped', async () => {
    mount('<div id="content"></div>');
    const log: string[] = [];
    const stopFocus = whenRendered(getContent, 'focus', logged(log, 'focus'));
    cleanups.add(
      whenRendered(getContent, 'layer', () => {
        stopFocus();
        return () => undefined;
      }),
    );
    await nextFrame();

    expect(log).toStrictEqual([]);
  });

  it('sees the content React renders after the click handler that started it', async () => {
    const log: string[] = [];
    // Started inside the click handler, as the effects of a machine that opens, before React
    // renders: one content mounts lazily, the other is mounted hidden.
    const startEffects = (): void => {
      cleanups.add(whenRendered(() => byIdOrNull('lazy'), 'layer', logVisibility(log, 'lazy')));
      cleanups.add(
        whenRendered(() => byIdOrNull('mounted'), 'focus', logVisibility(log, 'mounted')),
      );
    };
    const screen = await render(<Overlay onOpen={startEffects} />);

    await userEvent.click(screen.getByRole('button', { name: 'Open' }));
    await expect.poll(() => log).toStrictEqual(['lazy shown', 'mounted shown']);
  });
});
