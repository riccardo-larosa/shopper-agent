import { tool } from "@langchain/core/tools";
import { z } from "zod";
// import { execGetRequest, execPostRequest } from "../lib/execRequests";
import { getOpenApiSpec } from "lib/openapis";
import { ChatOpenAI } from "@langchain/openai";
// import { ToolNode } from "@langchain/langgraph/prebuilt";
// import { execGetRequestTool } from "./apiTools";
import { RunnableConfig } from '@langchain/core/runnables';
import { execGetRequest } from "../lib/execRequests";
import { ShopperConfig } from '../types/shopper-schemas';
import { resolveEpRequestParams } from '../utils/resolve-ep-request-params';
import { APITool } from "utils/ragTools";

const apiSpec = "https://elasticpath.dev/assets/openapispecs/catalog/catalog_view.yaml";
const AGENT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";

// Access conversation history from global state if available
const getConversationHistory = (): string[] => {
  if (global.lastShopperState && global.lastShopperState.conversationHistory) {
    return global.lastShopperState.conversationHistory;
  }
  return [];
};

const USE_RAG = true;
const API_SPEC_URL = "https://elasticpath.dev/assets/openapispecs/catalog/catalog_view.yaml";
const PRODUCT_SYSTEM_PROMPT = `
  Given a query from a user, analyze the intent and determine the appropriate API request to fulfill it.
  This tool is used to search the catalog for products, categories, or specific product attributes.
  
  Examples:
  * query: "search for red shoes"
  * query: "find products in summer collection"
  * query: "show me all categories"
  * query: "get product details for ABC123"
  
  Based on the Open API specs, create a structured response with:
  1. The request type (GET)
  2. The endpoint to use
  3. The query parameters
  
  Format your response as a JSON object with these fields:
  {
    "requestType": "GET",
    "endpoint": "/catalog/products",
    "params": {}, // Query parameters
    "explanation": "Brief explanation of what this request will do"
  }
`.trim();

/**
 * Processes a product-related query and determines the appropriate API operation
 */
async function processProductOperation(query: string, specDetails: any) {
  const llm = new ChatOpenAI({
    model: AGENT_MODEL,
    temperature: 0,
  });

  const systemMessage = {
    role: "system",
    content: [
      PRODUCT_SYSTEM_PROMPT,
      `Here is the query: ${query}`,
      `Here are the Open API specs available: ${JSON.stringify(specDetails)}`
    ].filter(Boolean).join('\n\n')
  };

  const result = await llm.invoke([systemMessage]);
  console.log(`productAgentTool analysis: ${result.content}`);

  const match = result.content.toString().match(/{[\s\S]*}/);
  if (!match) {
    throw new Error('Unable to parse response. Please try reformulating your query.');
  }
  
  const responseData = JSON.parse(match[0]);
  return responseData as {
    requestType: string;
    endpoint: string;
    params: any;
    explanation: string;
  };
}

/**
 * Executes a product catalog operation based on the request parameters
 */
async function executeProductOperation(
  endpoint: string,
  params: any,
  options: any
) {
  return await execGetRequest({
    endpoint,
    params,
    ...options
  });
}

/**
 * Main product search tool with improved structure
 */
export const searchCatalogTool = tool(
  async ({ query }, config: RunnableConfig<ShopperConfig>) => {
    console.log(`searchCatalogTool query: ${query}`);
    
    try {
      // Get API specs
      let specDetails;
      if (USE_RAG) {
        specDetails = await APITool(query, 'catalog');
      } else {
        specDetails = await getOpenApiSpec(query, API_SPEC_URL);
      }
      
      // Analyze and parse the operation
      const { endpoint, params, explanation } = await processProductOperation(query, specDetails);
      
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
      const result = await executeProductOperation(endpoint, params, options);
      
      // Return formatted result
      return `${explanation}\n\nResult: ${JSON.stringify(result.data, null, 2)}`;
      
    } catch (error) {
      console.error('Error executing catalog request:', error);
      return `Error executing request: ${error.message}`;
    }
  },
  {
    name: "searchCatalogTool",
    description: "Search the catalog for products, categories, or specific product attributes",
    schema: z.object({
      query: z.string().describe("The query to search the catalog (e.g., 'search for red shoes', 'show all categories')"),
    })
  }
);



