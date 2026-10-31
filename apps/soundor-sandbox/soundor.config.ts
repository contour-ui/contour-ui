import { defineSoundorConfig } from '@soundor/config';
import { juceRuntime } from '@soundor/juce-runtime';
import { webRuntime } from '@soundor/web-runtime';

export default defineSoundorConfig({
  plugin: { id: 'com.contour-ui.soundor-sandbox', name: 'Contour Sandbox' },
  // A Standalone app is enough to look at the components; no plugin formats to install.
  runtimes: [juceRuntime({ formats: ['standalone'] }), webRuntime()],
  // The JUCE template of `soundor init juce` applies a `gain` parameter to the audio.
  parameters: [
    { type: 'float', id: 'gain', label: 'Gain', min: 0, max: 1, default: 0.5, unit: 'dB' },
  ],
});
