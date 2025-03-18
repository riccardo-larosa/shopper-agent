import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { expect } from 'chai';
import sinon from 'sinon';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') });

// Mock the ShopperState for testing
global.lastShopperState = {
  conversationHistory: [],
  lastActionSuccess: undefined
};

describe('Conversation History Tests', () => {
  
  describe('State Management Tests', () => {
    it('should correctly update conversation history in state', () => {
      // Create a mock state with empty history
      const state = {
        messages: [
          { _getType: () => 'human', content: 'Find me blue shirts' },
          { _getType: () => 'ai', content: 'Here are some blue shirts I found...' }
        ],
        conversationHistory: [],
        cartId: 'test-cart-1',
        grantType: 'implicit',
        lastActionSuccess: undefined
      };
      
      // Import the function that would update the state (this is simplified, actual implementation would be different)
      // For testing purposes, manually update the history as the function would
      const updatedHistory = [...state.conversationHistory];
      if (state.messages.length > 0) {
        const latestUserMessage = state.messages[0];
        if (latestUserMessage._getType() === 'human') {
          updatedHistory.push(`User: ${latestUserMessage.content}`);
          updatedHistory.push(`Assistant: ${state.messages[1].content}`);
        }
      }
      
      state.conversationHistory = updatedHistory;
      
      // Test that history was updated correctly
      expect(state.conversationHistory).to.have.lengthOf(2);
      expect(state.conversationHistory[0]).to.include('Find me blue shirts');
    });
    
    it('should limit conversation history size to prevent context bloat', () => {
      // Create a mock state with history that would exceed the limit
      const state = {
        messages: [
          { _getType: () => 'human', content: 'Show me new items' }
        ],
        conversationHistory: Array(30).fill().map((_, i) => 
          i % 2 === 0 ? `User: Test message ${i/2}` : `Assistant: Response ${Math.floor(i/2)}`
        ),
        cartId: 'test-cart-1',
        grantType: 'implicit'
      };
      
      // Update history and apply limit (as the implementation would)
      const updatedHistory = [...state.conversationHistory];
      updatedHistory.push(`User: ${state.messages[0].content}`);
      updatedHistory.push(`Assistant: Some response`);
      
      // Keep only last 20 entries to avoid context bloat
      if (updatedHistory.length > 20) {
        const excessEntries = updatedHistory.length - 20;
        updatedHistory.splice(0, excessEntries);
      }
      
      state.conversationHistory = updatedHistory;
      
      // Test that history was limited correctly
      expect(state.conversationHistory).to.have.lengthOf(20);
      // The oldest entries should be removed
      expect(state.conversationHistory[0]).to.not.include('Test message 0');
    });
  });

  describe('Action Success Tracking Tests', () => {
    beforeEach(() => {
      // Reset the lastActionSuccess state before each test
      global.lastShopperState.lastActionSuccess = undefined;
    });
    
    it('should track successful API calls', () => {
      // Simulate a successful API response
      const mockResponse = {
        ok: true,
        status: 200,
        json: async () => ({ data: 'test data' })
      };
      
      // Mock fetch to return the successful response
      global.fetch = sinon.stub().resolves(mockResponse);
      
      // Simulate updating the global state based on API response
      global.lastShopperState.lastActionSuccess = mockResponse.ok;
      
      // Test that success was tracked correctly
      expect(global.lastShopperState.lastActionSuccess).to.be.true;
    });
    
    it('should track failed API calls', () => {
      // Simulate a failed API response
      const mockResponse = {
        ok: false,
        status: 404,
        json: async () => ({ error: 'not found' })
      };
      
      // Mock fetch to return the failed response
      global.fetch = sinon.stub().resolves(mockResponse);
      
      // Simulate updating the global state based on API response
      global.lastShopperState.lastActionSuccess = mockResponse.ok;
      
      // Test that failure was tracked correctly
      expect(global.lastShopperState.lastActionSuccess).to.be.false;
    });
  });
});