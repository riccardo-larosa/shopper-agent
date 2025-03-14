/**
 * Creates headers for API requests
 * @param token - Optional authentication token
 * @returns Headers object with appropriate Content-Type and Authorization
 */
function createHeaders(token?: string) {
    const headers: Record<string, string> = {
        ...(token && { 'Authorization': `Bearer ${token}` }),
        'Content-Type': token ? 'application/json' : 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
    };
    console.log(`\x1b[93m headers: ${JSON.stringify(headers)}\x1b[0m`);
    return headers;
}

/**
 * Gets the base URL from environment variables
 * @returns The base URL for API requests
 */
function getBaseurl() {
    return process.env.EP_BASE_URL;
}

/**
 * Executes a GET request to the API
 * @param endpoint - The API endpoint to call
 * @param token - The authentication token
 * @returns The response data as JSON
 * @throws Error if the request fails or returns a non-200 status code
 */
export async function execGetRequest(
    endpoint: string,
    token: string,
    // params: Record<string, any> = {},
    //baseurl: string = getBaseurl()
): Promise<any> {
    try {
        const baseurl = getBaseurl();
        const url = generateUrl(baseurl, endpoint);

        console.log(`\x1b[94m ==> GET ${url}\x1b[0m `);
        const response = await fetch(url, {
            method: 'GET',
            headers: createHeaders(token),
            // ...params && { search: new URLSearchParams(params).toString() }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`\x1b[31m HTTP error! status: ${response.status}, message: ${errorText} \x1b[0m`);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error in execGetRequest:', error);
        throw error;
    }
}

/**
 * Executes a POST request to the API
 * @param endpoint - The API endpoint to call
 * @param token - The authentication token
 * @param body - The data to send in the request body
 * @returns The response data as JSON
 * @throws Error if the request fails or returns a non-200 status code
 */
export async function execPostRequest(
    endpoint: string,
    token: string,
    body: any,
    // baseurl: string = getBaseurl()
): Promise<any> {
    try {
        const baseurl = getBaseurl();
        const url = generateUrl(baseurl, endpoint);
        
        console.log(`\x1b[94m ==> POST ${url}\x1b[0m `);
        console.log(`body: ${JSON.stringify(body)}`);
        const response = await fetch(url, {
            method: 'POST',
            headers: createHeaders(token),
            body: token
                ? JSON.stringify(body)  // for application/json
                : new URLSearchParams(body).toString()  // for application/x-www-form-urlencoded
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`\x1b[31m HTTP error! status: ${response.status}, message: ${errorText} \x1b[0m`);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error in execPostRequest:', error);
        throw error;
    }
}

/**
 * Executes a PUT request to the API
 * @param endpoint - The API endpoint to call
 * @param token - The authentication token
 * @param body - The data to send in the request body (will be JSON stringified)
 * @returns The response data as JSON
 * @throws Error if the request fails or returns a non-200 status code
 */
export async function execPutRequest(
    endpoint: string,
    token: string,
    body: any,
    // baseurl: string = getBaseurl()
): Promise<any> {
    try {
        const baseurl = getBaseurl();
        const url = generateUrl(baseurl, endpoint);
        
        console.log(`\x1b[94m ==> PUT ${url}\x1b[0m `);
        console.log(`body: ${JSON.stringify(body)}`);
        const response = await fetch(url, {
            method: 'PUT',
            headers: createHeaders(token),
            body: JSON.stringify(body)  // PUT requests always use JSON
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`\x1b[31m HTTP error! status: ${response.status}, message: ${errorText} \x1b[0m`);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error in execPutRequest:', error);
        throw error;
    }
}

/**
 * Generates a valid URL by combining a base URL and endpoint
 * @param baseUrl The base URL of the API
 * @param endpoint The API endpoint to append
 * @returns A properly formatted URL
 */
export function generateUrl(baseUrl: string, endpoint: string): string {
    // Remove any trailing slash from baseUrl and leading slash from endpoint
    const cleanBaseUrl = baseUrl.replace(/\/$/, '');
    const cleanEndpoint = endpoint.replace(/^\//, '');
    
    // Combine the URLs
    return `${cleanBaseUrl}/${cleanEndpoint}`;
}