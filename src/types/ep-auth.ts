export type EpTokenAuthentication = {
  __access_token: string
  epStoreId?: string
  epOrganizationId?: string
}

// Should use union type but langsmith ui doesn't render them correctly
export type EpKeysAuthentication = {
  grantType: 'client_credentials' | 'implicit'
  clientId: string
  __clientSecret?: string
}

export type EpAuthentication = EpTokenAuthentication | EpKeysAuthentication
