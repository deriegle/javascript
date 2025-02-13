export enum Association {
  HasOne = 'HasOne',
  HasMany = 'HasMany',
}

export type OAuthProvider =
  | 'facebook'
  | 'google'
  | 'hubspot'
  | 'github'
  | 'tiktok'
  | 'gitlab'
  | 'discord'
  | 'twitter'
  | 'twitch';

export type OAuthStrategy = `oauth_${OAuthProvider}`;

export type SignInIdentifier =
  | 'username'
  | 'email_address'
  | 'phone_number'
  | 'web3_wallet'
  | OAuthStrategy;

export type SignInFactorStrategy =
  | 'password'
  | 'email_link'
  | 'phone_code'
  | 'email_code'
  | OAuthStrategy;

export type SignInStatus =
  | 'needs_identifier'
  | 'needs_factor_one'
  | 'needs_factor_two'
  | 'complete';

export type SignUpStatus = 'missing_requirements' | 'complete' | 'abandoned';

export type SignUpIdentificationRequirements = (
  | 'email_address'
  | 'phone_number'
  | 'web3_wallet'
  | 'username'
  | OAuthStrategy
)[][];

export type SignUpAttributeRequirements = (
  | 'name_title'
  | 'name_middle'
  | 'name_last'
  | 'name_suffix'
  | 'age'
  | 'gender'
)[][];
