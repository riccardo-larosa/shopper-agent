import SwaggerParser from '@apidevtools/swagger-parser';
import { ChatOpenAI } from "@langchain/openai";
import { dump as yamlDump } from 'js-yaml';
import { z } from 'zod';

const AGENT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";

// Define types for better code organization
interface OpenAPIOperation {
  description?: string;
  parameters?: any[];
  responses?: Record<string, any>;
  requestBody?: any;
}

// Use a more flexible approach for path items
// This avoids the issue with $ref not matching the index signature
type OpenAPIPathItem = Record<string, any>;

// Use any for the spec type to avoid type conflicts with SwaggerParser
type OpenAPISpec = any;

// HTTP methods supported by OpenAPI
const HTTP_METHODS = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

// Cache for loaded OpenAPI specs to avoid redundant loading
const specCache: Record<string, { 
  spec: OpenAPISpec,
  timestamp: number 
}> = {};

// Cache expiration time (30 minutes)
const CACHE_EXPIRATION_MS = 30 * 60 * 1000;

interface OpenAPISchemaProperty extends OpenAPISchema {
  type?: string;
  description?: string;
  example?: any;
  default?: any;
  properties?: Record<string, OpenAPISchemaProperty>;
}

interface OpenAPISchema {
  type?: string;
  required?: string[];
  properties?: Record<string, OpenAPISchemaProperty>;
  oneOf?: OpenAPISchema[];
  allOf?: OpenAPISchema[];
}

interface OpenAPIExample {
  summary?: string;
  value?: any;
  description?: string;
}

interface OpenAPIContent {
  schema?: OpenAPISchema;
  examples?: Record<string, OpenAPIExample>;
}

interface OpenAPIRequestBody {
  description?: string;
  content?: {
    'application/json'?: OpenAPIContent;
  };
  required?: boolean;
}

/**
 * Loads and parses an OpenAPI specification from a URL with caching
 * Always dereferences the spec (resolves $refs)
 * @param url The URL of the OpenAPI specification
 * @returns The dereferenced OpenAPI specification
 */
async function loadOpenAPISpec(url: string): Promise<OpenAPISpec> {
  const now = Date.now();
  
  // Check if we have a valid cached version
  if (specCache[url] && (now - specCache[url].timestamp) < CACHE_EXPIRATION_MS) {
    return specCache[url].spec;
  }
  
  // Load and dereference the spec
  const spec = await SwaggerParser.dereference(url);
  
  // Cache the dereferenced spec
  specCache[url] = {
    spec,
    timestamp: now
  };
  
  return spec;
}

/**
 * Gets an operation from an OpenAPI spec
 * @param spec The OpenAPI specification
 * @param path The path to get the operation from
 * @param method The HTTP method
 * @returns The operation or undefined if not found
 */
function getOperation(spec: OpenAPISpec, path: string, method: string): OpenAPIOperation | undefined {
  const pathItem = spec.paths?.[path];
  if (!pathItem) return undefined;
  
  const operation = pathItem[method.toLowerCase()];
  return operation;
}

/**
 * Formats a description to clean and truncate it if needed
 * @param description The description to format
 * @param maxLength Maximum length before truncation
 * @returns The formatted description
 */
function formatDescription(description: string = 'No description', maxLength?: number): string {
  // Clean the description by removing notes
  let cleanedDescription = description;
  if (description.includes(':::note')) {
    cleanedDescription = description.substring(0, description.indexOf(':::note')).trim();
  }
  
  // Truncate if needed
  if (maxLength && cleanedDescription.length > maxLength) {
    return cleanedDescription.substring(0, maxLength) + '...';
  }
  
  return cleanedDescription;
}

/**
 * Formats request body information from an OpenAPI operation
 * @param requestBody The request body object from the OpenAPI spec
 * @returns A formatted string with request body details
 */
function formatRequestBody(requestBody: OpenAPIRequestBody): string {
  if (!requestBody) {
    return 'No request body';
  }

  let result = requestBody.description || '';
  
  // Extract content if it exists
  if (requestBody.content && requestBody.content['application/json']) {
    const jsonContent = requestBody.content['application/json'];
    
    // Extract examples if they exist (top level examples)
    if (jsonContent.examples) {
      result += '\nExamples:\n';
      
      for (const [exampleKey, example] of Object.entries(jsonContent.examples)) {
        if (example.summary) {
          result += `\n${example.summary}:\n`;
        } else {
          result += `\n${exampleKey}:\n`;
        }
        if (example.value) {
          const jsonExample = JSON.stringify(example.value, null, 2);
          result += `${jsonExample}\n`;
        }
      }
    }
    // If no examples but has schema
    else if (jsonContent.schema) {
      const schema = jsonContent.schema;
      
      // Handle oneOf schemas - these are now dereferenced
      if (schema.oneOf) {
        result += '\nPossible Schemas:\n';
        schema.oneOf.forEach(subSchema => {
          if (subSchema.properties) {
            const example = createExampleFromSchema(subSchema);
            const jsonExample = JSON.stringify(example, null, 2);
            result += `\nExample:\n${jsonExample}\n`;
          }
        });
      }
      // Handle allOf schemas - these are now dereferenced
      else if (schema.allOf) {
        result += '\nCombined Schema Example:\n';
        // Merge all schemas in allOf
        const mergedExample = schema.allOf.reduce((acc, subSchema) => {
          if (subSchema.properties) {
            const example = createExampleFromSchema(subSchema);
            return { ...acc, ...example };
          }
          return acc;
        }, {});
        const jsonExample = JSON.stringify(mergedExample, null, 2);
        result += `${jsonExample}\n`;
      }
      // Handle regular schema
      else if (schema.properties) {
        const example = createExampleFromSchema(schema);
        const jsonExample = JSON.stringify(example, null, 2);
        result += `\nExample:\n${jsonExample}`;
      }
    }
  }
  
  return result;
}

function createExampleFromSchema(schema: OpenAPISchema): Record<string, any> {
  const example: Record<string, any> = {};
  
  if (schema.properties) {
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      if (propSchema.properties) {
        example[propName] = createExampleFromSchema(propSchema);
      } else {
        example[propName] = propSchema.example || propSchema.default || '';
      }
    }
  }
  
  return example;
}

/**
 * Gets detailed information about a specific API endpoint
 * @param spec The OpenAPI specification
 * @param path The path of the endpoint
 * @param method The HTTP method
 * @returns A formatted string with endpoint details
 */
export function formatEndpointDetails(spec: OpenAPISpec, path: string, method: string): string {
  const operation = getOperation(spec, path, method.toLowerCase());
  
  if (!operation) {
    return `No operation found for ${method} ${path}`;
  }
  
  const description = formatDescription(operation.description, 4000);
  
  // Format parameters
  const parameters = operation.parameters || [];
  const parameterString = parameters.map(param => 
    `
    name: ${param.name}
    in: ${param.in}
    required: ${param.required}
    description: ${param.description}`).join(',\n ');
  
  // Format responses
  const responses = operation.responses || {};
  const responseString = Object.keys(responses)
    .filter(statusCode => statusCode === '200' || statusCode === '201')
    .map(statusCode => `${statusCode}: ${responses[statusCode].description}`)
    .join(', \n ');
  
  // Format request body using the new helper function
  const requestBody = operation.requestBody || {};
  const requestBodyString = formatRequestBody(requestBody);
  
  return `
  method: ${method} 
  path: ${path} 
  description: ${description} 
  Parameters: ${parameterString} 
  Request Body: ${requestBodyString}
  Responses: ${responseString} `;
}

/**
 * Gets detailed information about a specific API endpoint
 * @param url The URL of the OpenAPI specification
 * @param path The path of the endpoint
 * @param method The HTTP method
 * @returns A formatted string with endpoint details
 */
export async function getFullOpenAPI(url: string, path: string, method: string) {
  console.log(`==> Getting full OpenAPI for ${url} ${path} ${method}`);
  
  const spec = await loadOpenAPISpec(url);
  return formatEndpointDetails(spec, path, method);
}

/**
 * Gets a list of all API endpoints from an OpenAPI specification
 * @param url The URL of the OpenAPI specification
 * @returns A formatted string with all endpoints and their descriptions
 */
export async function getListOfAPIEndpoints(url: string) {
  console.log(`==> Getting API endpoints and descriptions for ${url}`);
  
  const spec = await loadOpenAPISpec(url);
  let endpoints = "";
  
  // Loop through all paths and methods
  for (const path in spec.paths) {
    const pathItem = spec.paths[path];
    
    // Loop through HTTP methods for each path
    for (const method in pathItem) {
      // Skip properties that aren't HTTP methods
      if (!HTTP_METHODS.includes(method)) {
        continue;
      }
      
      const operation = pathItem[method];
      const formattedDescription = formatDescription(operation.description, 200);
      
      // console.log(`${method.toUpperCase()} ${path}`);
      endpoints += `${method.toUpperCase()} ${path}  ${formattedDescription}\n`;
    }

  }
  
  console.log(`==> Found ${endpoints.split('\n').filter(line => line.trim()).length} endpoints`);
  return endpoints;
}

/**
 * Uses LLM to find the best matching API endpoint for a query
 * @param query The user query
 * @param url The URL of the OpenAPI specification
 * @returns Details about the matching endpoint
 */
export async function getOpenApiSpec(query: string, url: string) {
  console.log(`==> Getting OpenAPI spec for ${query} using ${url}`);
  
  // Load the spec once at the beginning
  const spec = await loadOpenAPISpec(url);
  
  // Get the list of endpoints using the already loaded spec
  const endpoints = await getListOfAPIEndpoints(url);
  
  const systemPrompt = `
    You are a helpful assistant that can help me find the endpoint that matches the query.
    Here are the endpoints and descriptions:
    ${endpoints}`;
    
  const userPrompt = `
    Return the Method and Path signature that better matches the query: ${query}
    Your answer should be in the following JSON format: {"method": "Method", "path": "Path"}. 
    Nothing else.
    For instance when query is "show me all shoes", return {"method": "GET", "path": "/catalog/products"} instead of GET /catalog/products?filter=eq(tags,shoes)
    or {"method": "GET", "path": "/catalog/products/{productID}"} instead of GET /catalog/products/12323123
    If the query is about adding products to the cart, return {"method": "POST", "path": "/v2/carts/{cartId}/items"} instead of POST /v2/carts/12312312312/items
    If the query is about showing the content of the cart, return {"method": "GET", "path": "/v2/carts/{cartId}/items"} instead of GET /v2/carts/12312312312/items
    `;

  const llm = new ChatOpenAI({
    model: AGENT_MODEL,
    temperature: 0,
  });
    
  const llmWithStructuredOutput = llm.withStructuredOutput(z.object({
    method: z.string(),
    path: z.string(),
    // content: z.string()
  }));

  // using the structured output, we can get the method and path directly
  const response = await llmWithStructuredOutput.invoke([systemPrompt, userPrompt]);
  console.log(`==> Answer: ${JSON.stringify(response)}`);
  
  if (!response) {
    throw new Error("No answer from GPT");
  }

  try {
    const { method, path } = response;
    console.log(`==> GettingFullOpenAPI for Method: ${method} Path: ${path}`);
    
    // Use the already loaded spec directly
    const fullOpenAPI = formatEndpointDetails(spec, path, method);
    console.log(`==> end of getOpenApiSpec: ${fullOpenAPI.substring(0, 100)}...`);
    
    return fullOpenAPI;
  } catch (error) {
    console.error('Error processing response:', error);
    throw new Error(`Failed to parse LLM response: ${error.message}`);
  }
}
