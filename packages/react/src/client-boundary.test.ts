import path from 'node:path';

import { describeClientBoundary } from '@contour-ui/vite-config/client-boundary';

describeClientBoundary({ packageDir: path.join(import.meta.dirname, '..') });
