import { createElement, Fragment, StrictMode } from 'react';
import type { ReactElement } from 'react';
import { describe, expect, it } from 'vite-plus/test';
import { render } from 'vitest-browser-react';

import { createTestPlatform } from '../machine/index.ts';
import type { Platform } from '../machine/index.ts';
import { playerMachine } from '../machine/fixtures.test-utils.ts';
import type { PlayerInput, PlayerSchema } from '../machine/fixtures.test-utils.ts';
import { useMachine } from './use-machine.ts';

interface PlayerViewProps {
  readonly input: PlayerInput;
  readonly platform: Platform<PlayerSchema>;
}

/** Shows the state and the volume of a player, with buttons that send events. */
function PlayerView({ input, platform }: PlayerViewProps): ReactElement {
  const service = useMachine(playerMachine, input, platform);
  return createElement(
    Fragment,
    null,
    createElement('output', { 'aria-label': 'state' }, service.getSnapshot().state),
    createElement('output', { 'aria-label': 'volume' }, String(service.context.get('volume'))),
    createElement(
      'button',
      {
        type: 'button',
        onClick: () => {
          service.send({ type: 'PLAY' });
        },
      },
      'Play',
    ),
    createElement(
      'button',
      {
        type: 'button',
        onClick: () => {
          service.send({ type: 'VOLUME', volume: 90 });
        },
      },
      'Louder',
    ),
  );
}

describe('useMachine', () => {
  it('re-renders on a change and stops the machine on unmount', async () => {
    const test = createTestPlatform(playerMachine);
    const screen = await render(createElement(PlayerView, { input: {}, platform: test.platform }));

    await expect.element(screen.getByLabelText('state')).toHaveTextContent('stopped');
    await screen.getByRole('button', { name: 'Play' }).click();
    await expect.element(screen.getByLabelText('state')).toHaveTextContent('playing');
    expect(test.log).toStrictEqual(['run announce', 'start meter', 'start wakeLock']);

    await screen.unmount();
    expect(test.log.slice(3)).toStrictEqual(['stop wakeLock', 'stop meter']);
  });

  it('reads new props during render and runs watch actions after the commit', async () => {
    const test = createTestPlatform(playerMachine);
    const screen = await render(
      createElement(PlayerView, { input: { volume: 10 }, platform: test.platform }),
    );
    await expect.element(screen.getByLabelText('volume')).toHaveTextContent('10');

    await screen.rerender(
      createElement(PlayerView, { input: { volume: 20 }, platform: test.platform }),
    );
    await expect.element(screen.getByLabelText('volume')).toHaveTextContent('20');

    await screen.getByRole('button', { name: 'Play' }).click();
    await expect.element(screen.getByLabelText('state')).toHaveTextContent('playing');
    // `locked` is watched: turning it on stops the player.
    await screen.rerender(
      createElement(PlayerView, { input: { volume: 20, locked: true }, platform: test.platform }),
    );
    await expect.element(screen.getByLabelText('state')).toHaveTextContent('stopped');
  });

  it('keeps an owned value in the machine', async () => {
    const test = createTestPlatform(playerMachine);
    const screen = await render(createElement(PlayerView, { input: {}, platform: test.platform }));

    await screen.getByRole('button', { name: 'Louder' }).click();
    await expect.element(screen.getByLabelText('volume')).toHaveTextContent('90');
  });

  it('survives the extra unmount and mount of Strict Mode', async () => {
    const test = createTestPlatform(playerMachine);
    const screen = await render(
      createElement(
        StrictMode,
        null,
        createElement(PlayerView, { input: {}, platform: test.platform }),
      ),
    );

    await screen.getByRole('button', { name: 'Play' }).click();
    await expect.element(screen.getByLabelText('state')).toHaveTextContent('playing');
    // One machine, entered once: no second service and no doubled entry action or effect.
    expect(test.log).toStrictEqual(['run announce', 'start meter', 'start wakeLock']);

    await screen.unmount();
    expect(test.log.slice(3)).toStrictEqual(['stop wakeLock', 'stop meter']);
  });
});
