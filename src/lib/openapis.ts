import SwaggerParser from '@apidevtools/swagger-parser';
import { ChatOpenAI } from "@langchain/openai";



async function getFullOpenAPI(url: string, path: string, method: string) {
    console.log(`==> Getting full OpenAPI for ${url} ${path} ${method}`);
    const spec = await SwaggerParser.dereference(url);
    const pathItem = spec.paths[path];
    const operation = pathItem[method.toLowerCase()];
    const description = operation.description || 'No description';
    console.log(`Description: ${description}`);
    // add parameters to the description
    const parameters = operation.parameters || [];
    const parameterString = parameters.map(param => `${param.name}: ${param.description}`).join(', ');
    // add responses if they are 200 or 201
    const responses = operation.responses || {};
    const responseString = Object.keys(responses).filter(statusCode => statusCode === '200' || statusCode === '201').map(statusCode => `${statusCode}: ${responses[statusCode].description}`).join(', ');
    // add request body if it exists
    const requestBody = operation.requestBody || {};
    const requestBodyString = requestBody.description || 'No request body';
    console.log(`==> ${description} Parameters: ${parameterString} Responses: ${responseString} Request Body: ${requestBodyString}`);
    return `${description} Parameters: ${parameterString} Responses: ${responseString} Request Body: ${requestBodyString}`;
}


async function getAPIEndpointsAndDescriptions(url: string) {
    console.log(`==> Getting API endpoints and descriptions for ${url}`);
    const spec = await SwaggerParser.parse(url);
    // loop through the spec and print the paths
    let endpoints = "";
    for (const path in spec.paths) {
        const pathItem = spec.paths[path];
        // Loop through HTTP methods (operations) for each path
        for (const method in pathItem) {
            // Skip properties that aren't HTTP methods
            if (!['get', 'post', 'put', 'delete', 'patch', 'options', 'head'].includes(method)) {
                continue;
            }
            const operation = pathItem[method];
            const description = operation.description || 'No description';
            const cleanedDescription = description.includes(':::note')
                ? description.substring(0, description.indexOf(':::note')).trim()
                : description;
            const truncatedDescription = cleanedDescription.length > 1000
                ? cleanedDescription.substring(0, 500) + '...'
                : cleanedDescription;
            console.log(`${method.toUpperCase()} ${path}  ${truncatedDescription}`);
            endpoints += `${method.toUpperCase()} ${path}  ${truncatedDescription}\n`;

        }
    }
    console.log(`==> Found ${endpoints.length} endpoints`);
    return endpoints;

}

export async function getOpenApiSpec(query: string, url: string) {
    const endpoints = await getAPIEndpointsAndDescriptions(url);
    const systemPrompt = `
        You are a helpful assistant that can help me find the endpoint that matches the query.
        Here are the endpoints and descriptions:
        ${endpoints}`;
    const userPrompt = `
        I am looking for the Method and Path that better matches the query: ${query}
        Your answer should be in the following format: Method Path. 
        For instance GET /catalog/products
        or POST /pcm/products `;

    const llm = new ChatOpenAI({
        model: "gpt-4o-mini",
        temperature: 0,
        });
      
    const response = await llm.invoke([systemPrompt, userPrompt]);
    const answer = response.content;
    if (!answer) {
        throw new Error("No answer from GPT");
    }
    const answerText = String(answer);
    const [method, path] = answerText.split(' ');
    const fullOpenAPI = await getFullOpenAPI(url, path, method);
    return fullOpenAPI;
}
