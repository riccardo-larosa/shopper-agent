import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { RunnableConfig } from '@langchain/core/runnables';
import { getOpenApiSpec } from "../lib/openapis";
import { execGetRequest, execPostRequest } from "../lib/execRequests";
import { ShopperConfig } from '../types/shopper-schemas';
import { resolveEpRequestParams } from '../utils/resolve-ep-request-params';
import { APITool, cartAPITool } from "utils/ragTools";

const USE_RAG = true
const API_SPEC_URL = "https://elasticpath.dev/assets/openapispecs/carts/OpenAPISpec.yaml";
const AGENT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";
const CART_SYSTEM_PROMPT = `
    Given a query from a user, analyze the intent and determine the appropriate API request to fulfill it.
    This tool is used to manage the shopping cart, add products to the cart, update products in the cart, or checkout the cart.
    
    Examples:
    * query: "add product ABC123 to cart"
    * query: "update quantity of product XYZ789 in cart to 3"
    * query: "checkout my cart"
    * query: "view my cart"
    * query: "remove product DEF456 from cart"
    
    Based on the Open API specs, create a structured response with:
    1. The request type (GET or POST)
    2. The endpoint to use
    3. The body parameters (for POST requests)
    
    Format your response as a JSON object with these fields:
    {
      "requestType": "GET" or "POST",
      "endpoint": "/v2/carts/{cartId}/items",
      "body": {}, // Only for POST requests
      "explanation": "Brief explanation of what this request will do"
    }
  `.trim();

/**
 * Processes a cart-related query and determines the appropriate API operation
 * @param query The user's cart-related query (e.g. "add product to cart", "view cart")
 * @param specDetails OpenAPI specification details for cart operations
 * @returns Structured response with request type, endpoint, optional body params, and explanation
 */

async function processCartOperation(query: string, specDetails: any) {
  const llm = new ChatOpenAI({
    model: AGENT_MODEL,
    temperature: 0,
  });

  const systemMessage = {
    role: "system",
    content: [
      CART_SYSTEM_PROMPT,
      `Here is the query: ${query}`,
      `Here are the Open API specs available: ${JSON.stringify(specDetails)}`,
      global.lastShopperState?.cartId ? `Current cart ID: ${global.lastShopperState?.cartId}` : null
    ].filter(Boolean).join('\n\n')
  };

  const result = await llm.invoke([systemMessage]);
  console.log(`cartAgentTool analysis: ${result.content}`);

  const match = result.content.toString().match(/{[\s\S]*}/);
  if (!match) {
    throw new Error('Unable to parse response. Please try reformulating your query.');
  }
  
  const responseData = JSON.parse(match[0]);
  return responseData as {
    requestType: string;
    endpoint: string;
    body?: any;
    explanation: string;
  };
}

/**
 * Executes a cart operation based on the request type and parameters
 * @param requestType The type of request to execute (GET or POST)
 * @param endpoint The API endpoint to call
 * @param body The body parameters for POST requests
 * @param options Authentication and configuration options
**/
async function executeCartOperation(
  requestType: string,
  endpoint: string,
  body: any,
  options: any
) {
  const processedEndpoint = endpoint.replace(
    '{cartId}',
    global.lastShopperState?.cartId || 'default'
  );

  if (requestType === 'GET') {
    return await execGetRequest({
      endpoint: processedEndpoint,
      ...options
    });
  } else if (requestType === 'POST') {
    return await execPostRequest({
      endpoint: processedEndpoint,
      body,
      ...options
    });
  }
  throw new Error(`Unsupported request type: ${requestType}. Only GET and POST are supported.`);
}

/**
 * Main tool with cleaner structure
 * @param query The user's cart-related query
 * @param config Configuration options
 * @returns Structured response with request type, endpoint, optional body params, and explanation
**/
export const cartAgentTool = tool(
  async ({ query }, config: RunnableConfig<ShopperConfig>) => {
    console.log(`cartAgentTool query: ${query}`);
    
    try {
      // Get API specs
      let specDetails 
      if (USE_RAG) {
        specDetails = await APITool(query, 'carts');
      } else {
        specDetails = await getOpenApiSpec(query, API_SPEC_URL);
      }
      
      // Analyze and parse the operation in one step
      const { requestType, endpoint, body, explanation } = await processCartOperation(query, specDetails);
      
      // Validate config
      if (!config?.configurable) {
        throw new Error('Configuration missing. Cannot execute request.');
      }
      
      // Get auth params
      const options = await resolveEpRequestParams(
        config.configurable.epTokenAuthentication ?? config.configurable.epKeyAuthentication,
        config.configurable.epBaseUrl
      );
      
      // Execute the operation
      const result = await executeCartOperation(requestType, endpoint, body, options);
      
      // Return formatted result
      return `${explanation}\n\nResult: ${JSON.stringify(result.data, null, 2)}`;
      
    } catch (error) {
      console.error('Error executing cart request:', error);
      return `Error executing request: ${error.message}`;
    }
  },
  {
    name: "cartAgentTool",
    description: "Manage shopping cart operations including viewing, adding products, updating quantities, removing items, and checkout",
    schema: z.object({
      query: z.string().describe("The query describing what you want to do with the shopping cart (e.g., 'add product X to cart', 'view my cart', 'checkout')"),
    })
  }
);

/**
 * @deprecated Use cartAgentTool instead for better API integration
 */
export const cartTool = tool(
  async ({ query }) => {
    console.log(` query : ${query}`);
    const specDetails = await getOpenApiSpec(query, API_SPEC_URL);
    console.log(`cartTool specDetails: ${JSON.stringify(specDetails).substring(0, 100)}...`);

    const llm = new ChatOpenAI({
      model: AGENT_MODEL,
      temperature: 0,
    });

    const systemMessage = {
      role: "system",
      content: `
        Given a query from a user, understand the intent in the form of an action. 
        This tool is used to manage the shopping cart, add a product to the cart, or update a product from the cart, or checkout the cart.
        Examples 
        * query: add product <n> or <id> to cart
        * action: add a product to the cart
        * query: update product <n> or <id> in cart
        * action: update a product in the cart
        * query: checkout the cart
        * action: checkout the cart
        
        Using the Open API specs build a GET or POST request to complete the task with the right parameters.
        This will be used later to execute the API call.
      `.trim()
    };

    systemMessage.content += ` Here is the query: ${query} `;

    systemMessage.content += ` Here are the Open API specs available: ${JSON.stringify(specDetails)} `;

    const result = await llm.invoke([systemMessage]);
    console.log(`cartTool result: ${result.content}`);
    return result.content;
  },
  {
    name: "cartTool",
    description: "Manage the shopping cart, add a product to the cart, or update a product from the cart, or checkout the cart",
    schema: z.object({
      query: z.string().describe("The query to add a product to the cart, or update a product from the cart, or checkout the cart"),
    })
  }
);