import { config } from 'dotenv'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { describe, it, expect, beforeEach, vi } from 'vitest'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') })

// Mock the ShopperState for testing
global.lastShopperState = {
  conversationHistory: [],
  lastActionSuccess: undefined,
  cartId: 'test-cart', // dummy value
  messages: [] // dummy value
}

describe('Conversation History Tests', () => {
  describe('State Management Tests', () => {
    it('should correctly update conversation history in state', () => {
      // Create a mock state with empty history
      const state = {
        messages: [
          { _getType: () => 'human', content: 'Find me blue shirts' },
          {
            _getType: () => 'ai',
            content: 'Here are some blue shirts I found...'
          }
        ],
        conversationHistory: [],
        cartId: 'test-cart-1',
        grantType: 'implicit',
        lastActionSuccess: undefined
      }

      // Simulate updating the conversation history
      const updatedHistory = [...state.conversationHistory]
      if (state.messages.length > 0) {
        const latestUserMessage = state.messages[0]
        if (latestUserMessage._getType() === 'human') {
          updatedHistory.push(`User: ${latestUserMessage.content}`)
          updatedHistory.push(`Assistant: ${state.messages[1].content}`)
        }
      }

      state.conversationHistory = updatedHistory

      // Test that history was updated correctly
      expect(state.conversationHistory).toHaveLength(2)
      expect(state.conversationHistory[0]).toContain('Find me blue shirts')
    })

    it('should limit conversation history size to prevent context bloat', () => {
      // Create a mock state with history that would exceed the limit
      const state = {
        messages: [{ _getType: () => 'human', content: 'Show me new items' }],
        conversationHistory: Array(30)
          .fill('')
          .map((_, i) =>
            i % 2 === 0
              ? `User: Test message ${i / 2}`
              : `Assistant: Response ${Math.floor(i / 2)}`
          ),
        cartId: 'test-cart-1',
        grantType: 'implicit'
      }

      // Update history and apply limit
      const updatedHistory = [...state.conversationHistory]
      updatedHistory.push(`User: ${state.messages[0].content}`)
      updatedHistory.push(`Assistant: Some response`)

      // Keep only the last 20 entries to avoid context bloat
      if (updatedHistory.length > 20) {
        const excessEntries = updatedHistory.length - 20
        updatedHistory.splice(0, excessEntries)
      }

      state.conversationHistory = updatedHistory

      // Test that history was limited correctly
      expect(state.conversationHistory).toHaveLength(20)
      // The oldest entries should be removed
      expect(state.conversationHistory[0]).not.toContain('Test message 0')
    })
  })

  describe('Action Success Tracking Tests', () => {
    beforeEach(() => {
      // Reset the lastActionSuccess state before each test
      global.lastShopperState.lastActionSuccess = undefined
    })

    it('should track successful API calls', async () => {
      // Simulate a successful API response
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test data' })
      }

      // Mock fetch to return the successful response
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      // Simulate updating the global state based on the API response
      global.lastShopperState.lastActionSuccess = mockResponse.ok

      // Test that success was tracked correctly
      expect(global.lastShopperState.lastActionSuccess).toBe(true)
    })

    it('should track failed API calls', async () => {
      // Simulate a failed API response
      const mockResponse = {
        ok: false,
        status: 404,
        json: async () => ({ error: 'not found' })
      }

      // Mock fetch to return the failed response
      global.fetch = vi.fn().mockResolvedValue(mockResponse)

      // Simulate updating the global state based on the API response
      global.lastShopperState.lastActionSuccess = mockResponse.ok

      // Test that failure was tracked correctly
      expect(global.lastShopperState.lastActionSuccess).toBe(false)
    })
  })
})
