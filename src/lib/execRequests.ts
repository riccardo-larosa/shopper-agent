// if token is not provided, this is used to get the token
function createHeaders(token?: string) {
    const headers: Record<string, string> = {
        ...(token && { 'Authorization': `Bearer ${token}` }),
        'Content-Type': token ? 'application/json' : 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
    };
    console.log(`headers: ${JSON.stringify(headers)}`);
    return headers;
}

function getBaseurl() {
    return process.env.EP_BASE_URL;
}

export async function execGetRequest(
    endpoint: string,
    token: string,
    // params: Record<string, any> = {},
    //baseurl: string = getBaseurl()
): Promise<any> {
    try {
        const baseurl = getBaseurl();

        console.log(`==> GET ${baseurl + endpoint} `);
        const response = await fetch(baseurl + endpoint, {
            method: 'GET',
            headers: createHeaders(token),
            // ...params && { search: new URLSearchParams(params).toString() }
        });

        if (!response.ok) {
            throw new Error(`status: ${response.status} message: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error in execGetRequest:', error);
        throw error;
    }
}

// if token is not provided, this is used to get the token
export async function execPostRequest(
    endpoint: string,
    token: string,
    body: any,
    // baseurl: string = getBaseurl()
): Promise<any> {
    try {
        const baseurl = getBaseurl();
        console.log(`calling execPostRequest: ${baseurl + endpoint}`);
        console.log(`body: ${JSON.stringify(body)}`);
        const response = await fetch(baseurl + endpoint, {
            method: 'POST',
            headers: createHeaders(token),
            body: token
                ? JSON.stringify(body)  // for application/json
                : new URLSearchParams(body).toString()  // for application/x-www-form-urlencoded
        });

        if (!response.ok) {
            // const errorText = await response.text();
            // console.error(`HTTP error! status: ${response.status}, message: ${errorText}`);
            throw new Error(`HTTP error! status: ${response.status}  message: ${response.statusText}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error in execPostRequest:', error);
        throw error;
    }
}