/*
 * What a Button does on every platform: one file, run in Chromium (`react`) and on Soundor's
 * simulated runtime (`react:soundor`) through the test harness. How it looks is a test of each
 * platform: `button.web.test.tsx` (the classes and the stylesheet), `button.soundor.test.tsx`
 * (the styles from the token values).
 */
import { Primitive } from '@contour-ui/primitive';
import { harness } from '@contour-ui/test-harness';
import { describe, expect, it, vi } from 'vite-plus/test';

import { Button } from './button.tsx';

const { getByRole, hasFocus, semantics, user } = harness;

describe('Button', () => {
  it('is a button named by its label, and a press calls onPress', async () => {
    const onPress = vi.fn<() => void>();
    await harness.render(<Button onPress={onPress}>Save</Button>);
    const button = getByRole('button', { name: 'Save' });

    expect(semantics(button)).toMatchObject({ role: 'button', name: 'Save', disabled: false });

    await user.press(button);

    expect(onPress).toHaveBeenCalledOnce();
  });

  it('takes focus from Tab, and Enter or Space presses it', async () => {
    const onPress = vi.fn<() => void>();
    await harness.render(<Button onPress={onPress}>Save</Button>);

    await user.tab();

    expect(hasFocus(getByRole('button', { name: 'Save' }))).toBe(true);

    await user.keyboard('{Enter}');
    await user.keyboard(' ');

    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('is off while disabled: no presses, no focus, disabled to assistive technology', async () => {
    const onPress = vi.fn<() => void>();
    await harness.render(
      <Primitive.div>
        <Button disabled onPress={onPress}>
          Save
        </Button>
        <Button>Other</Button>
      </Primitive.div>,
    );
    const button = getByRole('button', { name: 'Save' });

    expect(semantics(button).disabled).toBe(true);

    await user.press(button);
    await user.tab();

    expect(onPress).not.toHaveBeenCalled();
    expect(hasFocus(button)).toBe(false);
    expect(hasFocus(getByRole('button', { name: 'Other' }))).toBe(true);
  });

  it('turns on again: pressed, focused and enabled to assistive technology', async () => {
    const onPress = vi.fn<() => void>();
    const view = await harness.render(
      <Button disabled onPress={onPress}>
        Save
      </Button>,
    );

    await view.rerender(<Button onPress={onPress}>Save</Button>);
    const button = getByRole('button', { name: 'Save' });
    await user.tab();
    await user.keyboard('{Enter}');

    expect(semantics(button).disabled).toBe(false);
    expect(hasFocus(button)).toBe(true);
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('gives up its focus as it turns disabled', async () => {
    const view = await harness.render(<Button>Save</Button>);
    await user.tab();
    const button = getByRole('button', { name: 'Save' });

    expect(hasFocus(button)).toBe(true);

    await view.rerender(<Button disabled>Save</Button>);

    // A browser moves the focus away as it next updates the rendering (the focus fixup rule).
    await expect.poll(() => hasFocus(button)).toBe(false);
  });

  it('is named by a label of strings and numbers as one text', async () => {
    const count = 3;
    await harness.render(<Button>Save {count} items</Button>);

    expect(semantics(getByRole('button', { name: 'Save 3 items' })).name).toBe('Save 3 items');
  });
});
