import { MembershipRole } from './organizationMembership';

export interface OrganizationInvitationResource {
  id: string;
  emailAddress: string;
  organizationId: string;
  role: MembershipRole;
  status: OrganizationInvitationStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type OrganizationInvitationStatus = 'pending' | 'accepted' | 'revoked';
