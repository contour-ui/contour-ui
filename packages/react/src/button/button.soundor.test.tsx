import { soundorTokens } from '@contour-ui/tokens/soundor';
import { Text } from '@soundor/react';
import type { Style } from '@soundor/react';
import { render, screen, userEvent } from '@soundor/testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';

import { ThemeProvider } from '../theme-provider/theme-provider.soundor.tsx';
import { Button } from './button.tsx';
import type { ButtonState } from './button.tsx';

const { dark, light } = soundorTokens;

/** The focus ring: an outline outside the border, as far out as it is wide, as on the web. */
const RING = {
  outlineWidth: dark['border-width'].focus,
  outlineColor: dark.color.border.focus,
  outlineOffset: dark['border-width'].focus,
};

describe('Button', () => {
  it('is a button named by its label, and a click presses it', async () => {
    const onPress = vi.fn<() => void>();
    const user = userEvent.setup();
    await render(<Button onPress={onPress}>Save</Button>);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('takes focus from Tab, and Enter or Space presses it', async () => {
    const onPress = vi.fn<() => void>();
    const user = userEvent.setup();
    await render(<Button onPress={onPress}>Save</Button>);
    await user.tab();
    expect(screen.getByRole('button', { name: 'Save' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.keyboard(' ');
    expect(onPress).toHaveBeenCalledTimes(2);
  });

  it('is off while disabled: not pressed, not focused, disabled to assistive technology', async () => {
    const onPress = vi.fn<() => void>();
    const user = userEvent.setup();
    await render(
      <Button disabled onPress={onPress}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save', disabled: true });
    await user.click(button);
    await user.tab();
    expect(onPress).not.toHaveBeenCalled();
    expect(button).not.toHaveFocus();
  });

  it('turns off and on again: focusable and pressable once enabled', async () => {
    const onPress = vi.fn<() => void>();
    const user = userEvent.setup();
    const { rerender } = await render(
      <Button disabled onPress={onPress}>
        Save
      </Button>,
    );
    await rerender(<Button onPress={onPress}>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save', disabled: false });
    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(onPress).toHaveBeenCalledOnce();
  });

  it('sets a string label in the label style, and lg in label-lg', async () => {
    await render(
      <>
        <Button>Medium</Button>
        <Button size="lg">Large</Button>
      </>,
    );
    expect(screen.getByText('Medium').style).toMatchObject({
      ...dark.text.label,
      color: dark.color.accent['on-fill'],
    });
    expect(screen.getByText('Large').style).toMatchObject(dark.text['label-lg']);
  });

  it('sets a label of strings and numbers as one text', async () => {
    const count = 3;
    await render(<Button>Save {count} items</Button>);
    const button = screen.getByRole('button', { name: 'Save 3 items' });
    expect(button.children).toHaveLength(1);
    expect(screen.getByText('Save 3 items').style).toMatchObject(dark.text.label);
  });

  it('keeps elements in its label as they are', async () => {
    await render(
      <Button>
        <Text>Own</Text>
      </Button>,
    );
    expect(screen.getByText('Own').style).not.toHaveProperty('fontFamily');
  });

  it.each([
    ['solid', dark.color.accent.fill, 'transparent'],
    ['subtle', dark.color.bg.hover, 'transparent'],
    ['outline', 'transparent', dark.color.border.default],
    ['ghost', 'transparent', 'transparent'],
  ] as const)('draws the %s variant', async (variant, backgroundColor, borderColor) => {
    await render(<Button variant={variant}>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' }).style).toMatchObject({
      backgroundColor,
      borderColor,
      borderWidth: dark['border-width'].default,
      borderRadius: dark.radius.control,
    });
  });

  it.each([
    ['sm', dark.size['control-sm'], dark.space['control-inset']],
    ['md', dark.size['control-md'], dark.space['control-inset']],
    ['lg', dark.size['control-lg'], dark.space['control-inset-lg']],
  ] as const)('is as high as the %s control size', async (size, height, paddingHorizontal) => {
    await render(<Button size={size}>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' }).style).toMatchObject({
      height,
      paddingHorizontal,
    });
  });

  it('turns to the hover colors under the pointer', async () => {
    const user = userEvent.setup();
    await render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    await user.pointer({ target: button });
    expect(button.style).toMatchObject({ backgroundColor: dark.color.accent['fill-hover'] });
  });

  it('draws a disabled solid button in the neutral fill with the disabled text color', async () => {
    await render(<Button disabled>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' }).style).toMatchObject({
      backgroundColor: dark.color.bg.hover,
    });
    expect(screen.getByText('Save').style).toMatchObject({ color: dark.color.fg.disabled });
  });

  it('shows its focus ring when focused from the keyboard, not when pressed', async () => {
    const user = userEvent.setup();
    await render(
      <>
        <Button>Save</Button>
        <Button>Other</Button>
      </>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    await user.tab();
    expect(button.style).toMatchObject(RING);
    // Its only child is the label: the ring takes no view and no room.
    expect(button.children).toHaveLength(1);
    await user.tab();
    expect(button.style).not.toHaveProperty('outlineWidth');
    await user.click(button);
    expect(button).toHaveFocus();
    expect(button.style).not.toHaveProperty('outlineWidth');
  });

  it('shows its focus ring once a key is pressed after a press focused it', async () => {
    const user = userEvent.setup();
    await render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    await user.click(button);
    expect(button.style).not.toHaveProperty('outlineWidth');
    await user.keyboard('{ArrowDown}');
    expect(button.style).toMatchObject(RING);
  });

  it('draws no focus ring while disabled', async () => {
    const user = userEvent.setup();
    const { rerender } = await render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    await user.tab();
    expect(button.style).toMatchObject(RING);
    await rerender(<Button disabled>Save</Button>);
    expect(button.style).not.toHaveProperty('outlineWidth');
  });

  it('passes its state to a style function, whose styles win over its own', async () => {
    const user = userEvent.setup();
    const style = vi.fn<(state: ButtonState) => Style>(() => ({ borderRadius: 0 }));
    await render(<Button style={style}>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button.style).toMatchObject({ borderRadius: 0 });
    expect(style).toHaveBeenLastCalledWith(expect.objectContaining({ focusVisible: false }));
    await user.tab();
    expect(style).toHaveBeenLastCalledWith(
      expect.objectContaining({ focused: true, focusVisible: true }),
    );
  });

  it('calls the handlers it is given besides following its state', async () => {
    const onHoverIn = vi.fn<() => void>();
    const onFocus = vi.fn<() => void>();
    const user = userEvent.setup();
    await render(
      <Button onHoverIn={onHoverIn} onFocus={onFocus}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    await user.pointer({ target: button });
    await user.tab();
    expect(onHoverIn).toHaveBeenCalledOnce();
    expect(onFocus).toHaveBeenCalledOnce();
    expect(button.style).toMatchObject({
      backgroundColor: dark.color.accent['fill-hover'],
      ...RING,
    });
  });

  it('draws with the token values of the theme', async () => {
    await render(
      <ThemeProvider defaultTheme="light">
        <Button>Save</Button>
      </ThemeProvider>,
    );
    expect(screen.getByRole('button', { name: 'Save' }).style).toMatchObject({
      backgroundColor: light.color.accent.fill,
    });
  });
});
