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
import { MERCHANDISER_TOOLS_LIST } from "./tools";
import { z } from "zod";

// Use environment variable with fallback to "gpt-4o"
const GRAPH_MODEL = process.env.GRAPH_MODEL || "gpt-4o";

// Create a custom annotation that extends MessagesAnnotation to include cartId
const MerchandiserState = Annotation.Root({
  ...MessagesAnnotation.spec,
  grantType: Annotation<"client_credentials">,
  // add any additional state you need
});

const llm = new ChatOpenAI({
  model: GRAPH_MODEL,
  temperature: 0,
});

const toolNode = new ToolNode(MERCHANDISER_TOOLS_LIST);

const callModel = async (state: typeof MerchandiserState.State) => {
  const { messages } = state;

  const systemMessage = {
    role: "system",
    content: `
      You're an expert merchandiser assistant that is leveraging the power of Elastic Path to complete the task.
      To complete the task use the right tool.
    `.trim()
  };

  const llmWithTools = llm.bindTools(MERCHANDISER_TOOLS_LIST);
  const result = await llmWithTools.invoke([systemMessage, ...messages],
    {
      recursionLimit: 5,
    }
  );

  // Simply return the result with the current cart ID
  return { messages: result };
};

const shouldContinue = (state: typeof MerchandiserState.State) => {
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


const workflow = new StateGraph(MerchandiserState)
  .addNode("agent", callModel)
  .addNode("tools", toolNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, ["tools", END])
  .addEdge("tools", "agent")
  .addEdge("agent", END);


// Remove or comment out the previous graph export
export const graph = workflow.compile();
