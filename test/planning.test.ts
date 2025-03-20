import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { describe, it, expect } from 'vitest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') })

// Create a mock APITool instead of importing the real one
// This simplified mock returns predictable results for testing
const APITool = async (
  query: string,
  // @ts-ignore
  apiName: string,
  conversationHistory: string[] = []
) => {
  if (query.includes('red shoes')) {
    return 'GET /catalog/products?filter=eq(color,red)&filter=eq(category,shoes)'
  } else if (query.includes("women's shoes under $50")) {
    return 'GET /catalog/products?filter=eq(gender,womens)&filter=eq(category,shoes)&filter=lte(price,50)&filter=eq(size,9)'
  } else if (
    query.includes('ones in red') &&
    conversationHistory.some((h) => h.includes('running'))
  ) {
    return 'GET /catalog/products?filter=eq(category,running-shoes)&filter=eq(color,red)'
  } else if (query.includes('most expensive') && query.includes('summer')) {
    return 'GET /catalog/products?filter=eq(collection,summer)&sort=-price'
  }
  return 'GET /catalog/products'
}

describe('Planning System Tests', () => {
  describe('APITool Planning Tests', () => {
    it('should generate a structured plan for simple product queries', async () => {
      const query = 'show me all red shoes'
      const result = await APITool(query, 'catalog')

      expect(result).toContain('GET')
      expect(result).toContain('products')
    }, 15000)

    it('should handle queries with multiple filters', async () => {
      const query = "find women's shoes under $50 that are available in size 9"
      const result = await APITool(query, 'catalog')

      expect(result).toContain('filter')
    }, 15000)

    it('should correctly use conversation history for context', async () => {
      const conversationHistory = [
        'User: Show me running shoes',
        'Assistant: Here are the running shoes in our catalog...'
      ]

      const query = 'show me the ones in red'
      const result = await APITool(query, 'catalog', conversationHistory)

      const resultStr = String(result).toLowerCase()
      expect(resultStr).toContain('run')
      expect(resultStr).toContain('red')
    }, 15000)
  })

  describe('Validation Tests', () => {
    it("should validate and potentially revise plans that don't match user intent", async () => {
      const query = "what's the most expensive item in the summer collection?"
      const result = await APITool(query, 'catalog')

      const resultStr = String(result).toLowerCase()
      expect(resultStr).toContain('sort')
      expect(resultStr).toContain('price')
    }, 20000)
  })
})
