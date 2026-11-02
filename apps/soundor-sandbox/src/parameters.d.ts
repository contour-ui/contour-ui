/*
 * The parameters of soundor.config.ts, as `soundor gen` declares them in
 * `.soundor/generated/parameters.d.ts`. Declared here as well, with what the UI reads: the
 * generated files are not committed, and type-checking runs without them. Keep it equal to the
 * config.
 */
declare module 'soundor:parameters' {
  /** A plugin parameter, shared with the DSP and the host, in plain units. */
  export interface Parameter<Value> {
    readonly id: string;
    /** What the config declares of it. */
    readonly info: {
      readonly label: string;
      readonly min: number;
      readonly max: number;
      readonly default: Value;
    };
    get(): Value;
    /** Sets the value (clamped to the range) and notifies the host. */
    set(value: Value): void;
    /** Calls `listener` after every change, from the UI, automation or a preset. */
    subscribe(listener: (value: Value) => void): () => void;
    /** Starts a user interaction: the host records the changes until `endGesture()` as one. */
    beginGesture(): void;
    endGesture(): void;
  }

  /** Every parameter of soundor.config.ts, by id. */
  export const parameters: {
    /** `float`, 0 to 1, 0.5 by default: the JUCE template applies it to the audio as it is. */
    readonly gain: Parameter<number>;
  };
}
