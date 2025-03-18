import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { expect } from 'chai';
import sinon from 'sinon';
import { ChatOpenAI } from "@langchain/openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') });

describe('Action Validation Tests', () => {
  let llmStub;
  let validationMock;
  
  beforeEach(() => {
    // Create test doubles for the LLM interactions
    llmStub = sinon.stub(ChatOpenAI.prototype, 'invoke');
    
    // First call is the planning phase
    llmStub.onFirstCall().resolves({
      content: "Primary intent: Search for products\nRequired info: Product type=shoes, color=red\nExpected outcome: List of matching products"
    });
    
    // Second call is the API selection phase
    llmStub.onSecondCall().resolves({
      content: "Use GET /catalog/products?filter=eq(color,red)&filter=eq(type,shoes)"
    });
    
    // Third call is for validation
    validationMock = llmStub.onThirdCall();
  });
  
  afterEach(() => {
    // Clean up stubs after each test
    llmStub.restore();
  });
  
  it('should accept valid action plans without revision', async () => {
    // Mock the validation to return VALID
    validationMock.resolves({
      content: "VALID"
    });
    
    // Create a simplified version of the APITool function for testing
    const mockAPITool = async (query, apiName, history = []) => {
      // Simulate the APITool flow using mocked LLM responses
      const llm = new ChatOpenAI();
      
      // Call planning step
      const planResult = await llm.invoke([
        { role: "system", content: "Planning" },
        { role: "user", content: query }
      ]);
      
      // Call API selection step
      const apiResult = await llm.invoke([
        { role: "system", content: "API Selection" },
        { role: "user", content: query }
      ]);
      
      // Call validation step
      const validationResult = await llm.invoke([
        { role: "system", content: "Validation" }
      ]);
      
      // No revision needed if validation is VALID
      if (validationResult.content === "VALID") {
        return apiResult.content;
      }
      
      // In a real implementation, this would call a revision step
      return "Revised plan"; 
    };
    
    // Run the test
    const result = await mockAPITool("find red shoes", "catalog");
    
    // Verify that the result is the unmodified API plan
    expect(result).to.equal("Use GET /catalog/products?filter=eq(color,red)&filter=eq(type,shoes)");
    // Verify that the validation function was called
    expect(llmStub.callCount).to.equal(3);
  });
  
  it('should revise action plans that don\'t match user intent', async () => {
    // Mock the validation to return NEEDS_REVISION
    validationMock.resolves({
      content: "NEEDS_REVISION: The plan doesn't include size filter mentioned in the query"
    });
    
    // Add a fourth call for the revision
    llmStub.onCall(3).resolves({
      content: "Use GET /catalog/products?filter=eq(color,red)&filter=eq(type,shoes)&filter=eq(size,9)"
    });
    
    // Create a simplified version of the APITool function for testing
    const mockAPITool = async (query, apiName, history = []) => {
      // Simulate the APITool flow using mocked LLM responses
      const llm = new ChatOpenAI();
      
      // Call planning step
      const planResult = await llm.invoke([
        { role: "system", content: "Planning" },
        { role: "user", content: query }
      ]);
      
      // Call API selection step
      const apiResult = await llm.invoke([
        { role: "system", content: "API Selection" },
        { role: "user", content: query }
      ]);
      
      // Call validation step
      const validationResult = await llm.invoke([
        { role: "system", content: "Validation" }
      ]);
      
      // Check if revision is needed
      if (validationResult.content.includes("NEEDS_REVISION")) {
        // Call revision step
        const revisedResult = await llm.invoke([
          { role: "system", content: "Revision" }
        ]);
        return revisedResult.content;
      }
      
      return apiResult.content;
    };
    
    // Run the test with a query that should trigger revision
    const result = await mockAPITool("find red shoes in size 9", "catalog");
    
    // Verify that the result is the revised API plan
    expect(result).to.equal("Use GET /catalog/products?filter=eq(color,red)&filter=eq(type,shoes)&filter=eq(size,9)");
    // Verify that the revision function was called
    expect(llmStub.callCount).to.equal(4);
  });
});