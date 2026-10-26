import { mergeProps } from '@contour-ui/headless';
import { Card as KitCard } from '@contour-ui/kit';
import type { ComponentProps, HTMLAttributes, ReactElement, ReactNode } from 'react';
import { Link as RouterLink } from 'react-router';

import { isExternalHref } from '../lib/href.ts';

/** Grid for MDX `<Cards>` (`cards.css`): one column on phones, two from 40rem. */
export function Cards(props: ComponentProps<'div'>): ReactElement {
  return <div {...mergeProps({ className: 'docs-cards' }, props)} />;
}

/** The props of Fumadocs' MDX card, whose API the pages keep. */
export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  /** A page of this site goes through the router; another site opens in a new tab. */
  href?: string | undefined;
  /** Opens `href` in a new tab even when it is a path. */
  external?: boolean | undefined;
  /** Shown above the title (`cards.css` sizes it). */
  icon?: ReactNode;
}

/**
 * MDX `<Card>` as Kit's `Card`. With `href` the whole card is one link. The text under the title
 * is the `description` string, or the children, which MDX wraps in paragraphs. Size `lg`: its
 * padding is the section gap that spaces the text around the cards.
 */
export function Card({
  title,
  description,
  href,
  external,
  icon,
  children,
  ...props
}: CardProps): ReactElement {
  const content = (
    <>
      {icon === undefined ? null : (
        <KitCard.Header className="docs-card-icon">{icon}</KitCard.Header>
      )}
      <KitCard.Body>
        <KitCard.Title>{title}</KitCard.Title>
        {description === undefined ? null : (
          <KitCard.Description>{description}</KitCard.Description>
        )}
        {children === undefined ? null : (
          <KitCard.Description asChild>
            <div>{children}</div>
          </KitCard.Description>
        )}
      </KitCard.Body>
    </>
  );

  if (href === undefined) {
    return (
      <KitCard.Root {...props} size="lg">
        {content}
      </KitCard.Root>
    );
  }
  if (external ?? isExternalHref(href)) {
    return (
      <KitCard.Root {...props} size="lg" asChild>
        <a href={href} target="_blank" rel="noreferrer noopener">
          {content}
        </a>
      </KitCard.Root>
    );
  }
  return (
    <KitCard.Root {...props} size="lg" asChild>
      <RouterLink to={href}>{content}</RouterLink>
    </KitCard.Root>
  );
}
