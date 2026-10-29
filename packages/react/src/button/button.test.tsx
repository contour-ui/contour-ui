import { chevronRightIcon, githubIcon, menuIcon, xIcon } from '@contour-ui/icons';
import { vars } from '@contour-ui/tokens';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vite-plus/test';
import { userEvent } from 'vite-plus/test/browser';
import { render } from 'vitest-browser-react';

import { Button, CloseButton, Icon, IconButton } from '../index.ts';

import '@contour-ui/tokens/tokens.css';
import '../styles.css';

const sizes = ['sm', 'md', 'lg'] as const;

/** Computed value of `property` when set to `value` (resolves `var(--ct-…)`). */
function computed(property: string, value: string): string {
  const probe = document.createElement('div');
  probe.style.setProperty(property, value);
  document.body.append(probe);
  const result = getComputedStyle(probe).getPropertyValue(property);
  probe.remove();
  return result;
}

/** A length token in pixels, e.g. `24px` for `--ct-size-control-md`. */
const length = (value: string): string => computed('padding-left', value);

/** Rendered width and height of `element`. */
function sizeOf(element: Element): { width: string; height: string } {
  const { width, height } = getComputedStyle(element);
  return { width, height };
}

const square = (side: string): { width: string; height: string } => ({ width: side, height: side });

/**
 * Click `element` with a dispatched event: the pointer stays where it is, so it
 * does not hover the buttons of later tests. `false` when the click was canceled.
 */
const click = (element: Element): boolean =>
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

/** The `<svg>` of the icon inside `element`. */
function iconOf(element: Element): SVGSVGElement {
  const svg = element.querySelector('svg');
  if (svg === null) {
    throw new Error('No icon inside the element.');
  }
  return svg;
}

describe('Button', () => {
  it('is styled with semantic tokens', async () => {
    const screen = await render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });
    const accentFill = computed('background-color', vars.color.accent.fill);
    // The pointer stays where earlier tests on the page left it; over the button, it would give it
    // the hover fill.
    await userEvent.unhover(button);

    // The token resolves to a real color (tokens.css is loaded), and the kit uses it.
    expect(accentFill).toMatch(/^oklch\(/u);
    await expect.element(button).toHaveStyle({
      backgroundColor: accentFill,
      color: computed('color', vars.color.accent['on-fill']),
      height: length(vars.size['control-md']),
      paddingLeft: length(vars.space['control-inset']),
      paddingRight: length(vars.space['control-inset']),
      columnGap: length(vars.space['control-gap']),
      borderTopLeftRadius: length(vars.radius.control),
      fontFamily: computed('font-family', vars.text.label.fontFamily),
      fontSize: computed('font-size', vars.text.label.fontSize),
      fontWeight: computed('font-weight', vars.text.label.fontWeight),
    });
  });

  it('renders a button with its resolved variant and size', async () => {
    const screen = await render(
      <>
        <Button>Save</Button>
        <Button variant="ghost" size="lg">
          Cancel
        </Button>
      </>,
    );
    const save = screen.getByRole('button', { name: 'Save' });
    const cancel = screen.getByRole('button', { name: 'Cancel' });

    await expect.element(save).toHaveAttribute('type', 'button');
    await expect.element(save).toHaveAttribute('class', 'contour-button');
    await expect.element(save).toHaveAttribute('data-scope', 'button');
    await expect.element(save).toHaveAttribute('data-part', 'root');
    await expect.element(save).toHaveAttribute('data-variant', 'solid');
    await expect.element(save).toHaveAttribute('data-size', 'md');
    await expect.element(save).not.toHaveAttribute('data-disabled');
    await expect.element(cancel).toHaveAttribute('data-variant', 'ghost');
    await expect.element(cancel).toHaveAttribute('data-size', 'lg');
  });

  it('passes button props, the class name and the ref through', async () => {
    const ref = createRef<HTMLButtonElement>();
    const onClick = vi.fn<() => void>();
    const screen = await render(
      <Button ref={ref} type="submit" className="custom" aria-pressed="true" onClick={onClick}>
        Bold
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Bold' });

    await expect.element(button).toHaveAttribute('type', 'submit');
    await expect.element(button).toHaveAttribute('class', 'contour-button custom');
    await expect.element(button).toHaveAttribute('aria-pressed', 'true');
    expect(ref.current).toBe(button.element());

    click(button.element());

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('colors each variant with its tokens', async () => {
    const screen = await render(
      <>
        <Button variant="subtle">Subtle</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
      </>,
    );
    const transparent = computed('background-color', 'transparent');
    const foreground = computed('color', vars.color.fg.default);
    // Off the buttons, wherever earlier tests on the page left the pointer.
    await userEvent.unhover(screen.getByRole('button', { name: 'Ghost' }));

    await expect.element(screen.getByRole('button', { name: 'Subtle' })).toHaveStyle({
      backgroundColor: computed('background-color', vars.color.bg.hover),
      color: foreground,
    });
    await expect.element(screen.getByRole('button', { name: 'Outline' })).toHaveStyle({
      backgroundColor: transparent,
      borderTopColor: computed('border-top-color', vars.color.border.default),
      color: foreground,
    });
    await expect.element(screen.getByRole('button', { name: 'Ghost' })).toHaveStyle({
      backgroundColor: transparent,
      color: foreground,
    });
  });

  it('takes the control height of its size, and sizes its icons', async () => {
    const screen = await render(
      <>
        {sizes.map((size) => (
          <Button key={size} size={size}>
            Next {size}
            <Icon icon={chevronRightIcon} />
          </Button>
        ))}
      </>,
    );
    const buttons = sizes.map((size) =>
      screen.getByRole('button', { name: `Next ${size}` }).element(),
    );
    const iconSizes = { sm: 'icon-sm', md: 'icon-sm', lg: 'icon-md' } as const;

    expect(buttons.map((button) => getComputedStyle(button).height)).toStrictEqual(
      sizes.map((size) => length(vars.size[`control-${size}`])),
    );
    expect(buttons.map((button) => sizeOf(iconOf(button)))).toStrictEqual(
      sizes.map((size) => square(length(vars.size[iconSizes[size]]))),
    );
  });

  it('takes a larger label, inset and icon gap in lg', async () => {
    const screen = await render(
      <>
        {sizes.map((size) => (
          <Button key={size} size={size}>
            Save {size}
          </Button>
        ))}
      </>,
    );
    const buttons = sizes.map((size) =>
      screen.getByRole('button', { name: `Save ${size}` }).element(),
    );
    const roles = {
      sm: { text: 'label', inset: 'control-inset', gap: 'control-gap' },
      md: { text: 'label', inset: 'control-inset', gap: 'control-gap' },
      lg: { text: 'label-lg', inset: 'control-inset-lg', gap: 'control-gap-lg' },
    } as const;

    expect(
      buttons.map((button) => {
        const style = getComputedStyle(button);
        return {
          paddingLeft: style.paddingLeft,
          paddingRight: style.paddingRight,
          columnGap: style.columnGap,
          fontFamily: style.fontFamily,
          fontSize: style.fontSize,
          fontWeight: style.fontWeight,
          letterSpacing: style.letterSpacing,
        };
      }),
    ).toStrictEqual(
      sizes.map((size) => {
        const { text, inset, gap } = roles[size];
        return {
          paddingLeft: length(vars.space[inset]),
          paddingRight: length(vars.space[inset]),
          columnGap: length(vars.space[gap]),
          fontFamily: computed('font-family', vars.text[text].fontFamily),
          fontSize: computed('font-size', vars.text[text].fontSize),
          fontWeight: computed('font-weight', vars.text[text].fontWeight),
          letterSpacing: computed('letter-spacing', vars.text[text].letterSpacing),
        };
      }),
    );
  });

  it('disables a button with the disabled attribute', async () => {
    const onClick = vi.fn<() => void>();
    const screen = await render(
      <Button disabled onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });

    await expect.element(button).toBeDisabled();
    await expect.element(button).toHaveAttribute('data-disabled', '');
    await expect.element(button).not.toHaveAttribute('aria-disabled');
    await expect.element(button).toHaveStyle({
      // A disabled solid button loses its accent fill.
      backgroundColor: computed('background-color', vars.color.bg.hover),
      color: computed('color', vars.color.fg.disabled),
      cursor: 'not-allowed',
    });

    click(button.element());

    expect(onClick).not.toHaveBeenCalled();
  });

  it('hides with `hidden`, though it sets its display', async () => {
    const screen = await render(<Button hidden>Save</Button>);

    expect(getComputedStyle(screen.getByText('Save').element()).display).toBe('none');
  });

  it('renders its child with asChild', async () => {
    const ref = createRef<HTMLButtonElement>();
    const screen = await render(
      <Button asChild ref={ref} variant="outline" size="sm" className="custom">
        <a href="#docs">Docs</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Docs' });

    await expect.element(link).toHaveAttribute('href', '#docs');
    await expect.element(link).toHaveAttribute('class', 'contour-button custom');
    await expect.element(link).toHaveAttribute('data-scope', 'button');
    await expect.element(link).toHaveAttribute('data-variant', 'outline');
    await expect.element(link).toHaveAttribute('data-size', 'sm');
    await expect.element(link).not.toHaveAttribute('type');
    await expect.element(link).not.toHaveAttribute('aria-disabled');
    await expect.element(link).toHaveStyle({
      height: length(vars.size['control-sm']),
      textDecorationLine: 'none',
    });
    expect(ref.current).toBe(link.element());
  });

  it('ignores clicks on a disabled asChild link, like a disabled button', async () => {
    const onClick = vi.fn<() => void>();
    const onChildClick = vi.fn<() => void>();
    const onDocumentClick = vi.fn<() => void>();
    const screen = await render(
      <Button asChild disabled onClick={onClick}>
        <a href="#clicked" onClick={onChildClick}>
          Docs
        </a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Docs' });
    const { href } = window.location;

    await expect.element(link).toHaveAttribute('aria-disabled', 'true');
    await expect.element(link).toHaveAttribute('data-disabled', '');
    await expect.element(link).not.toHaveAttribute('disabled');

    document.addEventListener('click', onDocumentClick);
    const notCanceled = click(link.element());
    document.removeEventListener('click', onDocumentClick);

    // Canceled, so the link does not navigate; no handler sees the click.
    expect(notCanceled).toBe(false);
    expect(window.location.href).toBe(href);
    expect(onClick).not.toHaveBeenCalled();
    expect(onChildClick).not.toHaveBeenCalled();
    expect(onDocumentClick).not.toHaveBeenCalled();
  });

  it('keeps a disabled asChild link focusable and ignores Enter', async () => {
    const screen = await render(
      <Button asChild disabled>
        <a href="#entered">Docs</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Docs' });
    const { href } = window.location;

    await userEvent.tab();

    await expect.element(link).toHaveFocus();

    await userEvent.keyboard('{Enter}');

    expect(window.location.href).toBe(href);
  });

  it('shows a focus ring on keyboard focus', async () => {
    const screen = await render(<Button>Save</Button>);
    const button = screen.getByRole('button', { name: 'Save' });

    await userEvent.tab();

    await expect.element(button).toHaveFocus();
    await expect.element(button).toHaveStyle({
      outlineStyle: 'solid',
      outlineColor: computed('outline-color', vars.color.border.focus),
      outlineWidth: length(vars['border-width'].focus),
      outlineOffset: length(vars['border-width'].focus),
    });
  });

  it('reacts to hover unless disabled', async () => {
    const screen = await render(
      <>
        <Button>Save</Button>
        <Button variant="ghost">Cancel</Button>
        <Button variant="ghost" disabled>
          Delete
        </Button>
      </>,
    );
    const save = screen.getByRole('button', { name: 'Save' });
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    const remove = screen.getByRole('button', { name: 'Delete' });

    await userEvent.hover(save);

    await expect.element(save).toHaveStyle({
      backgroundColor: computed('background-color', vars.color.accent['fill-hover']),
    });

    await userEvent.hover(cancel);

    await expect.element(cancel).toHaveStyle({
      backgroundColor: computed('background-color', vars.color.bg.hover),
    });

    await userEvent.hover(remove);
    await expect.poll(() => remove.element().matches(':hover')).toBe(true);
    // A hover style would start a transition (`getAnimations` applies pending styles first);
    // wait for any to end before reading the color.
    const transitions = remove.element().getAnimations();
    await Promise.all(transitions.map(({ finished }) => finished));

    await expect.element(remove).toHaveStyle({
      backgroundColor: computed('background-color', 'transparent'),
    });

    await userEvent.unhover(remove);
  });
});

describe('IconButton', () => {
  it('is named by its label and shows a decorative icon', async () => {
    const ref = createRef<HTMLButtonElement>();
    const screen = await render(<IconButton ref={ref} label="Open menu" icon={menuIcon} />);
    const button = screen.getByRole('button', { name: 'Open menu' });

    await expect.element(button).toHaveAttribute('aria-label', 'Open menu');
    await expect.element(button).toHaveAttribute('type', 'button');
    await expect.element(button).toHaveAttribute('class', 'contour-button contour-icon-button');
    await expect.element(button).toHaveAttribute('data-scope', 'icon-button');
    await expect.element(button).toHaveAttribute('data-part', 'root');
    await expect.element(button).toHaveAttribute('data-variant', 'solid');
    await expect.element(button).toHaveAttribute('data-size', 'md');
    expect(iconOf(button.element()).getAttribute('aria-hidden')).toBe('true');
    expect(ref.current).toBe(button.element());
  });

  it('requires a label', () => {
    // @ts-expect-error -- `label` is the accessible name: an icon button cannot do without it.
    const element = <IconButton icon={menuIcon} />;

    expect(element.props).not.toHaveProperty('label');
  });

  it('is square, with no inset and a larger icon in each size', async () => {
    const screen = await render(
      <>
        {sizes.map((size) => (
          <IconButton key={size} label={`Menu ${size}`} icon={menuIcon} size={size} />
        ))}
      </>,
    );
    const buttons = sizes.map((size) =>
      screen.getByRole('button', { name: `Menu ${size}` }).element(),
    );

    expect(buttons.map((button) => sizeOf(button))).toStrictEqual(
      sizes.map((size) => square(length(vars.size[`control-${size}`]))),
    );
    // No inset in any size: the inset of a `lg` Button does not reach an IconButton.
    expect(
      buttons.map((button) => {
        const { paddingLeft, paddingRight } = getComputedStyle(button);
        return { paddingLeft, paddingRight };
      }),
    ).toStrictEqual(sizes.map(() => ({ paddingLeft: '0px', paddingRight: '0px' })));
    expect(buttons.map((button) => sizeOf(iconOf(button)))).toStrictEqual(
      sizes.map((size) => square(length(vars.size[`icon-${size}`]))),
    );
  });

  it('puts the icon into its child with asChild', async () => {
    const screen = await render(
      <IconButton asChild label="GitHub" icon={githubIcon} variant="ghost" disabled>
        <a href="#github">Repository</a>
      </IconButton>,
    );
    const link = screen.getByRole('link', { name: 'GitHub' });

    await expect.element(link).toHaveAttribute('href', '#github');
    await expect.element(link).toHaveAttribute('class', 'contour-button contour-icon-button');
    await expect.element(link).toHaveAttribute('aria-disabled', 'true');
    // The icon replaces the child's content.
    await expect.element(link).toHaveTextContent('');
    expect(iconOf(link.element()).getAttribute('aria-hidden')).toBe('true');
  });

  it('throws with asChild but no child element', async () => {
    await expect(render(<IconButton asChild label="GitHub" icon={githubIcon} />)).rejects.toThrow(
      'with `asChild`, the children must be exactly one React element',
    );
  });
});

describe('CloseButton', () => {
  it('is a ghost icon button with an x, named "Close"', async () => {
    const onClick = vi.fn<() => void>();
    const screen = await render(<CloseButton onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Close' });
    const paths = [...iconOf(button.element()).querySelectorAll('path')];

    await expect
      .element(button)
      .toHaveAttribute('class', 'contour-button contour-icon-button contour-close-button');
    await expect.element(button).toHaveAttribute('data-scope', 'close-button');
    await expect.element(button).toHaveAttribute('data-variant', 'ghost');
    expect(paths.map((path) => path.getAttribute('d'))).toStrictEqual(
      xIcon.paths.map(({ d }) => d),
    );

    click(button.element());

    expect(onClick).toHaveBeenCalledOnce();
  });

  it('takes another label, variant and size', async () => {
    const screen = await render(
      <CloseButton label="Close search" variant="outline" size="sm" className="custom" />,
    );
    const button = screen.getByRole('button', { name: 'Close search' });

    await expect
      .element(button)
      .toHaveAttribute('class', 'contour-button contour-icon-button contour-close-button custom');
    await expect.element(button).toHaveAttribute('data-variant', 'outline');
    await expect.element(button).toHaveAttribute('data-size', 'sm');
  });
});
