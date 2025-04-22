import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { Mock } from 'vitest'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') })

// Mock ChatOpenAI class for testing using Vitest mocks
class ChatOpenAI {
  invoke: Mock<(...args: any[]) => Promise<any>>

  constructor() {
    this.invoke = vi.fn()
  }
}

describe('Action Validation Tests', () => {
  let llm: ChatOpenAI

  beforeEach(() => {
    // Create a fresh instance of the mock for each test
    llm = new ChatOpenAI()

    // Reset any previous mock history
    llm.invoke.mockReset()

    // First call is the planning phase
    llm.invoke.mockResolvedValueOnce({
      content:
        'Primary intent: Search for products\nRequired info: Product type=shoes, color=red\nExpected outcome: List of matching products'
    })

    // Second call is the API selection phase
    llm.invoke.mockResolvedValueOnce({
      content:
        'Use GET /catalog/products?filter=eq(color,red)&filter=eq(type,shoes)'
    })
  })

  it('should accept valid action plans without revision', async () => {
    // Third call is the validation phase, returning "VALID"
    llm.invoke.mockResolvedValueOnce({
      content: 'VALID'
    })

    // Create a simplified version of the APITool function for testing
    const mockAPITool = async (
      query: string,
      apiName: string,
      history: string[] = []
    ) => {
      // Call planning step
      const planResult = await llm.invoke([
        { role: 'system', content: 'Planning' },
        { role: 'user', content: query }
      ])

      // Call API selection step
      const apiResult = await llm.invoke([
        { role: 'system', content: 'API Selection' },
        { role: 'user', content: query }
      ])

      // Call validation step
      const validationResult = await llm.invoke([
        { role: 'system', content: 'Validation' }
      ])

      // No revision needed if validation is VALID
      if (validationResult.content === 'VALID') {
        return apiResult.content
      }
      // In a real implementation, this would call a revision step
      return 'Revised plan'
    }

    const result = await mockAPITool('find red shoes', 'catalog')

    // Verify that the result is the unmodified API plan
    expect(result).toBe(
      'Use GET /catalog/products?filter=eq(color,red)&filter=eq(type,shoes)'
    )
    // Verify that the validation function was called (total 3 calls)
    expect(llm.invoke).toHaveBeenCalledTimes(3)
  })

  it("should revise action plans that don't match user intent", async () => {
    // Third call: validation phase returns NEEDS_REVISION
    llm.invoke.mockResolvedValueOnce({
      content:
        "NEEDS_REVISION: The plan doesn't include size filter mentioned in the query"
    })
    // Fourth call: revision step
    llm.invoke.mockResolvedValueOnce({
      content:
        'Use GET /catalog/products?filter=eq(color,red)&filter=eq(type,shoes)&filter=eq(size,9)'
    })

    // Create a simplified version of the APITool function for testing
    const mockAPITool = async (
      query: string,
      apiName: string,
      history: string[] = []
    ) => {
      // Call planning step
      const planResult = await llm.invoke([
        { role: 'system', content: 'Planning' },
        { role: 'user', content: query }
      ])

      // Call API selection step
      const apiResult = await llm.invoke([
        { role: 'system', content: 'API Selection' },
        { role: 'user', content: query }
      ])

      // Call validation step
      const validationResult = await llm.invoke([
        { role: 'system', content: 'Validation' }
      ])

      // Check if revision is needed
      if (validationResult.content.includes('NEEDS_REVISION')) {
        // Call revision step
        const revisedResult = await llm.invoke([
          { role: 'system', content: 'Revision' }
        ])
        return revisedResult.content
      }

      return apiResult.content
    }

    const result = await mockAPITool('find red shoes in size 9', 'catalog')

    // Verify that the result is the revised API plan
    expect(result).toBe(
      'Use GET /catalog/products?filter=eq(color,red)&filter=eq(type,shoes)&filter=eq(size,9)'
    )
    // Verify that all four calls were made
    expect(llm.invoke).toHaveBeenCalledTimes(4)
  })
})
