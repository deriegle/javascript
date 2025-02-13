import {
  render,
  renderJSON,
  screen,
  userEvent,
  waitFor,
} from '@clerk/shared/testUtils';
import { titleize } from '@clerk/shared/utils/string';
import { Session } from 'core/resources';
import { AuthConfig } from 'core/resources/AuthConfig';
import React from 'react';
import { useCoreSignUp } from 'ui/contexts';

import { SignUpStart } from './SignUpStart';

const navigateMock = jest.fn();
const mockCreateRequest = jest.fn();
const mockSetSession = jest.fn();
const mockAuthenticateWithRedirect = jest.fn();
const mockIdentificationRequirements = jest.fn();
let mockAuthConfig: Partial<AuthConfig>;

const oldWindowLocation = window.location;
const setWindowQueryParams = (params: Array<[string, string]>) => {
  // @ts-ignore
  delete window.location;
  const u = new URL(oldWindowLocation.href);
  params.forEach(([k, v]) => u.searchParams.append(k, v));
  (window.location as any) = u;
};

jest.mock('ui/router/RouteContext');

jest.mock('ui/contexts', () => {
  return {
    useCoreSession: () => {
      return {
        id: 'sess_id',
      } as Partial<Session>;
    },
    useSignUpContext: () => {
      return {
        signInUrl: 'http://test.host/sign-in',
        navigateAfterSignUp: jest.fn(),
      };
    },
    useCoreClerk: jest.fn(() => ({
      frontendAPI: 'clerk.clerk.dev',
      setSession: mockSetSession,
    })),
    useCoreSignUp: jest.fn(() => ({
      create: mockCreateRequest,
      authenticateWithRedirect: mockAuthenticateWithRedirect,
      verifications: {
        emailAddress: {},
        phoneNumber: {},
        externalAccount: {},
      },
    })),
    useEnvironment: jest.fn(() => ({
      displayConfig: {
        applicationName: 'My test app',
        afterSignUpUrl: 'http://test.host',
      },
      authConfig: mockAuthConfig,
    })),
  };
});

jest.mock('ui/hooks', () => ({
  useNavigate: () => {
    return {
      navigate: navigateMock,
    };
  },
}));

describe('<SignUpStart/>', () => {
  const { location } = window;

  beforeEach(() => {
    mockIdentificationRequirements.mockImplementation(() => [
      ['email_address', 'oauth_google', 'oauth_facebook'],
    ]);

    mockCreateRequest.mockImplementation(() =>
      Promise.resolve({
        emailAddress: 'jdoe@example.com',
        verifications: {
          emailAddress: {
            status: 'unverified',
          },
        },
      }),
    );

    mockAuthConfig = {
      username: 'on',
      firstName: 'required',
      lastName: 'required',
      password: 'required',
      identificationRequirements: mockIdentificationRequirements(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    global.window.location = location;
  });

  it('renders the sign up start screen', async () => {
    const tree = renderJSON(<SignUpStart />);
    expect(tree).toMatchSnapshot();
  });

  it('renders the start screen, types the name, email, and password and creates a sign up attempt', async () => {
    render(<SignUpStart />);

    await userEvent.type(screen.getByLabelText('First name'), 'John');
    await userEvent.type(screen.getByLabelText('Last name'), 'Doe');
    await userEvent.type(screen.getByLabelText('Username'), 'jdoe');
    await userEvent.type(
      screen.getByLabelText('Email address'),
      'jdoe@example.com',
    );
    await userEvent.type(screen.getByLabelText('Password'), 'p@ssW0rd');

    userEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    await waitFor(() => {
      expect(mockCreateRequest).toHaveBeenCalledTimes(1);
      expect(mockCreateRequest).toHaveBeenCalledWith({
        email_address: 'jdoe@example.com',
        first_name: 'John',
        last_name: 'Doe',
        password: 'p@ssW0rd',
        username: 'jdoe',
      });
      expect(navigateMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledWith('verify-email-address');
    });
  });

  it.each(['google', 'facebook'])(
    'renders the start screen, presses the %s button and starts an oauth flow',
    async (provider: string) => {
      const providerTitle = titleize(provider);

      render(<SignUpStart />);

      const regex = new RegExp(`Sign up with ${providerTitle}`, 'i');

      userEvent.click(
        screen.getByRole('button', {
          name: regex,
        }),
      );

      await waitFor(() => {
        expect(mockAuthenticateWithRedirect).toHaveBeenCalledTimes(1);
        expect(mockAuthenticateWithRedirect).toHaveBeenCalledWith({
          strategy: `oauth_${provider}`,
          redirectUrl: 'http://localhost/#/sso-callback',
          redirectUrlComplete: 'http://test.host',
        });
      });
    },
  );

  it('renders the external account verification error if available', () => {
    const errorMsg =
      'You cannot sign up with sokratis.vidros@gmail.com since this is an invitation-only application';

    (useCoreSignUp as jest.Mock).mockImplementation(() => {
      return {
        create: mockCreateRequest,
        verifications: {
          externalAccount: {
            error: {
              code: 'not_allowed_to_sign_up',
              longMessage: errorMsg,
            },
          },
        },
      };
    });

    render(<SignUpStart />);

    expect(screen.getByText(errorMsg)).toBeInTheDocument();
    expect(mockCreateRequest).toHaveBeenNthCalledWith(1, {});
  });

  it('only renders the SSO buttons if no other method is supported', async () => {
    mockIdentificationRequirements.mockImplementation(() => [
      ['oauth_google', 'oauth_facebook'],
    ]);
    mockAuthConfig = {
      username: 'off',
      identificationRequirements: mockIdentificationRequirements(),
    };

    render(<SignUpStart />);
    screen.getByRole('button', { name: /Google/ });
    screen.getByRole('button', { name: /Facebook/ });
    expect(
      screen.queryByRole('button', { name: 'Sign up' }),
    ).not.toBeInTheDocument();
  });

  describe('when the user does not grant access to their Facebook account', () => {
    it('renders the external account verification error if available', async () => {
      const errorMsg = 'You did not grant access to your Facebook account';

      (useCoreSignUp as jest.Mock).mockImplementation(() => {
        return {
          create: mockCreateRequest,
          verifications: {
            externalAccount: {
              error: {
                code: 'oauth_access_denied',
                longMessage: errorMsg,
              },
            },
          },
        };
      });

      render(<SignUpStart />);

      expect(screen.getByText(errorMsg)).toBeInTheDocument();
      expect(mockCreateRequest).toHaveBeenNthCalledWith(1, {});
    });
  });

  describe('with invitation parameter', () => {
    function runTokenTests(tokenType: string) {
      describe(`with ${tokenType}`, () => {
        beforeEach(() => {
          setWindowQueryParams([[tokenType, '123456']]);
        });

        it('it auto-completes sign up flow if sign up is complete after create', async () => {
          mockCreateRequest.mockImplementation(() =>
            Promise.resolve({
              status: 'complete',
              emailAddress: 'jdoe@example.com',
            }),
          );
          render(<SignUpStart />);
          await waitFor(() => {
            expect(mockSetSession).toHaveBeenCalled();
          });
        });

        it('it does not auto-complete sign up flow if sign up if requirements are missing', async () => {
          mockCreateRequest.mockImplementation(() =>
            Promise.resolve({
              status: 'missing_requirements',
              emailAddress: 'jdoe@example.com',
              verifications: {
                emailAddress: {
                  status: 'unverified',
                },
              },
            }),
          );
          render(<SignUpStart />);
          await waitFor(() => {
            expect(mockSetSession).not.toHaveBeenCalled();
            screen.getByText(/First name/);
            screen.getByText(/Last name/);
            screen.getByText(/Password/);
            screen.getByText(/Username/);
          });
        });

        it('it displays email and waits for input if sign up is not complete', async () => {
          mockCreateRequest.mockImplementation(() =>
            Promise.resolve({
              status: 'missing_requirements',
              emailAddress: 'jdoe@example.com',
              verifications: {
                emailAddress: {
                  status: 'unverified',
                },
              },
            }),
          );
          render(<SignUpStart />);
          await waitFor(() => {
            const emailInput = screen.getByDisplayValue('jdoe@example.com');
            expect(emailInput).toBeDisabled();
          });
        });

        it('does not render the phone number field', async () => {
          mockIdentificationRequirements.mockImplementation(() => [
            ['phone_number'],
          ]);

          const { container } = render(<SignUpStart />);
          const labels = container.querySelectorAll('label');
          await waitFor(() => {
            expect(
              Array.from(labels)
                .map(l => l.htmlFor)
                .includes('phoneNumber'),
            ).toBeFalsy();
          });
        });
      });
    }

    runTokenTests('__clerk_invitation_token');
    runTokenTests('__clerk_ticket');
  });
});
