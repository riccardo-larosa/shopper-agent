import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { execGetRequestTool, execPostRequestTool, execPutRequestTool } from "./utils/apiTools";
// import { searchCatalogTool } from "./shopper/productTools";
// import { cartTool } from "./shopper/cartTools";
// import { fileTool } from "./merchandiser/fileTools";
// import { managePIMTool } from "./merchandiser/pimTools";
import { cartAPITool, catalogAPITool, catalogAdminAPITool, fileAPITool, pimAPITool, pricebookAPITool } from "./utils/ragTools";


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




// export const SHOPPER_TOOLS_LIST = [ webSearchTool, searchCatalogTool, cartTool];
export const SHOPPER_TOOLS_LIST = [ 
  catalogAPITool, 
  cartAPITool, 
  execGetRequestTool, 
  execPostRequestTool
];

// export const MERCHANDISER_TOOLS_LIST = [ managePIMTool, fileTool];
export const MERCHANDISER_TOOLS_LIST = [  
  fileAPITool,
  pimAPITool,
  pricebookAPITool,
  catalogAdminAPITool, 
  execGetRequestTool, 
  execPostRequestTool, 
  execPutRequestTool
];
