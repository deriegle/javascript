import { renderJSON } from '@clerk/shared/testUtils';
import {
  Clerk,
  EmailAddressResource,
  ExternalAccountResource,
  PhoneNumberResource,
  SessionActivity,
  SessionResource,
  SessionWithActivitiesResource,
  SignInResource,
  SignUpResource,
} from '@clerk/types';
import { AuthConfig } from 'core/resources/AuthConfig';
import { ExternalAccount } from 'core/resources/ExternalAccount';
import React from 'react';
import ReactDOM from 'react-dom';

import { UserProfile } from './UserProfile';

const mockNavigate = jest.fn();
const mockUseCoreSignIn = jest.fn(
  () =>
    ({
      status: null,
    } as SignInResource),
);
const mockUseCoreSignUp = jest.fn(
  () =>
    ({
      status: null,
    } as SignUpResource),
);

const mockUseCoreSessionList = jest.fn(() => [] as SessionResource[]);

jest.mock('ui/router/RouteContext');

jest.mock('ui/hooks', () => ({
  useNavigate: jest.fn(() => {
    return {
      navigate: mockNavigate,
    };
  }),
}));

const sessionWithActivities: Partial<SessionWithActivitiesResource> = {
  id: 'sess_id',
  lastActiveAt: new Date(),
  latestActivity: {
    id: 'session_activity_1/',
    country: 'greece',
    isMobile: false,
  } as any as SessionActivity,
};

jest.mock('ui/contexts', () => ({
  useCoreSignIn: () => mockUseCoreSignIn(),
  useCoreSignUp: () => mockUseCoreSignUp(),
  useCoreSessionList: () => mockUseCoreSessionList(),
  useCoreSession: jest.fn(),
  useEnvironment: jest.fn(() => ({
    displayConfig: {
      theme: {
        general: {
          color: '#000000',
        },
      },
    },
    authConfig: {
      secondFactors: ['phone_code'],
      singleSessionMode: true,
      firstFactors: ['email_address', 'oauth_google', 'oauth_facebook'],
      emailAddressVerificationStrategies: ['email_code'],
    } as Partial<AuthConfig>,
  })),
  withCoreUserGuard: (a: any) => a,
  useCoreUser: () => {
    return {
      twoFactorEnabled: () => true,
      externalAccounts: [
        new ExternalAccount({
          id: 'fbac_yolo',
          provider: 'facebook',
          approvedScopes: 'email',
          emailAddress: 'peter@gmail.com',
          firstName: 'Peter',
          lastName: 'Smith',
          externalId: '10147951078263327',
        } as ExternalAccountResource),
      ],
      phoneNumbers: [
        {
          id: '1',
          phoneNumber: '1234',
          verification: { status: 'verified' },
          linkedTo: [],
        } as any as PhoneNumberResource,
        {
          id: '2',
          phoneNumber: '5678',
          verification: { status: 'unverified' },
          linkedTo: [],
        } as any as PhoneNumberResource,
      ],
      emailAddresses: [
        {
          id: 1,
          emailAddress: 'clerk@clerk.dev',
          verification: { status: 'verified' },
          linkedTo: [],
        } as any as EmailAddressResource,
        {
          id: 2,
          emailAddress: 'clerk-unverified@clerk.dev',
          verification: { status: 'unverified' },
          linkedTo: [],
        } as any as EmailAddressResource,
      ],
      getSessions: () => {
        return Promise.resolve([sessionWithActivities]);
      },
    };
  },
  useCoreClerk: () => {
    return {
      navigate: (to: string) => {
        mockNavigate(to);
        if (to) {
          // @ts-ignore
          window.location = new URL(to, window.location.origin);
        }
        return Promise.resolve();
      },
    } as Clerk;
  },
}));

// import { Link } from 'ui/router';

jest.mock('ui/router', () => {
  return {
    // TODO add real Route/Link
    // eslint-disable-next-line react/display-name
    Route: ({ children }: any) => <>{children}</>,
    // eslint-disable-next-line react/display-name
    Link: ({ children }: any) => <>{children}</>,
    useRouter: () => {
      return {
        params: { connected_account_id: 'fbac_yolo' },
        resolve: () => {
          return {
            toURL: {
              href: 'http://www.ssddd.com',
            },
          };
        },
      };
    },
  };
});

// @ts-ignore
ReactDOM.createPortal = node => node;

describe('<UserProfileContent />', () => {
  it('renders the UserProfileContent', async () => {
    const tree = renderJSON(<UserProfile />);
    expect(tree).toMatchSnapshot();
  });
});
