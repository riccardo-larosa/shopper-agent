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

// Add global state type to make TypeScript happy
declare global {
  var lastShopperState: typeof ShopperState.State;
}

// Use environment variable with fallback to "gpt-4o"
const GRAPH_MODEL = process.env.GRAPH_MODEL || "gpt-4o";

// Create a custom annotation that extends MessagesAnnotation to include cartId
const ShopperState = Annotation.Root({
  ...MessagesAnnotation.spec,
  cartId: Annotation<string | undefined>,
  grantType: Annotation<"implicit">,
  conversationHistory: Annotation<string[]>,
  lastActionSuccess: Annotation<boolean | undefined>,
});

const llm = new ChatOpenAI({
  model: GRAPH_MODEL,
  temperature: 0,
});

const toolNode = new ToolNode(SHOPPER_TOOLS_LIST);

const callModel = async (state: typeof ShopperState.State) => {
  // Store current state globally for tools to access
  global.lastShopperState = state;
  const { messages, cartId, conversationHistory = [], lastActionSuccess } = state;
  
  // Generate a cart ID if one doesn't exist
  let currentCartId = cartId;
  if (!currentCartId) {
    currentCartId = uuidv4();
    console.log(`Generated new cart ID: ${currentCartId}`);
  }

  // Extract past user queries and results for context
  const recentHistory = messages
    .slice(-6) // Consider last 3 exchanges (user + assistant)
    .map(msg => {
      if (msg._getType() === "human") {
        return `User: ${msg.content}`;
      } else if (msg._getType() === "ai") {
        return `Assistant: ${msg.content?.toString().substring(0, 200)}...`; // Truncate long responses
      }
      return "";
    })
    .filter(Boolean);

  // Add feedback about previous action success if available
  const actionFeedback = lastActionSuccess !== undefined 
    ? `Previous action ${lastActionSuccess ? 'succeeded' : 'failed'}. ${lastActionSuccess ? 'Continue building on it.' : 'Try a different approach.'}` 
    : '';

  const systemMessage = {
    role: "system",
    content: `
      You're an expert shopper assistant that is leveraging the power of Elastic Path to complete the task.
      
      PLANNING APPROACH:
      1. First understand exactly what the user wants to accomplish
      2. Break down complex requests into step-by-step actions
      3. For each action, identify the most appropriate API endpoint
      4. Validate parameters before making API calls
      5. Track progress to ensure all parts of the request are fulfilled
      
      API USAGE GUIDELINES:
      - Always find the right API to use based on the task. Don't guess. Use tools to find matching APIs.
      - When using execPostRequestTool, always provide three parameters:
        - endpoint: The API endpoint to call
        - body: A properly formatted JSON object for the request body
        - grantType: The type of token to use (use "${state.grantType}")
      
      IMPORTANT INFORMATION:
      - Cart ID: ${currentCartId} (use for cart-related APIs)
      - Grant type: implicit (use for APIs requiring token)
      ${actionFeedback}
    `.trim()
  };

  const llmWithTools = llm.bindTools(SHOPPER_TOOLS_LIST);
  const result = await llmWithTools.invoke([systemMessage, ...messages], 
    {
      recursionLimit: 5,
    }
  );
  
  // Update conversation history with the latest exchange
  const updatedHistory = [...conversationHistory];
  if (messages.length > 0) {
    const latestUserMessage = messages[messages.length - 1];
    if (latestUserMessage._getType() === "human") {
      updatedHistory.push(`User: ${latestUserMessage.content}`);
      updatedHistory.push(`Assistant: ${result.content}`);
      // Keep only last 10 exchanges to avoid context bloat
      if (updatedHistory.length > 20) {
        updatedHistory.splice(0, 2); // Remove oldest exchange
      }
    }
  }
  
  // Always return "implicit" as grantType to ensure it's set from the start
  return { 
    messages: result, 
    cartId: currentCartId, 
    grantType: "implicit" as const,
    conversationHistory: updatedHistory,
    lastActionSuccess: undefined // Reset for next action
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
