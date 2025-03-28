import { ToolNode } from '@langchain/langgraph/prebuilt'
import {
  Annotation,
  END,
  START,
  StateGraph,
  NodeInterrupt,
  MessagesAnnotation
} from '@langchain/langgraph'
import {
  BaseMessage,
  ToolMessage,
  HumanMessage,
  type AIMessage
} from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
import { MERCHANDISER_TOOLS_LIST } from './tools'
import { z } from 'zod'
import {
  EpAuthentication,
  EpKeysAuthentication,
  EpTokenAuthentication
} from './types/ep-auth'
import {
  MerchandiserConfigSchema,
  MerchandiserState,
  MerchandiserStateSchema
} from './types/merchandiser-schemas'

// Use environment variable with fallback to "gpt-4o"
const GRAPH_MODEL = process.env.GRAPH_MODEL || 'gpt-4o'

// Create a custom annotation that extends MessagesAnnotation to include cartId

const llm = new ChatOpenAI({
  model: GRAPH_MODEL,
  temperature: 0
})

const toolNode = new ToolNode(MERCHANDISER_TOOLS_LIST)

const callModel = async (state: MerchandiserState) => {
  const { messages } = state

  const systemMessage = {
    role: 'system',
    content: `
      You're an expert merchandiser assistant that is leveraging the power of Elastic Path to complete the task.
      Using the tools provided (and only the tools provided), you should break down the task into smaller tasks and complete the task.
      Before using execGetRequestTool, execPostRequestTool, execPutRequestTool, you should use any of the other tools to build the right API call.
      
      API USAGE GUIDELINES:
      - When using execPostRequestTool, always provide ALL THREE parameters:
        - endpoint: The API endpoint to call
        - body: A properly formatted JSON object for the request body (REQUIRED, cannot be empty)
      
      Example POST request:
      execPostRequestTool({
        endpoint: "/pcm/products",
        body: { "data": { "type": "product", "attributes": { "name": "Example Product" } } },
        
      })
      
    `.trim()
  }

  const llmWithTools = llm.bindTools(MERCHANDISER_TOOLS_LIST)
  const result = await llmWithTools.invoke([systemMessage, ...messages], {
    recursionLimit: 5
  })

  return {
    messages: result
  }
}

const shouldContinue = (state: MerchandiserState) => {
  const { messages } = state

  const lastMessage = messages[messages.length - 1]
  // Cast here since `tool_calls` does not exist on `BaseMessage`
  const messageCastAI = lastMessage as AIMessage
  // if the last message is not an AI message or it does not have any tool calls, we should end.
  if (messageCastAI._getType() !== 'ai' || !messageCastAI.tool_calls?.length) {
    console.log('END')
    return END
  }

  // Tools are provided, so we should continue.
  // LLM knows what to do next.
  return 'tools'
}

const workflow = new StateGraph(
  MerchandiserStateSchema,
  MerchandiserConfigSchema
)
  .addNode('agent', callModel)
  .addNode('tools', toolNode)
  .addEdge(START, 'agent')
  .addConditionalEdges('agent', shouldContinue, ['tools', END])
  .addEdge('tools', 'agent')
  .addEdge('agent', END)

// Remove or comment out the previous graph export
export const graph = workflow.compile()
