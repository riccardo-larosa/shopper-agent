export type EpTokenAuthentication = {
  __access_token: string
  epStoreId?: string
  epOrganizationId?: string
  epBaseUrl?: string
}

export type EpKeysAuthentication = {
  grantType: 'client_credentials' | 'implicit'
  clientId: string
  clientSecret: string
}

export type EpAuthentication = EpTokenAuthentication | EpKeysAuthentication
