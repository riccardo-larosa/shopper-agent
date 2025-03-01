import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { execGetRequest, execPostRequest } from "./lib/execRequests";
import { getOpenApiSpec } from "lib/openapis";
import { ChatOpenAI } from "@langchain/openai";
// import { ToolNode } from "@langchain/langgraph/prebuilt";
// import { execGetRequestTool, execPostRequestTool } from "./apiTools";

const apiSpec = "https://elasticpath.dev/assets/openapispecs/carts/OpenAPISpec.yaml";
const AGENT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";

// const toolNode = new ToolNode([execGetRequestTool, execPostRequestTool]);

export const cartTool = tool(
  async ({ query }) => {

    console.log(` : ${query}`);
    const specDetails = await getOpenApiSpec(query, apiSpec);
    console.log(`specDetails: ${JSON.stringify(specDetails).substring(0, 100)}...`);

    const llm = new ChatOpenAI({
      model: AGENT_MODEL,
      temperature: 0,
    });

    const systemMessage = {
      role: "system",
      content: `
        Given a query string in the form of an action, like add product <name> or <id> to cart, checkout the cart, etc.
        and the OpenAPI spec that should be used to answer the query, find the right API endpoint to complete the task.
        This will be used later to execute the API call.  `.trim()
    };

    systemMessage.content += ` Here is the query: ${query} `;

    systemMessage.content += ` Here are the API specs available: ${JSON.stringify(specDetails)} `;

    const result = await llm.invoke([systemMessage]);
    console.log(`cartTool result: ${result}`);
    return result;
  },
  {
    name: "cartTool",
    description: "Manage the shopping cart, add a product to the cart, or update a product from the cart, or checkout the cart",
    schema: z.object({
      query: z.string().describe("The query to add a product to the cart, or update a product from the cart, or checkout the cart"),
    })
  }
);
