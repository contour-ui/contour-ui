import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { App } from './app.tsx';

import '@contour-ui/tokens/tokens.css';
import '@contour-ui/fonts/fonts.css';
import '@contour-ui/react/styles.css';
import './styles.css';

const container = document.querySelector('#root');
if (container === null) {
  throw new Error('Missing #root element');
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
