import { EpAuthentication } from '../types/ep-auth'
import { getToken } from './apiTools'

export async function resolveEpRequestParams(
  epAuthentication: EpAuthentication,
  baseUrl?: string
): Promise<{
  token: string
  customHeaders?: Record<string, string>
  baseUrl: string
}> {
  if ('__access_token' in epAuthentication) {
    const { epStoreId, epOrganizationId, __access_token } = epAuthentication
    return {
      token: epAuthentication.__access_token,
      baseUrl,
      customHeaders: {
        ...(epStoreId && { 'Ep-Store-Id': epStoreId }),
        ...(epOrganizationId && { 'Ep-Org-Id': epOrganizationId })
      }
    }
  } else {
    const { grantType, clientId, __clientSecret } = epAuthentication
    return {
      token: (
        await getToken({
          grantType,
          baseUrl,
          clientId,
          clientSecret: __clientSecret
        })
      ).access_token,
      baseUrl
    }
  }
}
