/**
 * Dialogflow ES Fulfillment Webhook — Webex Contact Center Integration
 * =====================================================================
 * Dialogflow generation: ES (Essentials / legacy — use CX for new projects)
 * Deploy target:         Dialogflow ES Inline Editor → Firebase Cloud Functions
 * WxCC integration:      Virtual Agent Voice node → Dialogflow ES agent → this webhook
 *
 * WHAT THIS DOES:
 *   Handles Dialogflow ES fulfillment requests triggered by matched intents.
 *   On "Default Welcome Intent": reads caller context passed from Webex Contact Center
 *   via originalDetectIntentRequest.payload, performs a CRM lookup using the caller's
 *   PIN, sets output context, and returns a personalized spoken greeting.
 *   On "Confirm Details": reads context set in the welcome turn and chains to an
 *   escalation event.
 *
 * WHAT THIS DOES NOT DO:
 *   - Validate incoming webhook request signatures (add in production)
 *   - Handle authentication with Webex Contact Center (handled by WxCC + Firebase IAM)
 *   - Implement retry logic, circuit breaking, or persistent logging
 *   - Support multiple users / multi-tenant deployments
 *
 * ENVIRONMENT VARIABLES (set via Firebase CLI or Cloud Function runtime config):
 *   MOCK_API_URL_ES  — Base URL of the CRM lookup API. The function appends
 *                      ?pin=<caller_pin> to this URL and expects a JSON array
 *                      response with account and phone fields.
 *                      Example: https://your-crm.example.com/api/customers
 *
 * WEBEX CONTACT CENTER CALLER CONTEXT (via originalDetectIntentRequest.payload):
 *   name    — Caller's name passed from WxCC flow
 *   email   — Caller's email passed from WxCC flow
 *   reason  — Call reason passed from WxCC flow
 *   pin     — Caller's PIN used for CRM lookup
 *
 * HOW TO DEPLOY (Inline Editor):
 *   1. In Dialogflow ES console, go to Fulfillment → Inline Editor.
 *   2. Replace index.js with the contents of this file.
 *   3. Replace package.json with src/dialogflow-es-sample/package.json.
 *   4. Set MOCK_API_URL_ES as a Firebase environment variable:
 *        firebase functions:config:set crm.api_url="https://..."
 *      Then update the fetchCRMInfo call to use functions.config().crm.api_url.
 *   5. Click Deploy.
 *
 * ADAPTED FROM:
 *   https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/dialogflow-sample/dialogflow-es-sample
 */

// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const functions = require('firebase-functions');
const { WebhookClient } = require('dialogflow-fulfillment');
const fetch = require('node-fetch');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(
  (request, response) => {
    const agent = new WebhookClient({ request, response });
    console.log(
      'Dialogflow Request headers: ' + JSON.stringify(request.headers)
    );
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

    /**
     * Fetch CRM data for a given caller PIN.
     * Replace MOCK_API_URL_ES with a real CRM endpoint in production.
     *
     * @param {string} pin  Caller's PIN extracted from WxCC payload
     * @returns {{ account: string, phone: string }}
     */
    const fetchCRMInfo = async (pin) => {
      const crmBaseUrl = process.env.MOCK_API_URL_ES;

      if (!crmBaseUrl) {
        throw new Error('MOCK_API_URL_ES environment variable is not set.');
      }

      const crmResponse = await fetch(`${crmBaseUrl}?pin=${pin}`);
      const data = await crmResponse.json();
      const account = data[0].account;
      const phone = data[0].phone;
      return { account, phone };
    };

    /**
     * Handler for "Default Welcome Intent".
     * Reads caller context from Webex Contact Center via
     * originalDetectIntentRequest.payload, performs CRM lookup, and
     * returns a personalized spoken greeting.
     */
    const welcome = async (agent) => {
      // Read caller context injected by Webex Contact Center
      const webexCCData =
        request.body.originalDetectIntentRequest.payload || {};

      const customerName = webexCCData.name || 'Valued Customer';
      const customerEmail = webexCCData.email || 'your email';
      const customerReason = webexCCData.reason || 'your inquiry';
      const customerPin = webexCCData.pin || '00000';

      // CRM lookup using caller's PIN
      const crmInfo = await fetchCRMInfo(customerPin);

      // Set output context for the next turn (Confirm Details intent)
      agent.context.set({
        name: 'confirm-details',
        lifespan: 5,
        parameters: {
          account: crmInfo.account,
          phone: crmInfo.phone,
          'account.original': crmInfo.account,
          'phone.original': crmInfo.phone,
        },
      });

      agent.add(
        `<speak> Hello ${customerName}, ` +
          `we see you sent us an email from ${customerEmail} ` +
          `and are probably calling regarding ${customerReason}, Right? ` +
          `Please confirm your account number is <say-as interpret-as="characters">${crmInfo.account}</say-as> </speak>`
      );
    };

    /**
     * Handler for "Confirm Details" intent.
     * Reads account/phone from context set in the welcome turn and
     * chains to the escalation event.
     */
    const confirmDetails = (agent) => {
      const contexts = request.body.queryResult.outputContexts;

      const myContext = contexts.filter((item) => {
        return item.parameters && item.parameters.account && item.parameters.phone;
      });

      if (!myContext.length) {
        agent.add("I'm sorry, I couldn't retrieve your account details. Please try again.");
        return;
      }

      agent.context.set({
        name: 'escalated',
        lifespan: 5,
        parameters: {
          account: myContext[0].parameters.account,
          'account.original': myContext[0].parameters.account,
          phone: myContext[0].parameters.phone,
          'phone.original': myContext[0].parameters.phone,
        },
      });

      agent.add('Confirming Details..');

      agent.setFollowupEvent({
        name: 'escalated',
        parameters: {
          account: myContext[0].parameters.account,
          phone: myContext[0].parameters.phone,
        },
      });
    };

    /**
     * Default fallback handler.
     */
    const fallback = (agent) => {
      agent.add(`I didn't understand`);
      agent.add(`I'm sorry, can you try again?`);
    };

    // Map Dialogflow intent display names to handler functions
    const intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', fallback);
    intentMap.set('Confirm Details', confirmDetails);

    agent.handleRequest(intentMap);
  }
);
