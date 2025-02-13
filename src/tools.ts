import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { tool } from "@langchain/core/tools";
import { z } from "zod";

export const productSearchTool = tool(
  async ({ query }: { query: string }) => {
    console.log(query);
    return JSON.stringify({ productId: "123", price: 100 });
  },
  {
    name: "productSearchTool",
    description: "Search for products on the store that matches the query",
    parameters: z.object({
      query: z.string(),
    }),
  }
);

export const addToCartTool = tool(
  async ({ productId, quantity }: { productId: string, quantity: number }) => {
    console.log(productId, quantity);
    return JSON.stringify({ cartId: "123abc"});
  },
  {
    name: "addToCartTool",
    description: "Add a product to the cart",
    parameters: z.object({
      productId: z.string(),
      quantity: z.number(),
    }),
  }
);

export const payCartTool = tool(
  async ({ cartId }: { cartId: string }) => {
    console.log(cartId);
    return JSON.stringify({ paymentId: "123abc" });
  },
  {
    name: "payCartTool",
    description: "Pay for the cart",
    parameters: z.object({
      cartId: z.string(),
    }),
  }
);

export const webSearchTool = new TavilySearchResults({
    maxResults: 2,
  });

export const ALL_TOOLS_LIST = [webSearchTool, productSearchTool, addToCartTool, payCartTool];
