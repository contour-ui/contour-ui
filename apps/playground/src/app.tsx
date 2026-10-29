import { AudioPlaceholder } from '@contour-ui/audio';
import { Placeholder as HeadlessPlaceholder } from '@contour-ui/headless-react';
import { Placeholder } from '@contour-ui/kit';
import { defaultTheme, themeAttribute, themes } from '@contour-ui/tokens';
import type { Theme } from '@contour-ui/tokens';
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';

/** Sandbox: components come from package sources via the `@contour-ui/source` condition (HMR, no build). */
export function App(): ReactElement {
  const [theme, setTheme] = useState<Theme>(defaultTheme);

  useEffect(() => {
    document.documentElement.setAttribute(themeAttribute, theme);
  }, [theme]);

  return (
    <main className="playground">
      <header className="playground-header">
        <h1>contour-ui playground</h1>
        <fieldset>
          <legend>Theme</legend>
          {themes.map((name) => (
            <button
              key={name}
              type="button"
              aria-pressed={theme === name}
              onClick={() => {
                setTheme(name);
              }}
            >
              {name}
            </button>
          ))}
        </fieldset>
      </header>
      <HeadlessPlaceholder.Root>headless (unstyled)</HeadlessPlaceholder.Root>
      <Placeholder.Root>kit (styled)</Placeholder.Root>
      <AudioPlaceholder.Root>audio (-12 dB)</AudioPlaceholder.Root>
    </main>
  );
}
