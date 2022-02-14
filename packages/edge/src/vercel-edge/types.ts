import type { Session, User } from '@clerk/backend-core';
import type { GetSessionTokenOptions } from '@clerk/types';
import type { NextFetchEvent, NextRequest, NextResponse } from 'next/server';

export type WithAuthOptions = {
  loadUser?: boolean;
  loadSession?: boolean;
};

export type WithAuthMiddlewareCallback<Return, Options> = (
  req: RequestWithAuth<Options>,
  event: NextFetchEvent,
) => Return;

export type RequestWithAuth<Options extends WithAuthOptions = any> =
  NextRequest & {
    auth?: MiddlewareAuth;
  } & (Options extends { loadSession: true }
      ? { session: Session | null }
      : {}) &
    (Options extends { loadUser: true } ? { user: User | null } : {});

type NextMiddlewareResult = NextResponse | Response | null | undefined;

export type WithAuthNextMiddlewareHandler = (
  req: RequestWithAuth,
  event: NextFetchEvent,
) => Promise<NextMiddlewareResult>;

export type MiddlewareAuth = {
  sessionId: string | null;
  userId: string | null;
  getToken: (
    options?: GetSessionTokenOptions,
  ) => Promise<string | null> | string | null;
};
