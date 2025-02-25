import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { findTechnicalContent } from "./lib/mongoDBRetriever";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { execGetRequest, execPostRequest } from "./lib/execRequests";
import { ChatOpenAI } from "@langchain/openai";
import { getOpenApiSpec } from "lib/openapis";



export const getApiSpecTool = tool(
  async ({ input }) => {
    console.log(`getApiSpecTool: ${input}`);
    // TODO: Implement the product search

    // I Can't use the filter with regex in vectorSearch (MongoDB limitation)
    // const filter = {
    //   "source": { "$regex": "docs/api/catalog" }
    // };

    // take the query and use findTechnicalContent to find the spec
    const apiSpec = await findTechnicalContent(input);

    // console.log(`apiSpec: ${JSON.stringify(apiSpec)}`);

    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
    });

    const systemMessage = {
      role: "system",
      content: `
        Given a query string in the form of an action, returns the current api spec that better matches the action.
        For instance if the text is "list all products", the API spec for listing all the products will be returned.
        The API spec will look something like this:
        Docs for GET /catalog/products
        description: Retrieves the list of products from the catalog. Only the products in a live status are retrieved.
        
        parameters:
        - filter: string

        responses:
        '200':
          description: The products of a catalog.
          content:
            application/json:

      `.trim()
    };

    systemMessage.content += `
      Here is the query: ${input}
    `;

    systemMessage.content += `
      Here are the API specs available: ${JSON.stringify(apiSpec)}
    `;

    const result = await llm.invoke([systemMessage]);
    console.log(`result: ${result}`);
    return result;

    // it would be good to return a structured output from the findTechnicalContent
    // console.log(result);
    // then use the spec to search for the product executing a get request
    // const products = await execGetRequest(results.spec, token);
    // return the product id and the price
    // return JSON.stringify({ productId: "123", price: 100 });
  },
  {
    name: "getApiSpecTool",
    description: "Search for the right API spec that matches the query",
    schema: z.object({
      input: z.string(),
    })
  }
);

export const execGetRequestTool = tool(
  async ({ endpoint, params }) => {
    console.log(`execGetRequestTool: ${endpoint}`, params);
    const { access_token: token } = await execPostRequest("/oauth/access_token", "",
      {
        "grant_type": "implicit",
        "client_id": process.env.EP_CLIENT_ID,
      });
    const results = await execGetRequest(endpoint, token, params);
    return JSON.stringify(results);
  },
  {
    name: "execGetRequestTool",
    description: "Execute a GET request to the API",
    schema: z.object({
      endpoint: z.string().describe("The API endpoint to call"),
      params: z.record(z.any()).optional().describe("Optional query parameters")
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

export const getOpenApiSpecTool = tool(
  async ({ query, url }) => {
    console.log(`getOpenApiSpecTool: ${url}`);
    const spec = await getOpenApiSpec(query, url);
    return JSON.stringify(spec);
  },
  {
    name: "getOpenApiSpecTool",
    description: "Get the OpenAPI spec for the API",
    schema: z.object({
      query: z.string().describe("The query to find the right API spec"),
      url: z.string().describe("The URL of the OpenAPI spec")
    })
  }
);


export const webSearchTool = new TavilySearchResults({
  maxResults: 2,
});


export const ALL_TOOLS_LIST = [webSearchTool, getApiSpecTool, execGetRequestTool, execPostRequestTool, getOpenApiSpecTool];
