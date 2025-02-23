import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { findTechnicalContent } from "./lib/mongoDBRetriever";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { execGetRequest, execPostRequest } from "./lib/execRequests";
import { ChatOpenAI } from "@langchain/openai";


export const getTokenTool = tool(
  async () => {

    const results = await execPostRequest("/oauth/access_token", "",
      {
        "grant_type": "implicit",
        "client_id": process.env.EP_CLIENT_ID,
      });
    return JSON.stringify({
      token: results.access_token,
    });
  },
  {
    name: "getTokenTool",
    description: "Get the token for the user",

  }
);

export const productSearchTool = tool(
  async ({ input }) => {
    console.log(`productSearchTool: ${input}`);
    // TODO: Implement the product search
    
    // I Can't use the filter with regex in vectorSearch (MongoDB limitation)
    // const filter = {
    //   "source": { "$regex": "docs/api/catalog" }
    // };
    
    // take the query and use findTechnicalContent to find the spec
    const apiSpec = await findTechnicalContent(input);

    console.log(`apiSpec: ${JSON.stringify(apiSpec)}`);

    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0,
    });

    const systemMessage = {
      role: "system",
      content: `
        Given a query string in the form of an action, returns the current api spec that will be used to execute the action.
        For instance if the text is "list all products", the API spec for listing all the products will be returned.
        The API spec will look something like this:
        == Docs for GET /catalog/products == 
        description: Retrieves the list of products from the catalog. Only the products in a live status are retrieved.
        parameters:
        parameters:
        - $ref: '#/components/parameters/accept-language'
        - $ref: '#/components/parameters/channel'
        - $ref: '#/components/parameters/tag'
        - $ref: '#/components/parameters/filter-product'

        responses:
        '200':
          description: The products of a catalog.
          content:
            application/json:

      `.trim()
    };

    systemMessage.content += `
      Here is the query: ${input}
    `;

    systemMessage.content += `
      Here is the results: ${JSON.stringify(apiSpec)}
    `;
  
    const result = await llm.invoke([systemMessage]);
    console.log(`result: ${result}`);

    // it would be good to return a structured output from the findTechnicalContent
    // console.log(result);
    // then use the spec to search for the product executing a get request
    // const products = await execGetRequest(results.spec, token);
    // return the product id and the price
    return JSON.stringify({ productId: "123", price: 100 });
  },
  {
    name: "productSearchTool",
    description: "Search for products on the store that matches the query",
    schema: z.object({
      input: z.string(),
    })
  }
);

export const addToCartTool = tool(
  async ({ productId, quantity }: { productId: string, quantity: number }) => {
    console.log(productId, quantity);
    // TODO: Implement the add to cart
    // TODO: Return the cart items and the total price
    return JSON.stringify({ cartId: "123abc" });
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
