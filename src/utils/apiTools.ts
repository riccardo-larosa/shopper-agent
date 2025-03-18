import { execPostRequest, execGetRequest, execPutRequest } from "lib/execRequests";
import { z } from "zod";
import { tool } from "@langchain/core/tools";

/**
 * Execute a GET request to the API
 * @param endpoint - The API endpoint to call
 * @param grantType - The type of token to get. Must be either 'implicit' or 'client_credentials'
 * @returns The results of the GET request
 */
export const execGetRequestTool = tool(
  async ({ endpoint, grantType }) => {
    console.log(`execGetRequestTool: ${endpoint}`, grantType);
    const { access_token: token } = await getToken(grantType);
    console.log(`token: ${token}`);
    const results = await execGetRequest(endpoint, token);
    return JSON.stringify(results);
  },
  {
    name: "execGetRequestTool",
    description: "Execute a GET request to the API",
    schema: z.object({
      endpoint: z.string().describe("The API endpoint to call"),
      grantType: z.enum(["implicit", "client_credentials"]).describe("The type of token to get. Must be either 'implicit' or 'client_credentials'")
    })
  }
);

/**
 * Execute a POST request to the API
 * @param endpoint - The API endpoint to call
 * @param body - The body of the POST request
 * @param grantType - The type of token to get. Must be either 'implicit' or 'client_credentials'
 * @returns The results of the POST request
 * @example
 * // Example usage:
 * const result = await execPostRequestTool.invoke({
 *   endpoint: "/carts",
 *   body: { "data": { "type": "cart" } },
 *   grantType: "implicit"
 * });
 */
export const execPostRequestTool = tool(
  async ({ endpoint, body = {}, grantType }) => {
    console.log(`execPostRequestTool: ${endpoint}`, body, grantType);
    const { access_token: token } = await getToken(grantType);
    console.log(`token: ${token}`);
    const results = await execPostRequest(endpoint, token, body);
    return JSON.stringify(results);
  },
  {
    name: "execPostRequestTool",
    description: "Execute a POST request to the API",
    schema: z.object({
      endpoint: z.string().describe("The API endpoint to call"),
      body: z.record(z.any())
        .describe("The body of the POST request - REQUIRED")
        .refine(body => Object.keys(body).length > 0, {
          message: "POST requests require a non-empty body object"
        }),
      grantType: z.enum(["implicit", "client_credentials"]).describe("The type of token to get. Must be either 'implicit' or 'client_credentials'")
    })
  }
);

/**
 * Execute a PUT request to the API
 * @param endpoint - The API endpoint to call
 * @param body - The data to send in the PUT request (can also be passed as 'data')
 * @param grantType - The type of token to get. Must be either 'implicit' or 'client_credentials'
 * @returns The results of the PUT request
 */
export const execPutRequestTool = tool(
  async ({ endpoint, body, data, grantType }) => {
    const payload = body || data;
    if (!payload) {
      throw new Error("Either 'body' or 'data' must be provided");
    }
    
    console.log(`execPutRequestTool: ${endpoint}`, payload, grantType);
    const { access_token: token } = await getToken(grantType);
    const results = await execPutRequest(endpoint, token, payload);
    return JSON.stringify(results);
  },
  {
    name: "execPutRequestTool",
    description: "Execute a PUT request to the API",
    schema: z.object({
      endpoint: z.string().describe("The API endpoint to call"),
      body: z.record(z.any()).optional().describe("The JSON data to send in the PUT request"),
      data: z.record(z.any()).optional().describe("Alternative name for the JSON data to send in the PUT request"),
      grantType: z.enum(["implicit", "client_credentials"]).describe("The type of token to get. Must be either 'implicit' or 'client_credentials'")
    })
  }
);

/**
 * Get a token for the API
 * @param grantType - The type of token to get. Must be either 'implicit' or 'client_credentials'
 * @returns The token
 */
export async function getToken(grantType: string): Promise<{ access_token: any; }> {
  if (grantType !== "implicit" && grantType !== "client_credentials") {
    throw new Error("Invalid token type. Must be either 'implicit' or 'client_credentials'");
  }

  const body: Record<string, string> = {
    "grant_type": grantType,
    "client_id": process.env.EP_CLIENT_ID,
  };

  if (grantType === "client_credentials") {
    body["client_secret"] = process.env.EP_CLIENT_SECRET;
  }

  const result = await execPostRequest("/oauth/access_token", "", body);

  return result.data;
}

