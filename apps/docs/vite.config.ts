import { contourSource } from '@contour-ui/vite-config';
import { reactRouter } from '@react-router/dev/vite';
import { fumadocsMdx } from 'fumadocs-mdx/vite';
import { createCssVariablesTheme } from 'shiki';
import { defineConfig } from 'vite-plus';

/**
 * Code blocks are highlighted at build time with Shiki's css-variables theme: every token is
 * colored with a `--shiki-*` variable, which Kit's CodeBlock maps to the syntax colors of the
 * tokens. One theme serves both color themes, since the tokens switch with `data-theme`.
 */
const codeTheme = createCssVariablesTheme();

export default defineConfig({
  plugins: [
    contourSource(),
    fumadocsMdx({
      // Global MDX options. The docs collection (the macro in app/lib/source.ts) sets none of
      // its own, so it compiles with these on top of the Fumadocs preset.
      globalOptions: {
        mdxOptions: {
          rehypeCodeOptions: {
            // `rehypeCode` merges its default light/dark pair into these options, and Shiki uses
            // `themes` whenever it is set, so the one theme goes in as a one-entry map whose key
            // is the default color: tokens get a plain inline `color`, as with a single theme.
            themes: { tokens: codeTheme },
            defaultColor: 'tokens',
            // `CodeBlock.Content` is the focusable scroll area, so the `pre` is not a tab stop.
            tabindex: false,
            // No language icons: the header of a code block shows its title only.
            icon: false,
          },
        },
      },
    }),
    reactRouter(),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  // Fixed port next to the playground (5173), so both can run at once.
  server: { port: 5174 },
});
