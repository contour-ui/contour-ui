// The plugin's native API (soundor:native) for the Web, in TypeScript. The
// sandbox declares no native methods, so it is empty. A plugin with methods
// types it as `WebNativeApi` from `.soundor/generated/runtimes/web/native`,
// which `soundor gen` writes; the sandbox leaves that type out, since the
// generated files are not committed and type-checking runs without them.
export const native = {};
