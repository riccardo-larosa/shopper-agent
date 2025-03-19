import {
  execPostRequest,
  execGetRequest,
  execPutRequest
} from 'lib/execRequests'
import { z } from 'zod'
import { tool } from '@langchain/core/tools'
import { RunnableConfig } from '@langchain/core/runnables'
import { MerchandiserRunnableConfigurable } from '../types/merchandiser-runnable'
import { resolveEpRequestParams } from './resolve-ep-request-params'

/**
 * Execute a GET request to the API
 * @param endpoint - The API endpoint to call
 * @param grantType - The type of token to get. Must be either 'implicit' or 'client_credentials'
 * @returns The results of the GET request
 */
export const execGetRequestTool = tool(
  async (
    { endpoint },
    config: RunnableConfig<MerchandiserRunnableConfigurable>
  ) => {
    if (!config?.configurable?.epAuthentication) {
      throw new Error(`No "epAuthentication" found in configurable`)
    }

    const options = await resolveEpRequestParams(
      config.configurable.epAuthentication,
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
  async (
    { endpoint, body },
    config: RunnableConfig<MerchandiserRunnableConfigurable>
  ) => {
    if (!config?.configurable?.epAuthentication) {
      throw new Error(`No "epAuthentication" found in configurable`)
    }

    const options = await resolveEpRequestParams(
      config.configurable.epAuthentication,
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
      endpoint: z.string().describe("The API endpoint to call"),
      body: z.record(z.any())
        .describe("The body of the POST request - REQUIRED")
        .refine(body => Object.keys(body).length > 0, {
          message: "POST requests require a non-empty body object"
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
    config: RunnableConfig<MerchandiserRunnableConfigurable>
  ) => {
    const payload = body || data
    if (!payload) {
      throw new Error("Either 'body' or 'data' must be provided")
    }

    if (!config?.configurable?.epAuthentication) {
      throw new Error(`No "epAuthentication" found in configurable`)
    }

    console.log(`execPutRequestTool: ${endpoint}`, payload)

    const options = await resolveEpRequestParams(
      config.configurable.epAuthentication,
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

/**
 * Get a token for the API
 * @param grantType - The type of token to get. Must be either 'implicit' or 'client_credentials'
 * @param baseUrl - The base URL of the API
 * @returns The token
 */
export async function getToken(
  grantType: string,
  baseUrl?: string
): Promise<{ access_token: any }> {
  if (grantType !== 'implicit' && grantType !== 'client_credentials') {
    throw new Error(
      "Invalid token type. Must be either 'implicit' or 'client_credentials'"
    )
  }

  const body: Record<string, string> = {
    grant_type: grantType,
    client_id: process.env.EP_CLIENT_ID
  }

  if (grantType === 'client_credentials') {
    body['client_secret'] = process.env.EP_CLIENT_SECRET
  }

  const result = await execPostRequest({
    endpoint: '/oauth/access_token',
    token: '',
    body,
    baseUrl
  })


    return result.data
}
