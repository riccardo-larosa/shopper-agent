import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { execGetRequest, execPostRequest } from "./lib/execRequests";
import { getOpenApiSpec } from "lib/openapis";
import { ChatOpenAI } from "@langchain/openai";
// import { ToolNode } from "@langchain/langgraph/prebuilt";
// import { execGetRequestTool } from "./apiTools";

const apiSpec = "https://elasticpath.dev/assets/openapispecs/catalog/catalog_view.yaml";
const AGENT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";

export const searchCatalogTool = tool(
  async ({ query }) => {

    console.log(`searchCatalogTool: ${query}`);
    const specDetails = await getOpenApiSpec(query, apiSpec);
    console.log(`specDetails: ${JSON.stringify(specDetails).substring(0, 100)}...`);

    const llm = new ChatOpenAI({
      model: AGENT_MODEL,
      temperature: 0,
    });

    const systemMessage = {
      role: "system",
      content: `
        Given a query string in the form of an action, like show me all shoes, show me all the categories/hierarchies/nodes,
        and the OpenAPI spec that should be used to answer the query, build a GET request to complete the task using the right tool.
        This will be used later to execute the API call.
      `.trim()
    };

    systemMessage.content += ` Here is the query: ${query} `;

    systemMessage.content += ` Here are the API specs available: ${JSON.stringify(specDetails)} `;

    const result = await llm.invoke([systemMessage]);
    console.log(`searchCatalogTool result: ${result}`);
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



