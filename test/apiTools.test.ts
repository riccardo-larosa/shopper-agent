// Simple test to validate execPostRequestTool's params validation
// Run with: npm run test:apitools

// Direct test of the zod schema validation
import { execPostRequestTool } from '../src/utils/apiTools.js';

// Extract schema definition for testing
const schema = execPostRequestTool.schema;

// Test cases
console.log('===== Testing execPostRequestTool Schema Validation =====');

// Test valid case
try {
  const validParams = {
    endpoint: '/test-endpoint',
    body: { test: 'data' },
    grantType: 'implicit'
  };
  const result = schema.parse(validParams);
  console.log('✅ Valid parameters passed validation:', JSON.stringify(result));
} catch (error) {
  console.error('❌ Valid parameters failed validation:', error);
  process.exit(1);
}

// Test missing body
try {
  const missingBodyParams = {
    endpoint: '/test-endpoint',
    grantType: 'implicit'
  };
  schema.parse(missingBodyParams);
  console.error('❌ Missing body should fail validation but passed');
  process.exit(1);
} catch (error) {
  console.log('✅ Missing body correctly failed validation');
}

// Test empty body
try {
  const emptyBodyParams = {
    endpoint: '/test-endpoint',
    body: {},
    grantType: 'implicit'
  };
  schema.parse(emptyBodyParams);
  console.error('❌ Empty body should fail validation but passed');
  process.exit(1);
} catch (error) {
  console.log('✅ Empty body correctly failed validation with message:', error.errors[0].message);
}

// Test invalid grant type
try {
  const invalidGrantParams = {
    endpoint: '/test-endpoint',
    body: { test: 'data' },
    grantType: 'invalid'
  };
  schema.parse(invalidGrantParams);
  console.error('❌ Invalid grantType should fail validation but passed');
  process.exit(1);
} catch (error) {
  console.log('✅ Invalid grantType correctly failed validation');
}

console.log('===== All execPostRequestTool Schema Validation Tests Passed =====');