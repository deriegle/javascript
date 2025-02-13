import type { ClerkAPIErrorJSON, ClerkResourceJSON } from '@clerk/types';
import type {
  FapiClient,
  FapiRequestInit,
  FapiResponseJSON,
  HTTPMethod,
} from 'core/fapiClient';

import type Clerk from '../clerk';
import { clerkMissingFapiClientInResources } from '../errors';
import { ClerkAPIResponseError, Client } from './internal';

export type BaseFetchOptions = { forceUpdateClient?: boolean };

interface BaseMutateParams {
  action?: string;
  body?: any;
  method?: HTTPMethod;
  path?: string;
}

export abstract class BaseResource {
  static clerk: Clerk;
  id?: string;
  pathRoot = '';

  static get fapiClient(): FapiClient {
    return BaseResource.clerk.getFapiClient();
  }

  protected static async _fetch<J extends ClerkResourceJSON | null>(
    requestInit: FapiRequestInit,
    opts: BaseFetchOptions = {},
  ): Promise<FapiResponseJSON<J> | null> {
    if (!BaseResource.fapiClient) {
      clerkMissingFapiClientInResources();
    }

    const { payload, status, statusText } =
      await BaseResource.fapiClient.request<J>(requestInit);

    // TODO: Link to Client payload piggybacking design document
    if (requestInit.method !== 'GET' || opts.forceUpdateClient) {
      this._updateClient<J>(payload);
    }

    if (status >= 200 && status <= 299) {
      return payload;
    }

    if (status === 401) {
      await BaseResource.clerk.handleUnauthenticated();
    }

    if (status >= 400) {
      throw new ClerkAPIResponseError(statusText, {
        data: payload?.errors as ClerkAPIErrorJSON[],
        status: status,
      });
    }

    return null;
  }

  protected static _updateClient<J>(
    responseJSON: FapiResponseJSON<J> | null,
  ): void {
    if (!responseJSON) {
      return;
    }

    // TODO: Revise Client piggybacking
    const client = responseJSON.client || responseJSON.meta?.client;

    if (client && BaseResource.clerk) {
      BaseResource.clerk.updateClient(Client.getInstance().fromJSON(client));
    }
  }

  isNew(): boolean {
    return !this.id;
  }

  protected path(action?: string): string {
    const base = this.pathRoot;

    if (this.isNew()) {
      return base;
    }
    const baseWithId =
      base.replace(/[^/]$/, '$&/') + encodeURIComponent(this.id as string);

    if (!action) {
      return baseWithId;
    }

    return (
      baseWithId.replace(/[^/]$/, '$&/') + encodeURIComponent(action as string)
    );
  }

  protected abstract fromJSON(data: ClerkResourceJSON | null): this;

  protected async _baseGet<J extends ClerkResourceJSON | null>(
    opts: BaseFetchOptions = {},
  ): Promise<this> {
    const json = await BaseResource._fetch<J>(
      {
        method: 'GET',
        path: this.path(),
      },
      opts,
    );
    return this.fromJSON((json?.response || json) as J);
  }

  protected async _baseMutate<J extends ClerkResourceJSON | null>({
    action,
    body,
    method = 'POST',
    path,
  }: BaseMutateParams): Promise<this> {
    const json = await BaseResource._fetch<J>({
      method,
      path: path || this.path(action),
      body,
    });
    return this.fromJSON((json?.response || json) as J);
  }

  protected async _basePost<J extends ClerkResourceJSON | null>(
    params: BaseMutateParams = {},
  ): Promise<this> {
    return this._baseMutate<J>({ ...params, method: 'POST' });
  }

  protected async _basePut<J extends ClerkResourceJSON | null>(
    params: BaseMutateParams = {},
  ): Promise<this> {
    return this._baseMutate<J>({ ...params, method: 'PUT' });
  }

  protected async _basePatch<J extends ClerkResourceJSON>(
    params: BaseMutateParams = {},
  ): Promise<this> {
    return this._baseMutate<J>({ ...params, method: 'PATCH' });
  }

  protected async _baseDelete<J extends ClerkResourceJSON | null>(
    params: BaseMutateParams = {},
  ): Promise<void> {
    await this._baseMutate<J>({ ...params, method: 'DELETE' });
  }
}
