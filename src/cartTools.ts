import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getOpenApiSpec } from "lib/openapis";
import { ChatOpenAI } from "@langchain/openai";
// import { ToolNode } from "@langchain/langgraph/prebuilt";
import { execGetRequestTool, execPostRequestTool } from "./apiTools";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { MemorySaver } from "@langchain/langgraph";

const apiSpec = "https://elasticpath.dev/assets/openapispecs/carts/OpenAPISpec.yaml";
const AGENT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";

// Initialize memory to persist state between graph runs
const checkpointer = new MemorySaver();

// Create the React agent
const cartAgent = createReactAgent({
  llm: new ChatOpenAI({
    model: AGENT_MODEL,
    temperature: 0,
  }),
  tools: [execGetRequestTool, execPostRequestTool],
  checkpointSaver: checkpointer,
  
});

/**
 * Cart tool
 * @param query - The query to add a product to the cart, or update or remove a product from the cart
 * @returns The result of the cart operation
 */
export const cartTool = tool(
  async ({ query }) => {
    console.log(` : ${query}`);
    const specDetails = await getOpenApiSpec(query, apiSpec);
    //console.log(`specDetails: ${JSON.stringify(specDetails).substring(0, 100)}...`);
    console.log(`specDetails: ${JSON.stringify(specDetails)}`);

    const systemMessage = {
      role: "system",
      content: `
        Given a query string in the form of an action, like add product <name> or <id> to cart, 
        and the OpenAPI spec that should be used to answer the query, execute a GET or POST request to complete the task using the right tool.
        Use the cart ID in the messages to identify the cart to interact with.
        
      `.trim()
    };

    systemMessage.content += ` Here is the query: ${query} `;

    systemMessage.content += ` Here are the API specs available: ${JSON.stringify(specDetails)} `;

    const result = await cartAgent.invoke({ messages: [systemMessage] });
    console.log(`cartTool result: ${result}`);
    
    return result;
  },
  {
    name: "cartTool",
    description: "Manage the shopping cart, add or update a product to the cart. It also performs checkout and returns the order ID.",
    schema: z.object({
      query: z.string().describe("The query to add a product to the cart, or update or remove a product from the cart"),
    })
  }
);


