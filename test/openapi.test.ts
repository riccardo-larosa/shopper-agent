import { getFullOpenAPI, getListOfAPIEndpoints } from '../src/lib/openapis.js';

const cv_url = 'https://elasticpath.dev/assets/openapispecs/catalog/catalog_view.yaml';
const cart_url = 'https://elasticpath.dev/assets/openapispecs/carts/OpenAPISpec.yaml';
const cv_path = '/catalog/products/{product_id}';
const cart_path = '/v2/carts/{cartID}/items';
const method = 'post';

let url = cart_url;
let path = cart_path;
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