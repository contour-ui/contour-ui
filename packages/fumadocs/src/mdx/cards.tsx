import { mergeProps } from '@contour-ui/headless-react';
import { Card as StyledCard } from '@contour-ui/react';
import { Link as FrameworkLink } from 'fumadocs-core/framework';
import type { ComponentProps, HTMLAttributes, ReactElement, ReactNode } from 'react';

import { isExternalHref } from '../utils/href.ts';

export type CardsProps = ComponentProps<'div'>;

/** Grid for MDX `<Cards>` (`cards.css`): one column on phones, two from 40rem. */
export function Cards(props: CardsProps): ReactElement {
  return <div {...mergeProps({ className: 'contour-docs-cards' }, props)} />;
}

/** The props of Fumadocs' MDX card, whose API the pages keep. */
export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  /**
   * A page of this site goes through the framework's link (`fumadocs-core/framework`); another
   * site opens in a new tab, and the name of the card says so.
   */
  href?: string | undefined;
  /** Opens `href` in a new tab even when it is a path. */
  external?: boolean | undefined;
  /** Shown above the title (`cards.css` sizes it). */
  icon?: ReactNode;
}

/**
 * MDX `<Card>` as the styled `Card`. With `href` the whole card is one link. The title looks like
 * the Card's but is no heading: cards follow the page's `h1` or any heading, and a heading level of
 * their own would break the outline of the page. The text under the title is the `description`
 * string, or the children, which MDX wraps in paragraphs. Size `lg`: its padding is the section
 * gap that spaces the text around the cards.
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
  const rootProps = mergeProps({ className: 'contour-docs-card' }, props);
  const content = (
    <>
      {icon === undefined ? null : (
        <StyledCard.Header className="contour-docs-card__icon">{icon}</StyledCard.Header>
      )}
      <StyledCard.Body>
        <StyledCard.Title asChild>
          <span>{title}</span>
        </StyledCard.Title>
        {description === undefined ? null : (
          <StyledCard.Description>{description}</StyledCard.Description>
        )}
        {children === undefined ? null : (
          <StyledCard.Description asChild>
            <div>{children}</div>
          </StyledCard.Description>
        )}
      </StyledCard.Body>
    </>
  );

  if (href === undefined) {
    return (
      <StyledCard.Root {...rootProps} size="lg">
        {content}
      </StyledCard.Root>
    );
  }
  if (external ?? isExternalHref(href)) {
    return (
      <StyledCard.Root {...rootProps} size="lg" asChild>
        <a href={href} target="_blank" rel="noreferrer noopener">
          {content}
          {/* The end of its name, as for the site's other links to another site (`cards.css`). */}
          <span className="contour-docs-card__new-tab">{' (opens in a new tab)'}</span>
        </a>
      </StyledCard.Root>
    );
  }
  return (
    <StyledCard.Root {...rootProps} size="lg" asChild>
      <FrameworkLink href={href}>{content}</FrameworkLink>
    </StyledCard.Root>
  );
}
