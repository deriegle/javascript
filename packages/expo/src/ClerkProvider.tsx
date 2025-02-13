import './polyfills';

import {
  ClerkProvider as ClerkReactProvider,
  ClerkProviderProps as ClerkReactProviderProps,
} from '@clerk/clerk-react';
import React from 'react';

import type { TokenCache } from './cache';
import { buildClerk } from './singleton';

export type ClerkProviderProps = ClerkReactProviderProps & {
  children: React.ReactNode;
  tokenCache?: TokenCache;
};

export function ClerkProvider(props: ClerkProviderProps): JSX.Element {
  const { children, tokenCache, ...rest } = props;
  const frontendApi = props.frontendApi || process.env.CLERK_FRONTEND_API || '';

  const clerkRef = React.useRef<ReturnType<typeof buildClerk> | null>(null);

  function getClerk() {
    if (clerkRef.current === null) {
      clerkRef.current = buildClerk({
        frontendApi,
        tokenCache,
      });
    }
    return clerkRef.current;
  }

  return (
    <ClerkReactProvider {...rest} Clerk={getClerk()}>
      {children}
    </ClerkReactProvider>
  );
}
