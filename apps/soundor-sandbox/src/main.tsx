import { registerFonts } from '@contour-ui/react';
import { render } from '@soundor/react';

import { App } from './app.tsx';

// Before the first render, so text is laid out in the token fonts from the first frame.
void registerFonts();

render(<App />);
