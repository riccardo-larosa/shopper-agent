import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { findTechnicalContent } from "./lib/mongoDBRetriever";
import { tool } from "@langchain/core/tools";
import { z } from "zod";


export const getTokenTool = tool(
  async () => {
    console.log("Getting token");
    // TODO: Implement the get token
    // get the spec from the Open API
    const spec = await findTechnicalContent("Get an implicit token");
    console.log("Spec found:", spec);
    // execute the call
    return JSON.stringify({ 
        
        spec: spec 
    });
  },
  {
    name: "getTokenTool",
    description: "Get the token for the user",
    // parameters: z.object({
    //   token: z.string(),
    // }),
  }
);

export const productSearchTool = tool(
  async ({ query }: { query: string }) => {
    console.log(query);
    // TODO: Implement the product search
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
    // TODO: Implement the add to cart
    // TODO: Return the cart items and the total price
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

export const enterPaymentInformationTool = tool(
  async ({ cartId }: { cartId: string }) => {
    console.log(cartId);
    // TODO: Implement the enter payment information
    // this is where we would ask for address, card number, etc.
    return JSON.stringify({ customerId: "123abc", paymentToken: "xyz123" });
  },
  {
    name: "enterPaymentInformationTool",
    description: "Enter payment information for address, card number, etc.",
    parameters: z.object({
      cartId: z.string(),
    }),
  }
);
export const executePaymentTool = tool(
  async ({ cartId, customerId, paymentToken }: { cartId: string, customerId: string, paymentToken: string }) => {
    console.log(cartId, customerId, paymentToken);
    // TODO: Implement the pay for the cart
    return JSON.stringify({ paymentId: "123abc" });
  },
  {
    name: "executePurchaseTool",
    description: "Pay for the cart",
    parameters: z.object({
      cartId: z.string(),
      customerId: z.string(),
      paymentToken: z.string(),
    }),
  }
);

export const webSearchTool = new TavilySearchResults({
    maxResults: 2,
  });



export const ALL_TOOLS_LIST = [webSearchTool, productSearchTool, addToCartTool, enterPaymentInformationTool, executePaymentTool, getTokenTool];
