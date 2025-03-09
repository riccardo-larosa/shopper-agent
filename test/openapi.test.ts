import { getFullOpenAPI, getListOfAPIEndpoints } from '../src/lib/openapis.js';

const urls = [
  'https://elasticpath.dev/assets/openapispecs/catalog/catalog_view.yaml',
  'https://elasticpath.dev/assets/openapispecs/carts/OpenAPISpec.yaml',
  'https://elasticpath.dev/assets/openapispecs/pim/pim.yaml',
  'https://elasticpath.dev/assets/openapispecs/files/files.yaml'
];
const paths = [
  '/catalog/products/{product_id}',
  '/v2/carts/{cartID}/items',
  '/pcm/products/{product_id}',
  '/v2/files'
];
const method = 'post';

let url = urls[2];
let path = paths[2];
console.log('Testing getFullOpenAPI function...');
console.log('URL:', url);
console.log('Path:', path);
console.log('Method:', method);

getListOfAPIEndpoints(url)
  .then(result => {
    console.log('\nResult:');
    console.log(result);
  })
  .catch(error => {
    console.error('Error:', error);
  });

// getFullOpenAPI(url, path, method)
//   .then(result => {
//     console.log('\nResult:');
//     console.log(result);
//   })
//   .catch(error => {
//     console.error('Error:', error);
//   }); 