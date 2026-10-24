import { HomeLayout } from 'fumadocs-ui/layouts/home';
import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { baseOptions } from '../lib/layout.shared.tsx';

/** The shipped packages; each has its own docs section. */
const PACKAGES = [
  { title: 'Kit', href: '/docs/kit', description: 'Styled general-purpose components.' },
  {
    title: 'Audio',
    href: '/docs/audio',
    description: 'Styled controls for audio-plugin UIs, built on Kit.',
  },
  {
    title: 'Headless',
    href: '/docs/headless',
    description: 'Unstyled components for your own look.',
  },
] as const;

export function meta(): Array<Record<string, string>> {
  return [
    { title: 'contour-ui' },
    { name: 'description', content: 'Design system for audio-plugin UIs and general web UI.' },
  ];
}

export default function Home(): ReactElement {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-4 py-16">
        <div className="text-center">
          <h1 className="mb-2 text-2xl font-bold">contour-ui</h1>
          <p className="mb-6 text-fd-muted-foreground">
            Design system for audio-plugin UIs and general web UI.
          </p>
          <Link
            className="rounded-full bg-fd-primary px-4 py-2.5 text-sm font-medium text-fd-primary-foreground"
            to="/docs/guide"
          >
            How it works
          </Link>
        </div>
        <ul className="grid gap-4 sm:grid-cols-3">
          {PACKAGES.map(({ title, href, description }) => (
            <li key={href}>
              <Link
                className="block h-full rounded-xl border border-fd-border bg-fd-card p-4 transition-colors hover:bg-fd-accent"
                to={href}
              >
                <span className="font-medium">{title}</span>
                <span className="mt-1 block text-sm text-fd-muted-foreground">{description}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </HomeLayout>
  );
}
