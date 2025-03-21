import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getOpenApiSpec } from "../lib/openapis";
import { ChatOpenAI } from "@langchain/openai";
import { execGetRequest, execPostRequest } from "../lib/execRequests";
import { RunnableConfig } from '@langchain/core/runnables';
import { ShopperConfig } from '../types/shopper-schemas';
import { resolveEpRequestParams } from '../utils/resolve-ep-request-params';

const apiSpec = "https://elasticpath.dev/assets/openapispecs/carts/OpenAPISpec.yaml";
const AGENT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";

/**
 * Enhanced cart tool that can understand user queries and execute GET/POST requests
 */
export const cartAgentTool = tool(
  async ({ query }, config: RunnableConfig<ShopperConfig>) => {
    console.log(` enhancedCartTool query : ${query}`);
    
    // Get the OpenAPI specification for carts
    const specDetails = await getOpenApiSpec(query, apiSpec);
    console.log(`enhancedCartTool specDetails: ${JSON.stringify(specDetails).substring(0, 100)}...`);

    // Set up the LLM to analyze the query
    const llm = new ChatOpenAI({
      model: AGENT_MODEL,
      temperature: 0,
    });

    // Create the system prompt for analyzing the query
    const systemMessage = {
      role: "system",
      content: `
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
      `.trim()
    };

    // Add the query and API specs to the system message
    systemMessage.content += `\n\nHere is the query: ${query}`;
    systemMessage.content += `\n\nHere are the Open API specs available: ${JSON.stringify(specDetails)}`;
    
    // Add cart ID context if available in global state
    if (global.lastShopperState?.cartId) {
      systemMessage.content += `\n\nCurrent cart ID: ${global.lastShopperState.cartId}`;
    }

    // Get the LLM's analysis of the query
    const analyzeResult = await llm.invoke([systemMessage]);
    console.log(`enhancedCartTool analysis: ${analyzeResult.content}`);
    
    try {
      // Parse the result to extract request details
      // First, try to extract the JSON directly
      const match = analyzeResult.content.toString().match(/{[\s\S]*}/);
      if (!match) {
        console.log(`enhancedCartTool match: ${match}`);
        return `Unable to parse response. Please try reformulating your query.`;
      }
      
      const responseData = JSON.parse(match[0]);
      const { requestType, endpoint, body, explanation } = responseData;
      
      // Ensure configuration is available
      if (!config?.configurable) {
        console.log(`enhancedCartTool config: ${config}`);
        return `Configuration missing. Cannot execute request.`;
      }
      
      // Get authentication parameters
      const options = await resolveEpRequestParams(
        config.configurable.epTokenAuthentication ?? config.configurable.epKeyAuthentication,
        config.configurable.epBaseUrl
      );
      
      // Replace {cartId} in the endpoint if it exists
      const processedEndpoint = endpoint.replace(
        '{cartId}', 
        global.lastShopperState?.cartId || 'default'
      );
      
      // Execute the appropriate request type
      let result;
      if (requestType === 'GET') {
        result = await execGetRequest({
          endpoint: processedEndpoint,
          ...options
        });
      } else if (requestType === 'POST') {
        result = await execPostRequest({
          endpoint: processedEndpoint,
          body,
          ...options
        });
      } else {
        return `Unsupported request type: ${requestType}. Only GET and POST are supported.`;
      }
      
      // Return the result with explanation
      return `${explanation}\n\nResult: ${JSON.stringify(result.data, null, 2)}`;
      
    } catch (error) {
      console.error('Error executing cart request:', error);
      return `Error executing request: ${error.message}`;
    }
  },
  {
    name: "enhancedCartTool",
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
    const specDetails = await getOpenApiSpec(query, apiSpec);
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