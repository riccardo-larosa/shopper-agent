import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getOpenApiSpec } from "lib/openapis";
import { ChatOpenAI } from "@langchain/openai";

const apiSpec = "https://elasticpath.dev/assets/openapispecs/files/files.yaml";
const AGENT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";

export const fileTool = tool(
  async ({ query }) => {

    console.log(`fileTool: ${query}`);
    const specDetails = await getOpenApiSpec(query, apiSpec);
    console.log(`specDetails: ${JSON.stringify(specDetails).substring(0, 100)}...`);

    const llm = new ChatOpenAI({
      model: AGENT_MODEL,
      temperature: 0,
    });

    const systemMessage = {
      role: "system",
      content: `
        You are a merchandiser.
        Products can also have associated rich media assets, such as product images or a file containing additional product details. 
        You can do this using the Files API.
        
        Using the Open API specs build a GET request to complete the task with the right parameters.
        This will be used later to execute the API call.
      `.trim()
    };

    systemMessage.content += ` Here is the query: ${query} `;

    systemMessage.content += ` Here are the Open API specs available: ${JSON.stringify(specDetails)} `;

    const result = await llm.invoke([systemMessage]);
    console.log(`fileTool result: ${result.content}`);
    return result;
  },
  {
    name: "fileTool",
    description: "Manage the files for a product",
    schema: z.object({
      query: z.string().describe("The query to manage the files"),
    })
  }
);



