import type { ReactElement } from 'react';

import {
  CodeBlockTab,
  CodeBlockTabs,
  CodeBlockTabsList,
  CodeBlockTabsTrigger,
} from '../mdx/index.ts';
import type { CodeBlockTabsProps } from '../mdx/index.ts';
import { CodeExample } from './mdx.tsx';
import type { CodeLine } from './mdx.tsx';

/** The package managers of Fumadocs' `remarkNpm`, in its order, and how each adds a package. */
const PACKAGE_MANAGERS = [
  ['npm', 'install'],
  ['pnpm', 'add'],
  ['yarn', 'add'],
  ['bun', 'add'],
] as const;

/** The command of `manager` that installs `packages`, highlighted as a shell line. */
function installLine(manager: string, command: string, packages: string): CodeLine {
  return [
    [manager, 'token-function'],
    [` ${command}`, 'token-string'],
    [` ${packages}`, 'token-string'],
  ];
}

export interface PackageInstallProps extends Pick<CodeBlockTabsProps, 'groupId' | 'persist'> {
  /** The packages to install, as the block lists them: `@contour-ui/react @contour-ui/tokens`. */
  readonly packages: string;
}

/**
 * A ` ```package-install ` block as Fumadocs' `remarkNpm` writes it into a page: code block tabs
 * with the command of each package manager, npm first. Its `persist` option adds `groupId` and
 * `persist`.
 */
export function PackageInstall({ packages, groupId, persist }: PackageInstallProps): ReactElement {
  return (
    <CodeBlockTabs defaultValue="npm" groupId={groupId} persist={persist}>
      <CodeBlockTabsList>
        {PACKAGE_MANAGERS.map(([manager]) => (
          <CodeBlockTabsTrigger key={manager} value={manager}>
            {manager}
          </CodeBlockTabsTrigger>
        ))}
      </CodeBlockTabsList>
      {PACKAGE_MANAGERS.map(([manager, command]) => (
        <CodeBlockTab key={manager} value={manager}>
          <CodeExample lines={[installLine(manager, command, packages)]} />
        </CodeBlockTab>
      ))}
    </CodeBlockTabs>
  );
}

/** The root route of a React Router app. */
const REACT_ROUTER_CODE: readonly CodeLine[] = [
  [
    ['import', 'token-keyword'],
    [' { ReactRouterProvider } ', 'foreground'],
    ['from', 'token-keyword'],
    [" 'fumadocs-core/framework/react-router'", 'token-string-expression'],
    [';', 'foreground'],
  ],
];

/** The root layout of a Next.js app. */
const NEXT_CODE: readonly CodeLine[] = [
  [
    ['import', 'token-keyword'],
    [' { NextProvider } ', 'foreground'],
    ['from', 'token-keyword'],
    [" 'fumadocs-core/framework/next'", 'token-string-expression'],
    [';', 'foreground'],
  ],
];

/**
 * Two code blocks with a `tab` meta, ` ```tsx tab="React Router" ` and ` ```tsx tab="Next.js" `,
 * as Fumadocs' `remarkCodeTab` writes them into a page; `tab-group` on the first one adds
 * `groupId` and `persist`. The block of Next.js has a title.
 */
export function FrameworkTabs({
  groupId,
  persist,
}: Pick<CodeBlockTabsProps, 'groupId' | 'persist'>): ReactElement {
  return (
    <CodeBlockTabs defaultValue="React Router" groupId={groupId} persist={persist}>
      <CodeBlockTabsList>
        <CodeBlockTabsTrigger value="React Router">React Router</CodeBlockTabsTrigger>
        <CodeBlockTabsTrigger value="Next.js">Next.js</CodeBlockTabsTrigger>
      </CodeBlockTabsList>
      <CodeBlockTab value="React Router">
        <CodeExample lines={REACT_ROUTER_CODE} />
      </CodeBlockTab>
      <CodeBlockTab value="Next.js">
        <CodeExample lines={NEXT_CODE} title="app/layout.tsx" />
      </CodeBlockTab>
    </CodeBlockTabs>
  );
}
