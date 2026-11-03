import path from 'node:path';

import { describeClientBoundary } from '@contour-ui/vite-config/client-boundary';

// The web build is the one a server imports. Its elements, `mergeProps`, `customProperties` and
// the services without hooks (`useStyleState`, `useRangeActions`) stay server modules, so that a
// part without behavior built on them (a styled `Button`) stays a server component; the services
// with hooks are client modules.
describeClientBoundary({
  packageDir: path.join(import.meta.dirname, '..'),
  main: 'web/index.ts',
  serverModules: [
    'web/primitive.ts',
    'web/merge-props.ts',
    'web/custom-properties.ts',
    'web/use-style-state.ts',
    'web/use-range-actions.ts',
  ],
});
