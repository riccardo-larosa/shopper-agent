import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { expect } from 'chai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') });

import { APITool } from '../src/utils/ragTools.js';

describe('Planning System Tests', () => {
  
  describe('APITool Planning Tests', () => {
    it('should generate a structured plan for simple product queries', async function() {
      this.timeout(15000); // Increase timeout for LLM calls
      
      const query = "show me all red shoes";
      const result = await APITool(query, "catalog");
      
      // Check if the response includes an API endpoint
      expect(result).to.include('api');
      expect(result).to.include('endpoint');
    });
    
    it('should handle queries with multiple filters', async function() {
      this.timeout(15000);
      
      const query = "find women's shoes under $50 that are available in size 9";
      const result = await APITool(query, "catalog");
      
      // Check that the plan handles multiple filters
      expect(result).to.include('filter');
    });
    
    it('should correctly use conversation history for context', async function() {
      this.timeout(15000);
      
      const conversationHistory = [
        "User: Show me running shoes",
        "Assistant: Here are the running shoes in our catalog..."
      ];
      
      const query = "show me the ones in red";
      const result = await APITool(query, "catalog", conversationHistory);
      
      // Should reference running shoes from history
      expect(result.toLowerCase()).to.include('run');
      expect(result.toLowerCase()).to.include('red');
    });
  });
  
  describe('Validation Tests', () => {
    it('should validate and potentially revise plans that don\'t match user intent', async function() {
      this.timeout(20000);
      
      // This is a query where the initial plan might be off
      const query = "what's the most expensive item in the summer collection?";
      const result = await APITool(query, "catalog");
      
      // Should contain sorting logic to find most expensive
      expect(result.toLowerCase()).to.include('sort');
      expect(result.toLowerCase()).to.include('price');
    });
  });
});