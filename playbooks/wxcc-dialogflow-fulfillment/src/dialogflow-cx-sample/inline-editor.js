/**
 * Dialogflow CX Fulfillment Webhook — Webex Contact Center Integration
 * =====================================================================
 * Dialogflow generation: CX (current, recommended for new projects)
 * Deploy target:         Google Cloud Functions (HTTP trigger)
 * WxCC integration:      Virtual Agent Voice node → Dialogflow CX agent → this webhook
 *
 * WHAT THIS DOES:
 *   Handles a Dialogflow CX webhook POST request triggered by a page or route group.
 *   Calls a backend API to retrieve an account balance for the caller, then returns
 *   a fulfillment_response that Dialogflow CX speaks back to the caller.
 *
 * WHAT THIS DOES NOT DO:
 *   - Validate incoming webhook request signatures (add in production)
 *   - Handle authentication with Webex Contact Center (handled by WxCC + Google Cloud IAM)
 *   - Implement retry logic, circuit breaking, or persistent logging
 *   - Support multiple users / multi-tenant deployments
 *
 * ENVIRONMENT VARIABLES (set in Cloud Function runtime configuration):
 *   MOCK_API_URL_CX  — Full URL of the account balance API endpoint.
 *                      The API must return a JSON object with a "balance" key.
 *                      Example: https://your-api.example.com/balance?customer=Caller
 *
 * CALLER CONTEXT:
 *   Caller metadata is passed from Webex Contact Center as Dialogflow CX session
 *   parameters. Access them via req.body.sessionInfo.parameters if needed.
 *
 * RESPONSE SHAPE (Dialogflow CX fulfillment_response):
 *   {
 *     fulfillment_response: {
 *       messages: [{ text: { text: ["...spoken text..."] } }]
 *     }
 *   }
 *
 * ADAPTED FROM:
 *   https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/dialogflow-sample/dialogflow-cx-sample
 */

'use strict';

const https = require('https');

/**
 * Cloud Function entry point for Dialogflow CX webhook fulfillment.
 * Function name: acc_balance
 *
 * @param {import('express').Request}  req  Dialogflow CX webhook POST request
 * @param {import('express').Response} res  HTTP response
 */
exports.acc_balance = (req, res) => {
  const mockApiUrl = process.env.MOCK_API_URL_CX;

  if (!mockApiUrl) {
    console.error('MOCK_API_URL_CX environment variable is not set.');
    res.status(500).send('Server configuration error: MOCK_API_URL_CX not set.');
    return;
  }

  https
    .get(mockApiUrl, (apiResponse) => {
      let data = '';

      apiResponse.on('data', (chunk) => {
        data += chunk;
      });

      apiResponse.on('end', () => {
        try {
          const responseData = JSON.parse(data);
          const bal = responseData.balance;

          const jsonResponse = {
            fulfillment_response: {
              messages: [
                {
                  text: {
                    text: ['The balance amount in your account is ' + bal + '.'],
                  },
                },
              ],
            },
          };

          console.log('Balance retrieved:', bal);
          res.status(200).send(jsonResponse);
        } catch (error) {
          console.error('Error parsing API response:', error.message);
          res.status(500).send('Error parsing API response');
        }
      });
    })
    .on('error', (error) => {
      console.error('Error calling backend API:', error.message);
      res.status(500).send('Error calling backend API');
    });
};
