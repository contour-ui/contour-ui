// The plugin's audio on the Web: plain Web Audio nodes between the host's
// input and output. soundor:parameters and soundor:host work here too.
import type { WebAudioSetup } from '@soundor/web-runtime/client';

export const setupAudio: WebAudioSetup = ({ input, output }) => {
  input.connect(output);
  return () => {
    input.disconnect();
  };
};
