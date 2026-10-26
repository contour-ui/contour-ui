/**
 * Whether a link leaves this site: a URL with a scheme (`https:`, `mailto:`…) or a
 * protocol-relative one (`//host/path`). Paths and `#fragments` stay on the site.
 */
export function isExternalHref(href: string): boolean {
  return /^(?:[a-z][\d+.a-z-]*:|\/\/)/iu.test(href);
}
