import type { Decorator, Preview } from '@storybook/react-vite';
import { useLayoutEffect, useState } from 'react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Theme setup of a styled package Storybook, from `@contour-ui/tokens`. */
export interface ThemeOptions {
  readonly themes: readonly string[];
  readonly defaultTheme: string;
  /** Attribute that switches the theme of a subtree (`themeAttribute`). */
  readonly attribute: string;
  /** Style of each theme's canvas: token background, text color, font. */
  readonly canvas: CSSProperties;
}

const GLOBAL = 'theme';
const SIDE_BY_SIDE = 'side-by-side';
/** Storybook toolbar icons used here. */
type IconName = 'moon' | 'sun' | 'paintbrush' | 'sidebyside';
const ICONS: Readonly<Record<string, IconName>> = { dark: 'moon', light: 'sun' };

const capitalize = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

/**
 * Renders under `<body>`, outside `#storybook-root`: play functions and a11y
 * checks only see the story once, in the default theme.
 */
function Detached({ children }: { readonly children: ReactNode }): ReactElement {
  const [host] = useState(() => document.createElement('div'));
  useLayoutEffect(() => {
    document.body.append(host);
    return () => {
      host.remove();
    };
  }, [host]);
  return createPortal(children, host);
}

interface ThemedProps {
  readonly options: ThemeOptions;
  readonly selected: string;
  readonly inDocs: boolean;
  readonly story: ReactElement;
}

function Themed({ options, selected, inDocs, story }: ThemedProps): ReactElement {
  const { themes, defaultTheme, attribute, canvas } = options;
  const sideBySide = selected === SIDE_BY_SIDE;
  const main = sideBySide ? defaultTheme : selected;

  // Overlays that portal to <body> (menus, tooltips) take the theme from <html>.
  useLayoutEffect(() => {
    document.documentElement.setAttribute(attribute, main);
  }, [attribute, main]);

  const render = (theme: string, style: CSSProperties = {}): ReactElement => (
    <div
      key={theme}
      {...{ [attribute]: theme }}
      style={{ boxSizing: 'border-box', padding: '1rem', ...canvas, ...style }}
    >
      {story}
    </div>
  );
  // The canvas fills the story view; in docs it wraps the story block.
  const fill: CSSProperties = inDocs ? {} : { minBlockSize: '100vh' };

  if (!sideBySide) {
    return render(main, fill);
  }
  const ordered = [main, ...themes.filter((theme) => theme !== main)];
  if (inDocs) {
    // Docs pages do not run play functions, so every copy can stay inline.
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${ordered.length}, minmax(0, 1fr))`,
        }}
      >
        {ordered.map((theme) => render(theme))}
      </div>
    );
  }
  const column = `${100 / ordered.length}%`;
  return (
    <>
      {render(main, { ...fill, inlineSize: column })}
      <Detached>
        <div
          style={{
            position: 'fixed',
            insetBlock: 0,
            insetInlineEnd: 0,
            inlineSize: `calc(100% - ${column})`,
            display: 'grid',
            gridAutoFlow: 'column',
            gridAutoColumns: 'minmax(0, 1fr)',
            overflow: 'auto',
          }}
        >
          {ordered.slice(1).map((theme) => render(theme))}
        </div>
      </Detached>
    </>
  );
}

/**
 * Add a "Theme" toolbar menu (every theme, plus all of them side by side) to a
 * package's preview annotations, and a decorator that draws each story on a
 * themed canvas. Story tests run in the default theme.
 */
export function withThemes(preview: Preview, options: ThemeOptions): Preview {
  const decorator: Decorator = (Story, { globals, viewMode }) => {
    const value: unknown = globals[GLOBAL];
    const selected =
      typeof value === 'string' && (value === SIDE_BY_SIDE || options.themes.includes(value))
        ? value
        : options.defaultTheme;
    return (
      <Themed
        options={options}
        selected={selected}
        inDocs={viewMode === 'docs'}
        story={<Story />}
      />
    );
  };
  const items: Array<{ value: string; title: string; icon: IconName }> = [
    ...options.themes.map((theme) => ({
      value: theme,
      title: capitalize(theme),
      icon: ICONS[theme] ?? 'paintbrush',
    })),
    { value: SIDE_BY_SIDE, title: 'Side by side', icon: 'sidebyside' },
  ];
  return {
    ...preview,
    globalTypes: {
      ...preview.globalTypes,
      [GLOBAL]: {
        description: 'Token theme of the canvas',
        toolbar: { title: 'Theme', icon: 'contrast', items, dynamicTitle: true },
      },
    },
    initialGlobals: { ...preview.initialGlobals, [GLOBAL]: options.defaultTheme },
    decorators: [...[preview.decorators ?? []].flat(), decorator],
    parameters: {
      ...preview.parameters,
      // The decorator draws the canvas: no Storybook padding or background switcher.
      layout: 'fullscreen',
      backgrounds: { disable: true },
    },
  };
}
