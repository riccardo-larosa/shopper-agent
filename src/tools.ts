import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
// import { getOpenApiSpec } from "lib/openapis";
import { execGetRequestTool, execPostRequestTool, execPutRequestTool } from "./utils/apiTools";
import { searchCatalogTool } from "./shopper/productTools";
import { cartTool } from "./shopper/cartTools";
import { fileTool } from "./merchandiser/fileTools";
import { managePIMTool } from "./merchandiser/pimTools";
import { cartAPITool, catalogAPITool } from "./utils/ragTools";
// export const getOpenApiSpecTool = tool(
//   async ({ query }) => {

//     const url = "https://elasticpath.dev/assets/openapispecs/catalog/catalog_view.yaml";
//     console.log(`getOpenApiSpecTool: ${url}`);
//     const spec = await getOpenApiSpec(query, url);
//     console.log(`spec: ${JSON.stringify(spec).substring(0, 100)}...`);
//     return JSON.stringify(spec);
//   },
//   {
//     name: "getOpenApiSpecTool",
//     description: "Get the OpenAPI spec for the API",
//     schema: z.object({
//       query: z.string().describe("The query to find the right API spec"),
//       // url: z.string().describe("The URL of the OpenAPI spec")
//     })
//   }
// );

export const webSearchTool = tool(
  async ({ query }) => {
    console.log(`web_search: ${query}`);
    const webSearchTool = new TavilySearchResults({
      maxResults: 2,
    });
    const results = await webSearchTool.invoke(query);
    return JSON.stringify(results);
  },
  {
    name: "web_search",
    description: "Search the web for the query",
    schema: z.object({
      query: z.string().describe("The query to search the web for")
    })
  }
);




// export const SHOPPER_TOOLS_LIST = [ webSearchTool, searchCatalogTool, cartTool, execGetRequestTool, execPostRequestTool];
export const SHOPPER_TOOLS_LIST = [ catalogAPITool, cartAPITool, execGetRequestTool, execPostRequestTool];
export const MERCHANDISER_TOOLS_LIST = [ managePIMTool, fileTool, execGetRequestTool, execPostRequestTool, execPutRequestTool];
