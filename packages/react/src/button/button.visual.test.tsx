import { vars } from '@contour-ui/tokens';
import type { CSSProperties, ReactElement } from 'react';

import { Button } from '../index.ts';
import type { ButtonProps } from '../index.ts';
import { visualStates } from '../test-utils/visual.ts';

const variants = ['solid', 'subtle', 'outline', 'ghost'] as const satisfies ReadonlyArray<
  ButtonProps['variant']
>;
const sizes = ['sm', 'md', 'lg'] as const satisfies ReadonlyArray<ButtonProps['size']>;
/** Grid columns: every size, then every size disabled. */
const columns = [false, true].flatMap((disabled) => sizes.map((size) => ({ size, disabled })));

const capitalize = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

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

visualStates({
  variants: {
    render: () => <Variants />,
  },
});
