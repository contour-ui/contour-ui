import { describe, expect, it } from 'vite-plus/test';

import { createService, createTestPlatform } from '../../machine/index.ts';
import { connect } from './clipboard.connect.ts';
import { clipboardMachine } from './clipboard.machine.ts';

describe('clipboard connect', () => {
  it('reads the state and the value of the service, and sends its events', () => {
    const test = createTestPlatform(clipboardMachine);
    const service = createService(clipboardMachine, {
      props: { defaultValue: 'npm i' },
      platform: test.platform,
    });
    service.start();

    const api = connect(service);
    expect(api.copied).toBe(false);
    expect(api.value).toBe('npm i');

    api.copy();
    expect(test.log).toStrictEqual(['run writeText']);
    // Not copied until the platform has written the value.
    expect(connect(service).copied).toBe(false);
    service.send({ type: 'COPY.DONE' });
    expect(connect(service).copied).toBe(true);

    api.setValue('pnpm i');
    expect(connect(service).value).toBe('pnpm i');
    // An API holds the values of the moment it was made: connect again after a change.
    expect(api).toMatchObject({ copied: false, value: 'npm i' });

    test.advance(3000);
    expect(connect(service).copied).toBe(false);
  });
});
