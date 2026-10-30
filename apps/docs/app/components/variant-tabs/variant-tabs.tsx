import { Link } from 'fumadocs-core/framework';
import type { ReactElement } from 'react';

export interface Variant {
  readonly label: string;
  readonly url: string;
}

interface VariantTabsProps {
  readonly variants: readonly Variant[];
  readonly current: string;
}

/** The pages of one component (Styled, Headless) as links that look like line tabs. */
export function VariantTabs({ variants, current }: VariantTabsProps): ReactElement {
  return (
    <nav aria-label="Variant" className="docs-variant-tabs">
      {variants.map((variant) => (
        <Link
          key={variant.url}
          href={variant.url}
          aria-current={variant.url === current ? 'page' : undefined}
          className="docs-variant-tabs__link"
        >
          {variant.label}
        </Link>
      ))}
    </nav>
  );
}
