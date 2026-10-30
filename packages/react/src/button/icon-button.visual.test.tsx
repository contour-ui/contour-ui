import { githubIcon, menuIcon, searchIcon } from '@contour-ui/icons';
import { vars } from '@contour-ui/tokens';
import type { CSSProperties, ReactElement } from 'react';

import { IconButton } from '../index.ts';
import type { IconButtonProps } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

const variants = ['solid', 'subtle', 'outline', 'ghost'] as const satisfies ReadonlyArray<
  IconButtonProps['variant']
>;
const sizes = ['sm', 'md', 'lg'] as const satisfies ReadonlyArray<IconButtonProps['size']>;
/** Grid columns: every size, then every size disabled. */
const columns = [false, true].flatMap((disabled) => sizes.map((size) => ({ size, disabled })));

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
          <IconButton
            key={`${variant}-${size}-${disabled}`}
            label={`Open menu (${variant})`}
            icon={menuIcon}
            variant={variant}
            size={size}
            disabled={disabled}
          />
        )),
      )}
    </div>
  );
}

visualStates({
  default: {
    render: () => <IconButton label="Search" icon={searchIcon} />,
  },
  variants: {
    render: () => <Variants />,
  },
  // A link rendered as an icon button with `asChild`: the icon becomes the link's content.
  'as-child': {
    render: () => (
      <IconButton asChild label="GitHub" icon={githubIcon} variant="ghost">
        {/* oxlint-disable-next-line jsx-a11y/anchor-has-content, jsx-a11y/control-has-associated-label -- IconButton gives the link its label and icon. */}
        <a href="https://github.com/contour-ui/contour-ui" />
      </IconButton>
    ),
  },
});
