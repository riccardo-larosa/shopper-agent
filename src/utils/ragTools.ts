import { z } from 'zod'
import { tool } from '@langchain/core/tools'
import { findAPISpecification } from 'lib/mongoDBRetriever'
import { ChatOpenAI } from '@langchain/openai'

const AGENT_MODEL = process.env.AGENT_MODEL || 'gpt-4o-mini'

export async function APITool(
  query: string,
  apiName: string,
  conversationHistory: string[] = []
) {
  // First, plan the action before retrieving API specs
  const planningMessage = {
    role: 'system',
    content: `
      You are an action planner that converts user queries into structured plans.
      Given a user query, break it down into:
      1. Primary intent (what the user wants to accomplish)
      2. Required information (what data is needed)
      3. Expected outcome (what should happen when successful)
      4. Potential API actions (what API endpoints might help)
      
      Example:
      Query: "Show me red shoes under $50"
      Plan:
      - Primary intent: Search for products with specific criteria
      - Required info: Product type (shoes), color (red), max price ($50)
      - Expected outcome: List of matching products with prices and availability
      - Potential API actions: Product search/filter endpoint
    `.trim()
  }

  const llm = new ChatOpenAI({
    model: AGENT_MODEL,
    temperature: 0
  })

  // Generate action plan
  const planResult = await llm.invoke([
    planningMessage,
    { role: 'user', content: query }
  ])
  console.log(`Action plan: ${planResult.content}`)

  // Now retrieve relevant API specs with the enriched understanding
  const specResults = await findAPISpecification(query, apiName)
  const context = specResults.map((doc) => doc.pageContent).join('\n\n')

  // Include conversation history for context if available
  const historyContext =
    conversationHistory.length > 0
      ? `Previous conversation context:\n${conversationHistory.join('\n')}\n\n`
      : ''

  const systemMessage = {
    role: 'system',
    content: `
      You are an API execution planner that converts user intents into precise API calls.
      
      First analyze:
      1. What specific operation the user wants to perform
      2. What parameters are needed for this operation
      3. Which API endpoint best matches this operation
      
      Then formulate the exact API request that will accomplish this goal.
      If the request requires a body, format it as valid JSON.
      
      Use ONLY endpoints from the provided OpenAPI specs.
      Validate all parameters against the requirements in the specs.
      
      Be precise and focus on translating user intent into a valid API action.
    `.trim()
  }

  systemMessage.content += `\n\n${historyContext}User query: ${query}\n\nAction plan: ${planResult.content}\n\nAvailable OpenAPI specs:\n${context}`

  // Generate final API execution plan
  const result = await llm.invoke([systemMessage])

  // Validate the generated action against the original intent
  const validationMessage = {
    role: 'system',
    content: `
      Validate if the following API execution plan correctly addresses the user's query.
      
      User query: ${query}
      Action plan: ${planResult.content}
      API execution plan: ${result.content}
      
      Respond with either:
      "VALID" if the execution plan correctly addresses the user's query, or
      "NEEDS_REVISION: [specific reason]" if the plan doesn't properly address the query.
    `.trim()
  }

  const validationResult = await llm.invoke([validationMessage])
  const validationResponse = validationResult.content.toString()

  if (validationResponse.includes('NEEDS_REVISION')) {
    console.log(`Validation failed: ${validationResponse}`)
    // Try one more time with the feedback
    const revisedSystemMessage = {
      role: 'system',
      content: `
        Revise the API execution plan based on this feedback: ${validationResponse}
        
        User query: ${query}
        Previous plan: ${result.content}
        Available OpenAPI specs:\n${context}
      `.trim()
    }

    const revisedResult = await llm.invoke([revisedSystemMessage])
    console.log(`Revised APITool result: ${revisedResult.content}`)
    return revisedResult.content
  }

  console.log(`APITool result: ${result.content}`)
  return result.content
}

export const cartAPITool = tool(
  async ({ query }: { query: string }, conversationHistory: string[] = []) => {
    return await APITool(query, 'carts', conversationHistory)
  },
  {
    name: 'cartAPITool',
    description:
      'Information about the cart API, add a product to the cart, or update a product from the cart, or checkout the cart ',
    schema: z.object({
      query: z
        .string()
        .describe('The user query to match the API specification')
    })
  }
)

export const catalogAPITool = tool(
  async ({ query }: { query: string }, conversationHistory: string[] = []) => {
    return await APITool(query, 'catalog', conversationHistory)
  },
  {
    name: 'catalogAPITool',
    description:
      'Information about the catalog API, add a product to the catalog, or update a product from the catalog, or checkout the catalog ',
    schema: z.object({
      query: z
        .string()
        .describe('The user query to match the API specification')
    })
  }
)

export const catalogAdminAPITool = tool(
  async ({ query }: { query: string }, conversationHistory: string[] = []) => {
    return await APITool(query, 'catalog-admin', conversationHistory)
  },
  {
    name: 'catalogAdminAPITool',
    description:
      'Information about the catalog admin API, create a catalog, publish a catalog, retrieves different catalogs, manage catalog attributes, ',
    schema: z.object({
      query: z
        .string()
        .describe('The user query to match the API specification')
    })
  }
)

export const pimAPITool = tool(
  async ({ query }: { query: string }, conversationHistory: string[] = []) => {
    return await APITool(query, 'pim', conversationHistory)
  },
  {
    name: 'pimAPITool',
    description:
      'Manage the products, variations, bundles, hierarchies, nodes in Product Experience Manager (PXM) ',
    schema: z.object({
      query: z
        .string()
        .describe('The user query to match the API specification')
    })
  }
)

export const subscriptionsAPITool = tool(
  async ({ query }: { query: string }, conversationHistory: string[] = []) => {
    return await APITool(query, 'subscriptions', conversationHistory)
  },
  {
    name: 'subscriptionsAPITool',
    description:
      'Information about the subscriptions API, manage an offering, products, plans and features. Subscriptions are used to manage recurring orders for your customers.  ',
    schema: z.object({
      query: z
        .string()
        .describe('The user query to match the API specification')
    })
  }
)

export const fileAPITool = tool(
  async ({ query }: { query: string }, conversationHistory: string[] = []) => {
    return await APITool(query, 'files', conversationHistory)
  },
  {
    name: 'fileAPITool',
    description:
      'Information about the file API, upload a file, download a file, delete a file, ',
    schema: z.object({
      query: z
        .string()
        .describe('The user query to match the API specification')
    })
  }
)

export const pricebookAPITool = tool(
  async ({ query }: { query: string }, conversationHistory: string[] = []) => {
    return await APITool(query, 'pricebooks', conversationHistory)
  },
  {
    name: 'pricebookAPITool',
    description:
      'Information about the pricebook API, create a pricebook, update a pricebook, retrieve a pricebook, delete a pricebook. Pricebooks contain prices for the products in your catalog.  ',
    schema: z.object({
      query: z
        .string()
        .describe('The user query to match the API specification')
    })
  }
)

export const promotionAPITool = tool(
  async ({ query }: { query: string }, conversationHistory: string[] = []) => {
    return await APITool(query, 'promotions-builder', conversationHistory)
  },
  {
    name: 'promotionAPITool',
    description:
      'Information about the promotion API, create a promotion, update a promotion, retrieve a promotion, delete a promotion. Promotions are used to apply discounts to products in your catalog.  ',
    schema: z.object({
      query: z
        .string()
        .describe('The user query to match the API specification')
    })
  }
)

export const accountAPITool = tool(
  async ({ query }: { query: string }, conversationHistory: string[] = []) => {
    return await APITool(query, 'accounts', conversationHistory)
  },
  {
    name: 'accountAPITool',
    description:
      'Information about the account API, create an account, update an account, retrieve an account, delete an account. Accounts are used to manage your customers.  ',
    schema: z.object({
      query: z
        .string()
        .describe('The user query to match the API specification')
    })
  }
)
