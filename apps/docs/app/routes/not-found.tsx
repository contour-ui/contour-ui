import { HomeLayout } from 'fumadocs-ui/layouts/home';
import type { ReactElement } from 'react';
import { Link } from 'react-router';

import { baseOptions } from '../lib/layout.shared.tsx';

export function meta(): Array<Record<string, string>> {
  return [{ title: 'Not found' }];
}

export function NotFound(): ReactElement {
  return (
    <HomeLayout {...baseOptions()}>
      <div className="flex flex-1 flex-col items-center justify-center p-4 text-center">
        <h1 className="mb-2 text-xl font-bold">Not found</h1>
        <Link className="text-sm underline" to="/docs">
          Back to docs
        </Link>
      </div>
    </HomeLayout>
  );
}

export default NotFound;
