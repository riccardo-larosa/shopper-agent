import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
config({ path: resolve(__dirname, '../.env') });

import { getFullOpenAPI, getListOfAPIEndpoints } from '../src/lib/openapis.js';
import { findTechnicalContent } from '../src/lib/mongoDBRetriever.js';

// Log environment variables (without sensitive values)
console.log('Environment variables loaded:', {
  EP_BASE_URL: process.env.EP_BASE_URL ? '✓' : '✗',
  EP_CLIENT_ID: process.env.EP_CLIENT_ID ? '✓' : '✗',
  EP_CLIENT_SECRET: process.env.EP_CLIENT_SECRET ? '✓' : '✗',
});

async function runTest() {
  try {
    const result = await findTechnicalContent(
      'show me products with status draft',
      { "source": "docs/api/pim/get-product-template-relationships" }
    );
    console.log('\nResult:');
    console.log(result);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
  process.exit(0);
}

runTest();

// const urls = [
//   'https://elasticpath.dev/assets/openapispecs/catalog/catalog_view.yaml',
//   'https://elasticpath.dev/assets/openapispecs/carts/OpenAPISpec.yaml',
//   'https://elasticpath.dev/assets/openapispecs/pim/pim.yaml',
//   'https://elasticpath.dev/assets/openapispecs/files/files.yaml'
// ];
// const paths = [
//   '/catalog/products/{product_id}',
//   '/v2/carts/{cartID}/items',
//   '/pcm/products/{product_id}',
//   '/v2/files'
// ];
// const method = 'post';

// let url = urls[3];
// let path = paths[3];
// console.log('Testing getFullOpenAPI function...');
// console.log('URL:', url);
// console.log('Path:', path);
// console.log('Method:', method);

// getListOfAPIEndpoints(url)
//   .then(result => {
//     console.log('\nResult:');
//     console.log(result);
//   })
//   .catch(error => {
//     console.error('Error:', error);
//   });

// getFullOpenAPI(url, path, method)
//   .then(result => {
//     console.log('\nResult:');
//     console.log(result);
//   })
//   .catch(error => {
//     console.error('Error:', error);
//   }); 