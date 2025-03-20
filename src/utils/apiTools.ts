import {
  execPostRequest,
  execGetRequest,
  execPutRequest
} from '../lib/execRequests'
import { z } from 'zod'
import { tool } from '@langchain/core/tools'
import { RunnableConfig } from '@langchain/core/runnables'
import { MerchandiserConfig } from '../types/merchandiser-schemas'
import { resolveEpRequestParams } from './resolve-ep-request-params'

/**
 * Execute a GET request to the API
 * @param endpoint - The API endpoint to call
 * @param grantType - The type of token to get. Must be either 'implicit' or 'client_credentials'
 * @returns The results of the GET request
 */
export const execGetRequestTool = tool(
  async ({ endpoint }, config: RunnableConfig<MerchandiserConfig>) => {
    assertAuthenticationConfigPresence(config.configurable)

    const options = await resolveEpRequestParams(
      config.configurable.epTokenAuthentication ??
        config.configurable.epKeyAuthentication,
      config.configurable.epBaseUrl
    )

    const results = await execGetRequest({
      endpoint,
      ...options
    })
    return JSON.stringify(results)
  },
  {
    name: 'execGetRequestTool',
    description: 'Execute a GET request to the API',
    schema: z.object({
      endpoint: z.string().describe('The API endpoint to call')
    })
  }
)

/**
 * Execute a POST request to the API
 * @param endpoint - The API endpoint to call
 * @param body - The body of the POST request
 * @param grantType - The type of token to get. Must be either 'implicit' or 'client_credentials'
 * @returns The results of the POST request
 */
export const execPostRequestTool = tool(
  async ({ endpoint, body }, config: RunnableConfig<MerchandiserConfig>) => {
    assertAuthenticationConfigPresence(config.configurable)

    const options = await resolveEpRequestParams(
      config.configurable.epTokenAuthentication ??
        config.configurable.epKeyAuthentication,
      config.configurable.epBaseUrl
    )

    const results = await execPostRequest({
      ...options,
      endpoint,
      body
    })
    return JSON.stringify(results)
  },
  {
    name: 'execPostRequestTool',
    description: 'Execute a POST request to the API',
    schema: z.object({
      endpoint: z.string().describe('The API endpoint to call'),
      body: z
        .record(z.any())
        .describe('The body of the POST request - REQUIRED')
        .refine((body) => Object.keys(body).length > 0, {
          message: 'POST requests require a non-empty body object'
        })
    })
  }
)

/**
 * Execute a PUT request to the API
 * @param endpoint - The API endpoint to call
 * @param body - The data to send in the PUT request (can also be passed as 'data')
 * @param grantType - The type of token to get. Must be either 'implicit' or 'client_credentials'
 * @returns The results of the PUT request
 */
export const execPutRequestTool = tool(
  async (
    { endpoint, body, data },
    config: RunnableConfig<MerchandiserConfig>
  ) => {
    assertAuthenticationConfigPresence(config.configurable)

    const payload = body || data
    if (!payload) {
      throw new Error("Either 'body' or 'data' must be provided")
    }

    console.log(`execPutRequestTool: ${endpoint}`, payload)

    const options = await resolveEpRequestParams(
      config.configurable.epTokenAuthentication ??
        config.configurable.epKeyAuthentication,
      config.configurable.epBaseUrl
    )

    const results = await execPutRequest({
      ...options,
      endpoint,
      body: payload
    })
    return JSON.stringify(results)
  },
  {
    name: 'execPutRequestTool',
    description: 'Execute a PUT request to the API',
    schema: z.object({
      endpoint: z.string().describe('The API endpoint to call'),
      body: z
        .record(z.any())
        .optional()
        .describe('The JSON data to send in the PUT request'),
      data: z
        .record(z.any())
        .optional()
        .describe(
          'Alternative name for the JSON data to send in the PUT request'
        )
    })
  }
)

function assertAuthenticationConfigPresence(config: MerchandiserConfig) {
  if (!config?.epKeyAuthentication && !config?.epTokenAuthentication) {
    throw new Error(
      `No "epKeyAuthentication" or "epTokenAuthentication" found in configurable please add a authentication method`
    )
  }
}

type GetTokenImplicit = {
  grantType: 'implicit'
  clientId: string
  baseUrl: string
}

type GetTokenClientCredentials = {
  grantType: 'client_credentials'
  clientId: string
  clientSecret: string
  baseUrl: string
}

type GetTokenOptions = GetTokenImplicit | GetTokenClientCredentials

/**
 * Get a token from the API
 * @param options
 * @returns The access token
 */
export async function getToken(
  options: GetTokenOptions
): Promise<{ access_token: any }> {
  if (options.grantType === 'implicit') {
    const result = await execPostRequest({
      endpoint: '/oauth/access_token',
      token: '',
      body: {
        grant_type: 'implicit',
        client_id: options.clientId
      },
      baseUrl: options.baseUrl
    })
    return result.data
  }

  const result = await execPostRequest({
    endpoint: '/oauth/access_token',
    token: '',
    body: {
      grant_type: 'client_credentials',
      client_id: options.clientId,
      client_secret: options.clientSecret
    },
    baseUrl: options.baseUrl
  })

  return result.data
}
