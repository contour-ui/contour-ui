import * as ui from 'soundor:ui';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { registerFont } from './register-font.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('registerFont on Soundor', () => {
  it("passes a face on to the runtime's registerFont, and its promise back", async () => {
    const register = vi.spyOn(ui, 'registerFont').mockResolvedValue(undefined);
    await expect(registerFont('IBM Plex Sans', 'plex-500.ttf', { weight: 500 })).resolves.toBe(
      undefined,
    );
    expect(register).toHaveBeenCalledExactlyOnceWith('IBM Plex Sans', 'plex-500.ttf', {
      weight: 500,
    });
  });

  it('passes no descriptors when given none, not an undefined one', async () => {
    const register = vi.spyOn(ui, 'registerFont').mockResolvedValue(undefined);
    await registerFont('JetBrains Mono', 'mono.ttf');
    expect(register.mock.calls).toEqual([['JetBrains Mono', 'mono.ttf']]);
  });

  it('rejects as the runtime does, for a file that is no font', async () => {
    vi.spyOn(ui, 'registerFont').mockRejectedValue(new Error('not a font'));
    await expect(registerFont('Broken', 'broken.txt')).rejects.toThrow('not a font');
  });
});
