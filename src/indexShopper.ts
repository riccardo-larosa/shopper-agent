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
import { SHOPPER_TOOLS_LIST } from "./tools";
// import { z } from "zod";
import { v4 as uuidv4 } from 'uuid';

// Use environment variable with fallback to "gpt-4o"
const GRAPH_MODEL = process.env.GRAPH_MODEL || "gpt-4o";

// Create a custom annotation that extends MessagesAnnotation to include cartId
const ShopperState = Annotation.Root({
  ...MessagesAnnotation.spec,
  cartId: Annotation<string | undefined>,
  grantType: Annotation<"implicit">,
});

const llm = new ChatOpenAI({
  model: GRAPH_MODEL,
  temperature: 0,
});

const toolNode = new ToolNode(SHOPPER_TOOLS_LIST);

const callModel = async (state: typeof ShopperState.State) => {
  const { messages, cartId } = state;
  
  // Generate a cart ID if one doesn't exist
  let currentCartId = cartId;
  if (!currentCartId) {
    currentCartId = uuidv4();
    console.log(`Generated new cart ID: ${currentCartId}`);
  }

  const systemMessage = {
    role: "system",
    content: `
      You're an expert shopper assistant that is leveraging the power of Elastic Path to complete the task.
      To complete the task use the right tool.
      The current cart ID is: ${currentCartId}. Use this cart ID when interacting with cart-related APIs.
      The grant type is: implicit. Use this grant type when interacting with APIs that require a token.
    `.trim()
  };

  const llmWithTools = llm.bindTools(SHOPPER_TOOLS_LIST);
  const result = await llmWithTools.invoke([systemMessage, ...messages], 
    {
      recursionLimit: 5,
    }
  );
  
  // Always return "implicit" as grantType to ensure it's set from the start
  return { 
    messages: result, 
    cartId: currentCartId, 
    grantType: "implicit" as const 
  };
};

const shouldContinue = (state: typeof ShopperState.State) => {
  const { messages } = state;

  const lastMessage = messages[messages.length - 1];
  // Cast here since `tool_calls` does not exist on `BaseMessage`
  const messageCastAI = lastMessage as AIMessage;
  // if the last message is not an AI message or it does not have any tool calls, we should end.
  if (messageCastAI._getType() !== "ai" || !messageCastAI.tool_calls?.length) {
    console.log("END");
    return END;
  }

  // Tools are provided, so we should continue.
  // LLM knows what to do next.
  return "tools";
};


const workflow = new StateGraph(ShopperState)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", END])
  .addEdge("tools", "agent")
  .addEdge("agent", END);


// Remove or comment out the previous graph export
export const graph = workflow.compile();
