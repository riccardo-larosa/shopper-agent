import { tool } from "@langchain/core/tools";
import { z } from "zod";
// import { execGetRequest, execPostRequest } from "../lib/execRequests";
import { getOpenApiSpec } from "lib/openapis";
import { ChatOpenAI } from "@langchain/openai";
// import { ToolNode } from "@langchain/langgraph/prebuilt";
// import { execGetRequestTool } from "./apiTools";

const apiSpec = "https://elasticpath.dev/assets/openapispecs/catalog/catalog_view.yaml";
const AGENT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";

// Access conversation history from global state if available
const getConversationHistory = (): string[] => {
  if (global.lastShopperState && global.lastShopperState.conversationHistory) {
    return global.lastShopperState.conversationHistory;
  }
  return [];
};

export const searchCatalogTool = tool(
  async ({ query }) => {

    console.log(`searchCatalogTool: ${query}`);
    const specDetails = await getOpenApiSpec(query, apiSpec);
    console.log(`specDetails: ${JSON.stringify(specDetails).substring(0, 100)}...`);
    
    // Get conversation history for better context
    const history = getConversationHistory();
    const historyContext = history.length > 0 
      ? `Previous conversation context:\n${history.join('\n')}\n\n` 
      : '';

    // First, plan the search action
    const planningMessage = {
      role: "system",
      content: `
        You are an action planner that converts user queries into structured catalog search plans.
        Given a user query about products or categories, break it down into:
        1. Primary search intent (what specifically are they looking for)
        2. Search parameters (filters, sorting, or other criteria)
        3. Expected results (products, categories, or other information)
        
        Example:
        Query: "Show me red shoes under $50"
        Plan:
        - Primary search intent: Find products of type "shoes" with color "red" and price under $50
        - Search parameters: product_type=shoes, color=red, price_lt=50
        - Expected results: List of matching shoe products with prices
      `.trim()
    };

    const llm = new ChatOpenAI({
      model: AGENT_MODEL,
      temperature: 0,
    });

    // Generate search plan
    const planResult = await llm.invoke([planningMessage, { role: "user", content: query }]);
    console.log(`Search plan: ${planResult.content}`);

    const systemMessage = {
      role: "system",
      content: `
        You are an API execution planner that converts search intents into precise catalog API calls.
        
        This tool is used to search the catalog for:
        - Products with specific attributes or filters
        - Categories/hierarchies/nodes in the catalog
        - Products associated with specific categories
        
        Examples:
        * Query: "show me all shoes"
          → Search for products with attributes/tags matching "shoes"
        * Query: "show me all categories"
          → Search for all hierarchies/nodes in the catalog
        * Query: "show me products in summer collection"
          → Search for products associated with the "summer" category
        
        First analyze the search plan to determine:
        1. What specific catalog entities to search for (products, categories, etc.)
        2. What parameters and filters to use
        3. Which API endpoint best matches this search need
        
        Then formulate the exact API request that will accomplish this search.
        Use ONLY endpoints from the provided OpenAPI specs.
        Validate all parameters against the requirements in the specs.
        
        Be precise and focus on translating the search intent into a valid API action.
      `.trim()
    };

    systemMessage.content += `\n\n${historyContext}User query: ${query}\n\nSearch plan: ${planResult.content}\n\nAvailable OpenAPI specs: ${JSON.stringify(specDetails)}`;

    const result = await llm.invoke([systemMessage]);
    
    // Validate the generated action against the original intent
    const validationMessage = {
      role: "system",
      content: `
        Validate if the following catalog search plan correctly addresses the user's query.
        
        User query: ${query}
        Search plan: ${planResult.content}
        API execution plan: ${result.content}
        
        Respond with either:
        "VALID" if the execution plan correctly addresses the user's query, or
        "NEEDS_REVISION: [specific reason]" if the plan doesn't properly address the query.
      `.trim()
    };
    
    const validationResult = await llm.invoke([validationMessage]);
    const validationResponse = validationResult.content.toString();
    
    if (validationResponse.includes("NEEDS_REVISION")) {
      console.log(`Validation failed: ${validationResponse}`);
      // Try one more time with the feedback
      const revisedSystemMessage = {
        role: "system",
        content: `
          Revise the catalog search plan based on this feedback: ${validationResponse}
          
          User query: ${query}
          Previous plan: ${result.content}
          Available OpenAPI specs: ${JSON.stringify(specDetails)}
        `.trim()
      };
      
      const revisedResult = await llm.invoke([revisedSystemMessage]);
      console.log(`Revised searchCatalogTool result: ${revisedResult.content}`);
      return revisedResult;
    }
    
    console.log(`searchCatalogTool result: ${result.content}`);
    return result;
  },
  {
    name: "searchCatalogTool",
    description: "Search the catalog for a product, a category/hierarchy/node, or a brand",
    schema: z.object({
      query: z.string().describe("The query to search the catalog"),
    })
  }
);



