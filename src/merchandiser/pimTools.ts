import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getOpenApiSpec } from "lib/openapis";
import { ChatOpenAI } from "@langchain/openai";

const apiSpec = "https://elasticpath.dev/assets/openapispecs/pim/pim.yaml";
const AGENT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";

export const managePIMTool = tool(
  async ({ query }) => {

    console.log(`managePIMTool: ${query}`);
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
        Product Experience Manager uses the PIM service to manage product information, hierarchies, and price books. 
        the product data is stored separately from pricing, catalogs, and inventory. 
        This separation means that you retrieve all product data only when you are managing product data and assets. 
        Otherwise, when setting prices or managing inventory, you use the pricing and inventory tools.
        
        Products are the items or services that you might want to sell in your store. 
        In Product Experience Manager, a product has a name, description, ID, and SKU. 
        Products can also have additional attributes and associated rich media assets, such as product images or a file containing additional product details. 
        If your store supports multiple languages, you can localize product names and descriptions.
        Products have one of the following types:
        * standard - Standard products are a standalone products.
        * parent - A parent product is a product that has child products that have been built in Commerce Manager or using the Build Child Products endpoint.
        * child - When you configure product variations and variation options for parent products, the child products derived from the parent products are automatically created in Commerce.
        * bundle - A bundle is a purchasable product, comprising one or more standalone products (in other words, components) to be sold together.

        Product variations are the product options available for a base product that your shoppers can choose. 
        As a merchandiser, you want to be able to present all the options you have available for your products to 
        make it easier for your shoppers to visualize them and influence a potential sale. 
        Product Variations allow you to create and manage up to 10,000 unique combinations of options for variations of a product. 
        
        Given a query from a user, understand the intent in the form of one or more actions. 
        This tool is used to manage products, variations, bundles, hierarchies, nodes in Product Experience Manager (PXM).
        Examples 
        * query: show me all hierarchies (or categories)
        * action: search for all hierarchies 
        * query: update this product's name to "new name"
        * action: update the name of this product to "new name"
        * query: show me all the products for a given category
        * action: search for all products in the catalog that are associated with a given category
        
        Using the Open API specs build a GET request to complete the task with the right parameters.
        This will be used later to execute the API call.
      `.trim()
    };

    systemMessage.content += ` Here is the query: ${query} `;

    systemMessage.content += ` Here are the Open API specs available: ${JSON.stringify(specDetails)} `;

    const result = await llm.invoke([systemMessage]);
    console.log(`managePIMTool result: ${result.content}`);
    return result;
  },
  {
    name: "managePIMTool",
    description: "Manage the products, variations, bundles, hierarchies, nodes in Product Experience Manager (PXM)",
    schema: z.object({
      query: z.string().describe("The query to manage the PIM"),
    })
  }
);



