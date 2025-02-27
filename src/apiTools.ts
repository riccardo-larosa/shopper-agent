import { execPostRequest, execGetRequest } from "lib/execRequests";
import { z } from "zod";
import { tool } from "@langchain/core/tools";


export const execGetRequestTool = tool(
  async ({ endpoint }) => {
    console.log(`execGetRequestTool: ${endpoint}`);
    const { access_token: token } = await execPostRequest("/oauth/access_token", "",
      {
        "grant_type": "implicit",
        "client_id": process.env.EP_CLIENT_ID,
      });
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

export const execPostRequestTool = tool(
  async ({ endpoint, body }) => {
    console.log(`execPostRequestTool: ${endpoint}`, body);
    const { access_token: token } = await execPostRequest("/oauth/access_token", "",
      {
        "grant_type": "implicit",
        "client_id": process.env.EP_CLIENT_ID,
      });
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
