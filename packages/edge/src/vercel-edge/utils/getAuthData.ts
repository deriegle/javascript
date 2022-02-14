import { JWTPayload } from '@clerk/backend-core';
import { GetSessionTokenOptions } from '@clerk/types';
import { NextRequest } from 'next/server';

import { ClerkAPI } from '../ClerkAPI';
import { WithAuthOptions } from '../types';

export async function getAuthData(
  req: NextRequest,
  { sid, sub, loadSession, loadUser }: WithAuthOptions & JWTPayload,
) {
  const getToken = (options: GetSessionTokenOptions = {}) => {
    if (options.template) {
      throw new Error(
        'Retrieving a JWT template during edge runtime will be supported soon.',
      );
    }
    return req.cookies['__session'] || null;
  };

  const user = loadUser
    ? await ClerkAPI.users.getUser(sub as string)
    : undefined;
  const session = loadSession
    ? await ClerkAPI.sessions.getSession(sid as string)
    : undefined;

  const auth = {
    sessionId: sid as string,
    userId: sub as string,
    getToken,
  };

  return {
    auth,
    user,
    session,
  };
}
