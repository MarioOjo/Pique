import type { Persistence, ReactNativeAsyncStorage } from 'firebase/auth';

// Metro resolves firebase/auth to the React Native build, which exports
// getReactNativePersistence, but the package's public typings omit it.
declare module 'firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
