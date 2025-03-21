import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { testOpenApiTools } from './openapi.tools.test.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') });

import { getFullOpenAPI, getListOfAPIEndpoints } from '../src/lib/openapis.js';
import { findAPISpecification } from '../src/lib/mongoDBRetriever.js';
import { APITool } from '../src/utils/ragTools.js';
// Log environment variables (without sensitive values)
console.log('Environment variables loaded:', {
  EP_BASE_URL: process.env.EP_BASE_URL ? '✓' : '✗',
  EP_CLIENT_ID: process.env.EP_CLIENT_ID ? '✓' : '✗',
  EP_CLIENT_SECRET: process.env.EP_CLIENT_SECRET ? '✓' : '✗',
});

async function runTest() {
  try {
    const result = await APITool("show me all products with status live","pim");
    // const result = await findAPISpecification("show me all products with status live","pim");
    console.log('\nResult:');
    console.log(result);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  process.exit(0);
}

// runTest();
testOpenApiTools();

// const urls = [
//   'https://elasticpath.dev/assets/openapispecs/catalog/catalog_view.yaml',
//   'https://elasticpath.dev/assets/openapispecs/carts/OpenAPISpec.yaml',
//   'https://elasticpath.dev/assets/openapispecs/pim/pim.yaml',
//   'https://elasticpath.dev/assets/openapispecs/files/files.yaml',
//   'https://elasticpath.dev/assets/openapispecs/addresses/AccountAddresses.yaml'
// ];
// const paths = [
//   '/catalog/products/{product_id}',
//   '/v2/orders/anonymize',
//   '/pcm/products/{product_id}',
//   '/v2/files',
//   '/v2/accounts/{accountID}/addresses'
// ];
// const method = 'post';

// let url = urls[1];
// let path = paths[1];
// console.log('Testing getFullOpenAPI function...');
// console.log('URL:', url);
// console.log('Path:', path);
// console.log('Method:', method);

// getListOfAPIEndpoints(url)
//   .then(result => {
//     console.log('\nEndpoints List Result:');
//     console.log(result);
//     // After getting the endpoints list, get the full OpenAPI details
//     return getFullOpenAPI(url, path, method);
//   })
//   .then(result => {
//     console.log('\nFull OpenAPI Result:');
//     console.log(result);
//   })
//   .catch(error => {
//     console.error('Error:', error);
//   }); 