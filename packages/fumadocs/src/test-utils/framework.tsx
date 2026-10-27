import { FrameworkProvider } from 'fumadocs-core/framework';
import type { Framework, Router } from 'fumadocs-core/framework';
import {
  createContext,
  startTransition,
  use,
  useCallback,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ComponentProps, MouseEvent, ReactElement, ReactNode } from 'react';

import { isExternalHref } from '../utils/href.ts';

/** The location of a `MemoryFramework`: the pathname of the page, and the way to another one. */
interface Memory {
  readonly pathname: string;
  readonly push: (url: string) => void;
}

const MemoryContext = createContext<Memory | null>(null);

function useMemory(): Memory {
  const memory = use(MemoryContext);
  if (memory === null) {
    throw new Error('Render it inside <MemoryFramework>.');
  }
  return memory;
}

/** The pathname `url` leads to from the page at `pathname`: `#usage` stays there. */
function resolvePathname(url: string, pathname: string): string {
  return new URL(url, new URL(pathname, 'http://localhost')).pathname;
}

/** Whether a router takes a click on a link: the main button, without a modifier key. */
function isPlainClick(event: MouseEvent): boolean {
  return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

/** No route has params: the pages are plain paths. */
const NO_PARAMS: Record<string, string | string[]> = {};

/** The hooks of the framework, on the location of the nearest `MemoryFramework`. */
const memoryHooks = {
  usePathname(): string {
    return useMemory().pathname;
  },
  useParams(): Record<string, string | string[]> {
    return NO_PARAMS;
  },
  useRouter(): Router {
    const { push } = useMemory();
    return useMemo(
      () => ({
        push,
        refresh: () => {
          // Nothing to load again: the pages are in memory.
        },
      }),
      [push],
    );
  },
} satisfies Pick<Framework, 'usePathname' | 'useParams' | 'useRouter'>;

type LinkProps = ComponentProps<'a'> & { readonly prefetch?: boolean | undefined };

/**
 * The framework's `Link`: a plain `<a>`, marked `data-framework-link`, that goes to a page of the
 * site through `push` on a plain click, as a router link does. A `#fragment`, another site, a
 * link with a `target` and a click with a modifier key are left to the browser.
 */
function MemoryLink({ prefetch: _prefetch, ...props }: LinkProps): ReactElement {
  const { push } = useMemory();
  const { href, target, onClick, children } = props;
  return (
    <a
      {...props}
      href={href}
      data-framework-link=""
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          !isPlainClick(event) ||
          href === undefined ||
          href.startsWith('#') ||
          isExternalHref(href) ||
          (target !== undefined && target !== '_self')
        ) {
          return;
        }
        event.preventDefault();
        push(href);
      }}
    >
      {children}
    </a>
  );
}

export interface MemoryFrameworkProps {
  /**
   * The pathname of the page at first, as `usePathname()` returns it.
   *
   * @defaultValue '/docs'
   */
  readonly pathname?: string | undefined;
  /** Called with the URL of every navigation: `useRouter().push` and the clicks on `Link`. */
  readonly onNavigate?: ((url: string) => void) | undefined;
  readonly children?: ReactNode;
}

/**
 * The framework of fumadocs-core (`fumadocs-core/framework`) for stories and tests, in place of an
 * app's adapter (`ReactRouterProvider`…): the pathname lives in memory, `useRouter().push` changes
 * it (`#fragment` and query left out) in a transition, as a router does, and `Link` is
 * {@link MemoryLink}. The page never leaves the Storybook canvas or the test.
 */
export function MemoryFramework({
  pathname: initialPathname = '/docs',
  onNavigate,
  children,
}: MemoryFrameworkProps): ReactElement {
  const [pathname, setPathname] = useState(initialPathname);
  // The latest callback, for a `push` that keeps its identity, as a router's does.
  const latestOnNavigate = useRef(onNavigate);
  useInsertionEffect(() => {
    latestOnNavigate.current = onNavigate;
  }, [onNavigate]);
  const push = useCallback((url: string) => {
    latestOnNavigate.current?.(url);
    // As routers do (React Router, Next.js), the next page renders in a transition: after the
    // commit of the event that asked for it, so a click first closes the overlays it is in.
    startTransition(() => {
      setPathname((current) => resolvePathname(url, current));
    });
  }, []);
  const memory = useMemo<Memory>(() => ({ pathname, push }), [pathname, push]);

  return (
    <MemoryContext value={memory}>
      <FrameworkProvider {...memoryHooks} Link={MemoryLink}>
        {children}
      </FrameworkProvider>
    </MemoryContext>
  );
}
