import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  Annotation,
  END,
  START,
  StateGraph,
  NodeInterrupt,
  MessagesAnnotation,
} from "@langchain/langgraph";
import {
  BaseMessage,
  ToolMessage,
  HumanMessage,
  type AIMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { ALL_TOOLS_LIST, productSearchTool } from "./tools.js";
import { z } from "zod";


const llm = new ChatOpenAI({
  model: "gpt-4o",
  temperature: 0,
});

const toolNode = new ToolNode(ALL_TOOLS_LIST);
// const toolNode = new ToolNode([productSearchTool]);

const callModel = async (state: typeof MessagesAnnotation.State) => {
    const { messages } = state;
  
    const systemMessage = {
        role: "system",
        content:
          "You're an expert shopper assistant that can find products in the store" +
          "All product data require a productId to be passed in as a parameter. If you " +
          "do not know the productId, you should use the product search tool to find it."  
      };
  
    const llmWithTools = llm.bindTools(ALL_TOOLS_LIST);
    const result = await llmWithTools.invoke([systemMessage, ...messages]);
    return { messages: result };
  };

const shouldContinue = (state: typeof MessagesAnnotation.State) => {
  const { messages } = state;

  const lastMessage = messages[messages.length - 1];
  // Cast here since `tool_calls` does not exist on `BaseMessage`
  const messageCastAI = lastMessage as AIMessage;
  console.log(`messageCastAI._getType(): ${messageCastAI._getType()}`);
  console.log(`messageCastAI.tool_calls: ${messageCastAI.tool_calls?.length}`);
  if (messageCastAI._getType() !== "ai" || !messageCastAI.tool_calls?.length) {
    // LLM did not call any tools, or it's not an AI message, so we should end.
    console.log("END");
    return END;
  }

  // Tools are provided, so we should continue.
  return "tools";
};

const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, ["tools", END])
    .addEdge("tools", "agent")
    .addEdge("agent", END);


// Remove or comment out the previous graph export
export const graph = workflow.compile();
