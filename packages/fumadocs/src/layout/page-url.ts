/**
 * The URL of a page as the page tree has it: the pathname without the trailing slash some
 * frameworks keep (Next.js with `trailingSlash`), so `/docs/kit/` is `/docs/kit`.
 */
export function toPageUrl(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
}
