import { VerifyCodeHandler } from '@clerk/shared/components/oneTimeCodeInput';
import {
  AttemptFactorParams,
  EmailCodeFactor,
  PasswordFactor,
  PhoneCodeFactor,
  SignInFactor,
  SignInStrategyName,
} from '@clerk/types';
import React from 'react';
import { handleError, useFieldState } from 'ui/common';
import { Body, Header } from 'ui/common/authForms';
import { useCoreClerk, useCoreSignIn, useSignInContext } from 'ui/contexts';
import { useNavigate } from 'ui/hooks';
import { useSupportEmail } from 'ui/hooks/useSupportEmail';
import { SignInFactorOneFooter } from 'ui/signIn/factorOne/SignInFactorOneFooter';

import { OTP, Password } from './../strategies';
import { determineSalutation } from './../utils';

// TODO: https://www.notion.so/clerkdev/c8719edf0d5041e0b4d263a7ee574b7c
const factorNeedsPrepare = (factor: SignInFactor) => {
  const strategiesRequiringPrepare: SignInStrategyName[] = [
    'email_code',
    'phone_code',
    'email_link',
  ];
  return strategiesRequiringPrepare.includes(factor.strategy);
};

// TODO: All this behavior should be grouped
// in a Factor class or similar
function factorsAreSame(
  prev: SignInFactor | null | undefined,
  cur: SignInFactor,
) {
  if (!prev) {
    return false;
  }

  if (prev.strategy !== cur.strategy) {
    return false;
  }

  if (
    'email_address_id' in prev &&
    'email_address_id' in cur &&
    prev.email_address_id !== cur.email_address_id
  ) {
    return false;
  }

  if (
    'phone_number_id' in prev &&
    'phone_number_id' in cur &&
    prev.phone_number_id !== cur.phone_number_id
  ) {
    return false;
  }

  return true;
}

type SignInFactorOneInputBasedProps = {
  currentFactor: EmailCodeFactor | PhoneCodeFactor | PasswordFactor;
  lastUsedFactor: SignInFactor | null;
  setLastUsedFactor: (f: SignInFactor | null) => void;
  handleShowAllStrategies: () => void;
};

export function SignInFactorOneInputBased({
  currentFactor,
  lastUsedFactor,
  setLastUsedFactor,
  handleShowAllStrategies,
}: SignInFactorOneInputBasedProps): JSX.Element | null {
  const { setSession } = useCoreClerk();
  const signIn = useCoreSignIn();
  const code = useFieldState('code', '');
  const password = useFieldState('password', '');
  const [error, setError] = React.useState<string | undefined>();

  const { navigate } = useNavigate();
  const { navigateAfterSignIn } = useSignInContext();
  const supportEmail = useSupportEmail();

  React.useEffect(() => {
    if (!currentFactor) {
      return;
    }
    const { status } = signIn.firstFactorVerification;
    const notPreparedYet = status === null;
    const shouldPrepare =
      factorNeedsPrepare(currentFactor) &&
      (notPreparedYet || !factorsAreSame(lastUsedFactor, currentFactor));

    if (shouldPrepare) {
      setLastUsedFactor(currentFactor);
      signIn.prepareFirstFactor(currentFactor as any);
    }
  }, [currentFactor]);

  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // TODO: Split verifyCode into verifyOtp + verifyPassword
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    const noop = () => {};
    const callPassedCb = (cb?: () => any): any => cb?.();
    await verifyCode(callPassedCb, noop);
  };

  const handleAnotherMethodClicked = () => {
    setError(undefined);
    handleShowAllStrategies();
  };

  const verifyCode: VerifyCodeHandler = async (verify, reject) => {
    if (!currentFactor) {
      return;
    }

    const { strategy } = currentFactor;

    let params: AttemptFactorParams;
    if (strategy === 'password') {
      params = {
        strategy,
        password: password.value,
      };
    } else {
      params = {
        strategy,
        code: code.value,
      };
    }

    try {
      const response = await signIn.attemptFirstFactor(params);

      if (response.status === 'complete') {
        verify(() =>
          setSession(response.createdSessionId, navigateAfterSignIn),
        );
        return;
      } else if (response.status === 'needs_second_factor') {
        verify(() => navigate('../factor-two'));
        return;
      } else {
        const msg = `Response: ${response.status} not supported yet.\nFor more information contact us at ${supportEmail}`;
        alert(msg);
      }
    } catch (err) {
      const field = strategy === 'password' ? [password] : [code];
      handleError(err, field, setError);
      reject('Invalid code, try again');
    }
  };

  return (
    <>
      <Header
        error={error}
        showBack
        welcomeName={determineSalutation(signIn)}
        className='cl-auth-form-header-compact'
      />
      <Body className='cl-auth-form-body-compact'>
        {currentFactor.strategy === 'password' && (
          <Password handleSubmit={handlePasswordSubmit} password={password} />
        )}
        {currentFactor.strategy === 'email_code' && (
          <OTP verifyCode={verifyCode} code={code} factor={currentFactor} />
        )}
        {currentFactor.strategy === 'phone_code' && (
          <OTP verifyCode={verifyCode} code={code} factor={currentFactor} />
        )}
      </Body>
      <SignInFactorOneFooter
        handleAnotherMethodClicked={handleAnotherMethodClicked}
      />
    </>
  );
}
