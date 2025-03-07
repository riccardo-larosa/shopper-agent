import { execPostRequest, execGetRequest } from "lib/execRequests";
import { z } from "zod";
import { tool } from "@langchain/core/tools";

/**
 * Execute a GET request to the API
 * @param endpoint - The API endpoint to call
 * @returns The results of the GET request
 */
export const execGetRequestTool = tool(
  async ({ endpoint }) => {
    console.log(`execGetRequestTool: ${endpoint}`);
    const { access_token: token } = await getToken("implicit");
    const results = await execGetRequest(endpoint, token);
    return JSON.stringify(results);
  },
  {
    name: "execGetRequestTool",
    description: "Execute a GET request to the API",
    schema: z.object({
      endpoint: z.string().describe("The API endpoint to call"),
      // params: z.record(z.any()).optional().describe("Optional querystring parameters")
    })
  }
);

/**
 * Execute a POST request to the API
 * @param endpoint - The API endpoint to call
 * @param body - The body of the POST request
 * @returns The results of the POST request
 */
export const execPostRequestTool = tool(
  async ({ endpoint, body }) => {
    console.log(`execPostRequestTool: ${endpoint}`, body);
    const { access_token: token } = await getToken("implicit");
    const results = await execPostRequest(endpoint, token, body);
    return JSON.stringify(results);
  },
  {
    name: "execPostRequestTool",
    description: "Execute a POST request to the API",
    schema: z.object({
      endpoint: z.string().describe("The API endpoint to call"),
      body: z.record(z.any()).describe("The body of the POST request")
    })
  }
);

/**
 * Get a token for the API
 * @param grantType - The type of token to get. Must be either 'implicit' or 'client_credentials'
 * @returns The token
 */
async function getToken(grantType: string): Promise<{ access_token: any; }> {
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

  return await execPostRequest("/oauth/access_token", "", body);
}

