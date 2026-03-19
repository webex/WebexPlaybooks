const http = require('http');
const axios = require('axios');
const base64url = require('base64url');
var Url = require('url');
require('dotenv').config();
console.log(process.env);

// Function to exchange code for tokens when initiating OAuth flow
async function exchangeCodeForTokens(code) {
    console.log('client id:', process.env.INT_CLIENTID);
    console.log('client secret:', process.env.INT_CLIENTSECRET);
    try {
        const response = await axios.post(
            process.env.TOKEN_ENDPOINT,
            new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                client_id: process.env.INT_CLIENTID,
                client_secret: process.env.INT_CLIENTSECRET,
                redirect_uri: 'http://localhost:3000/redirect'
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        process.env['INT_ACCESSTOKEN'] = response.data.access_token;
        process.env['INT_REFRESHTOKEN'] = response.data.refresh_token;
        return response.data;
    } catch (error) {
        console.error('Error obtaining tokens:', error);
        throw error;
    }
}

// Function to refresh tokens when the access token for the integration expires
async function refreshTokens() {
    try {
        const response = await axios.post(
            process.env.TOKEN_ENDPOINT,
            new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: process.env.INT_REFRESHTOKEN,
                client_id: process.env.INT_CLIENTID,
                client_secret: process.env.INT_CLIENTSECRET
            }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );
        console.log('Tokens refreshed successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error refreshing tokens:', error);
        throw error;
    }
}

// Function to generate application_Id in response to the authorized event
function generateApplicationId(clientId) {
    const prefix = "ciscospark://us/APPLICATION/";
    const applicationId = base64url(prefix + clientId);
    return applicationId;
}

// Function to get orgId from the encoded value in response to the authorized event
function getOrgId(encodedvalue) {
    const decodedvalue = base64url.decode(encodedvalue);
    const orgId = decodedvalue.split("/")[4];
    return orgId;
}

const application_Id = generateApplicationId(process.env.SA_CLIENTID);

// Function to create a Webex webhook for service app authorized event
async function createServiceAppAuthorizedWebhook() {
    console.log('Creating webhook for service app authorized event');
    try {
        const response = await axios.post(
            'https://webexapis.com/v1/webhooks',
            {
                name: 'Service App Authorized Webhook for Webex',
                targetUrl: process.env.TARGET_URL,
                resource: 'serviceApp',
                event: 'authorized',
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.INT_ACCESSTOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('Webhook created successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating webhook:', error);
        if (error.response.status === 401) {
            const tokens = await refreshTokens();
            process.env['INT_ACCESSTOKEN'] = tokens.access_token;
            process.env['INT_REFRESHTOKEN'] = tokens.refresh_token;
            createServiceAppAuthorizedWebhook();
        } else {
            throw error;
        }
    }
}

// Function to create a Webex webhook for service app de-authorized event
async function createServiceAppDeAuthorizedWebhook() {
    console.log('Creating webhook for service app de-authorized event');
    try {
        const response = await axios.post(
            'https://webexapis.com/v1/webhooks',
            {
                name: 'Service App Deauthorized Webhook for Webex',
                targetUrl: process.env.TARGET_URL,
                resource: 'serviceApp',
                event: 'deauthorized',
            },
            {
                headers: {
                    'Authorization': `Bearer ${process.env.INT_ACCESSTOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        console.log('Webhook created successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating webhook:', error);
        if (error.response.status === 401) {
            const tokens = await refreshTokens();
            process.env['INT_ACCESSTOKEN'] = tokens.access_token;
            process.env['INT_REFRESHTOKEN'] = tokens.refresh_token;
            createServiceAppAuthorizedWebhook();
        } else {
            throw error;
        }
    }
}

// Create an HTTP server
const server = http.createServer(async (req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';

        // Collect the data from the request
        req.on('data', chunk => {
            body += chunk.toString();
        });

        // Handle the end of the request
        req.on('end', async () => {
            const event = JSON.parse(body);

            if (event.event === 'authorized') {
                const orgId = getOrgId(event.orgId);

                try {
                    const response = await axios.post(
                        'https://webexapis.com/v1/applications/' + application_Id + '/token',
                        {
                            clientId: process.env.SA_CLIENTID,
                            clientSecret: process.env.SA_CLIENTSECRET,
                            targetOrgId: orgId
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${process.env.INT_ACCESSTOKEN}`,
                                'Content-Type': 'application/json'
                            }
                        }
                    );

                    console.log('Token obtained successfully:', response.data);
                } catch (error) {
                    console.error('Error obtaining token:', error);
                }
            } else if (event.event === 'deauthorized') {
                console.log('Service app de-authorized');
            }

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('OK');
        });
    } else if (req.method === 'GET' && req.url.startsWith('/redirect')) {
        const queryObject = Url.parse(req.url, true).query;
        const code = queryObject.code;
        console.log('Code:', code);
        if (code) {
            try {
                const tokens = await exchangeCodeForTokens(code);
                createServiceAppAuthorizedWebhook();
            } catch (error) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error exchanging code for tokens');
            }
        } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Code not found in query parameters');
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
