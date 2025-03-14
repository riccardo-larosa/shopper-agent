import { z } from "zod";
import { tool } from "@langchain/core/tools";
import { findAPISpecification } from "lib/mongoDBRetriever";
import { ChatOpenAI } from "@langchain/openai";

const AGENT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";

export async function APITool(query: string, apiName: string) {

  const specResults = await findAPISpecification(query, apiName);
  const context = specResults.map(doc => doc.pageContent).join('\n\n');
  const systemMessage = {
    role: "system",
    content: `
        Given a query from a user, understand the intent in the form of an action. 
        The action will be to find the API specification.
        Using the Open API specs build a GET or POST request to complete the task with the right parameters.
        This will be used later to execute the API call.
      `.trim()
  };
  systemMessage.content += ` Here is the query: ${query} `;
  systemMessage.content += ` Here are the Open API specs available: ${context} `;

  const llm = new ChatOpenAI({
    model: AGENT_MODEL,
    temperature: 0,
  });


  const result = await llm.invoke([systemMessage]);
  console.log(`APITool result: ${result.content}`);
  return result.content;
};


export const cartAPITool = tool(
  async ({ query }: { query: string }) => {
    return await APITool(query, "carts");
  },
  {
    name: "cartAPITool",
    description: "Information about the cart API, add a product to the cart, or update a product from the cart, or checkout the cart ",
    schema: z.object({
      query: z.string().describe("The user query to match the API specification"),
    })
  }
);

export const catalogAPITool = tool(
  async ({ query }: { query: string }) => {
    return await APITool(query, "catalog");
  },
  {
    name: "catalogAPITool",
    description: "Information about the catalog API, add a product to the catalog, or update a product from the catalog, or checkout the catalog ",
    schema: z.object({
      query: z.string().describe("The user query to match the API specification"),
    })
  }
);

export const catalogAdminAPITool = tool(
  async ({ query }: { query: string }) => {
    return await APITool(query, "catalog-admin");
  },
  {
    name: "catalogAdminAPITool",
    description: "Information about the catalog admin API, create a catalog, publish a catalog, retrieves different catalogs, manage catalog attributes, ",
    schema: z.object({
      query: z.string().describe("The user query to match the API specification"),
    })
  }
);

export const pimAPITool = tool(
  async ({ query }: { query: string }) => {
    return await APITool(query, "pim");
  },
  {
    name: "pimAPITool",
    description: "Manage the products, variations, bundles, hierarchies, nodes in Product Experience Manager (PXM) ",
    schema: z.object({
      query: z.string().describe("The user query to match the API specification"),
    })
  }
);

export const fileAPITool = tool(
  async ({ query }: { query: string }) => {
    return await APITool(query, "files");
  },
  {
    name: "fileAPITool",
    description: "Information about the file API, upload a file, download a file, delete a file, ",
    schema: z.object({
      query: z.string().describe("The user query to match the API specification"),
    })
  }
);

export const pricebookAPITool = tool(
  async ({ query }: { query: string }) => {
    return await APITool(query, "pricebooks");
  },
  {
    name: "pricebookAPITool",
    description: "Information about the pricebook API, create a pricebook, update a pricebook, retrieve a pricebook, delete a pricebook. Pricebooks contain prices for the products in your catalog.  ",
    schema: z.object({
      query: z.string().describe("The user query to match the API specification"),
    })
  }
);

export const promotionAPITool = tool(
  async ({ query }: { query: string }) => {
    return await APITool(query, "promotions-builder");
  },
  {
    name: "promotionAPITool",
    description: "Information about the promotion API, create a promotion, update a promotion, retrieve a promotion, delete a promotion. Promotions are used to apply discounts to products in your catalog.  ",
    schema: z.object({
      query: z.string().describe("The user query to match the API specification"),
    })
  }
);

export const accountAPITool = tool(
  async ({ query }: { query: string }) => {
    return await APITool(query, "accounts");
  },
  {
    name: "accountAPITool",
    description: "Information about the account API, create an account, update an account, retrieve an account, delete an account. Accounts are used to manage your customers.  ",
    schema: z.object({
      query: z.string().describe("The user query to match the API specification"),
    })
  }
);

