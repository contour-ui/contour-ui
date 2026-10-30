import { chevronRightIcon, copyIcon, searchIcon } from '@contour-ui/icons';
import { vars } from '@contour-ui/tokens';
import type { CSSProperties, ReactElement } from 'react';
import { page, userEvent } from 'vite-plus/test/browser';

import { Button, Icon } from '../index.ts';
import type { ButtonProps } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

const variants = ['solid', 'subtle', 'outline', 'ghost'] as const satisfies ReadonlyArray<
  ButtonProps['variant']
>;
const sizes = ['sm', 'md', 'lg'] as const satisfies ReadonlyArray<ButtonProps['size']>;
/** Grid columns: every size, then every size disabled. */
const columns = [false, true].flatMap((disabled) => sizes.map((size) => ({ size, disabled })));

const capitalize = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

const row: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: vars.space['group-gap'],
};

const caption: CSSProperties = {
  font: vars.text.caption.font,
  letterSpacing: vars.text.caption.letterSpacing,
  color: vars.color.fg.muted,
};

/** Every variant in every size, enabled and disabled. */
function Variants(): ReactElement {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns.length}, max-content)`,
        alignItems: 'center',
        justifyItems: 'start',
        gap: vars.space['group-gap'],
      }}
    >
      {columns.map(({ size, disabled }) => (
        <span key={`${size}-${disabled}`} style={caption}>
          {disabled ? `${size} disabled` : size}
        </span>
      ))}
      {variants.map((variant) =>
        columns.map(({ size, disabled }) => (
          <Button
            key={`${variant}-${size}-${disabled}`}
            variant={variant}
            size={size}
            disabled={disabled}
          >
            {capitalize(variant)}
          </Button>
        )),
      )}
    </div>
  );
}

/** Icons before or after the label, sized by the button. */
function WithIcons(): ReactElement {
  return (
    <div style={{ display: 'grid', justifyItems: 'start', gap: vars.space['group-gap'] }}>
      {sizes.map((size) => (
        <div key={size} style={row}>
          <Button size={size} variant="outline">
            <Icon icon={searchIcon} />
            Search
          </Button>
          <Button size={size} variant="subtle">
            <Icon icon={copyIcon} />
            Copy
          </Button>
          <Button size={size}>
            Next
            <Icon icon={chevronRightIcon} />
          </Button>
        </div>
      ))}
    </div>
  );
}

/** A link rendered as a button with `asChild`; a disabled one does not navigate. */
function AsChild(): ReactElement {
  return (
    <div style={row}>
      <Button asChild variant="outline" disabled>
        <a href="#previous">Previous</a>
      </Button>
      <Button asChild variant="outline">
        <a href="#next">Next</a>
      </Button>
    </div>
  );
}

visualStates({
  default: {
    render: () => <Button>Get started</Button>,
  },
  variants: {
    render: () => <Variants />,
  },
  'with-icons': {
    render: () => <WithIcons />,
  },
  'as-child': {
    render: () => <AsChild />,
    // The disabled link with the focus and its ring, focused from the keyboard rather than
    // clicked: a click does nothing more, and the pointer hovers nothing.
    ready: () => userEvent.tab(),
    focused: () => page.getByRole('link', { name: 'Previous' }),
  },
});
