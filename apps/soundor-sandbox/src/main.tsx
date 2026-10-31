import { registerFonts } from '@contour-ui/soundor';
import { render } from '@soundor/react';

import { App } from './app.tsx';

// Before the first render, so text is laid out in the token fonts from the first frame.
void registerFonts();

render(<App />);
