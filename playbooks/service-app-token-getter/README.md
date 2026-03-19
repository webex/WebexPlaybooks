# Webex Service App Token Getter

[![Node.js](https://img.shields.io/badge/Node.js-14+-green.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Webex](https://img.shields.io/badge/Webex-Integration-blue.svg)](https://developer.webex.com/)

## Use Case Overview

This Playbook provides a **Webex Integration** for developers who manage and own a **Webex Service App**. It solves the problem of running secure OAuth flows and token management for Service Apps by acting as a companion app that handles authorization, token exchange and refresh, and webhook registration.

**Target persona:** Developers who own or operate a Webex Service App and need a working reference for OAuth, tokens, and webhooks.

**Estimated implementation time:** 2–4 hours.

The **Node.js server** demonstrated here:
- Handles OAuth flows from a Webex Integration
- Creates webhooks for Webex Service App events
- Manages token exchanges and refreshes
- Processes authorization and token management requests

This is **sample code** for demonstration and learning. Production implementations should follow stricter security, access control, and operational practices.

![Service App Token Getter Architecture](diagrams/architecture-diagram.svg)

📹 **Watch this [Vidcast](https://app.vidcast.io/share/839a6f46-1774-4bc1-b342-8c0df74ecfb3) for a demo on getting started!**

## Table of Contents

- [Use Case Overview](#use-case-overview)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Code Scaffold](#code-scaffold)
- [Deployment Guide](#deployment-guide)
- [Known Limitations](#known-limitations)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)
- [Contributing](#contributing)
- [License](#license)

## Architecture

How the components connect: the developer uses a Webex Integration to authorize; the companion app (this server) performs OAuth, exchanges and refreshes tokens, and registers webhooks; the Webex Service App receives events via those webhooks.

![Service App Token Getter Architecture](diagrams/architecture-diagram.svg)

## Prerequisites

### Required Software
- **[Node.js](https://nodejs.org/)** (version 14.x or higher)
- **[npm](https://www.npmjs.com/get-npm)** (usually comes with Node.js)

### Webex Developer Account Requirements
- **[Webex Integration](https://developer.webex.com/docs/integrations)** with the following scopes:
  - `spark:all`
  - `spark:applications_token`
  - `application:webhooks_write`
  - `application:webhooks_read`
- **[Webex Service App](https://developer.webex.com/docs/service-apps)** properly configured for your organization

### Development Environment
- **[Webex Developer Sandbox](https://developer.webex.com/docs/developer-sandbox-guide)** (recommended for testing)
- **[ngrok](https://ngrok.com/)** or **[Pinggy](https://pinggy.io/)** for local development with HTTPS tunneling

## Code Scaffold

The **`/src/`** folder contains the Node.js application:

- **`server.js`** — Main entry point: HTTP server, OAuth redirect and token exchange, webhook creation and event handling for Service App authorized/deauthorized events.
- **`.env.example`** — Template for required environment variables (Integration and Service App credentials, `TOKEN_ENDPOINT`, `TARGET_URL`, `PORT`). Copy to `.env` and fill in values.
- **`package.json`** — Dependencies (axios, base64url, dotenv, nodemon) and scripts (`npm start`, `npm run dev`).

This is **sample code** for demonstration and learning; production use requires stricter security, token storage, audit logging, and error handling.

### Dependencies

| Package   | Purpose                          | Version  |
|----------|-----------------------------------|----------|
| `http`   | Node.js core module for HTTP server | Built-in |
| `axios`  | Promise-based HTTP client        | `^1.7.x` |
| `base64url` | Base64 encoding/decoding without padding | `^3.0.1` |
| `url`    | Node.js core module for URL parsing | Built-in |
| `dotenv` | Environment variable management  | `^16.x`  |

### Core Functions (in `server.js`)

- **`exchangeCodeForTokens(code)`** — Exchanges authorization code for access and refresh tokens.
- **`refreshTokens()`** — Refreshes the access token using the refresh token.
- **`generateApplicationId(clientId)`** — Generates application ID from Service App client ID.
- **`getOrgId(encodedvalue)`** — Decodes organization ID from the authorized event payload.
- **`createServiceAppAuthorizedWebhook()`** — Registers webhook for `serviceApp` `authorized` event.
- **`createServiceAppDeAuthorizedWebhook()`** — Registers webhook for `serviceApp` `deauthorized` event.

The server listens on `PORT` (default 3000) and handles **POST `/webhook`** (Webex events) and **GET `/redirect`** (OAuth callback).

## Deployment Guide

Follow these steps to run the integration end-to-end.

1. **Clone the repository and go to the playbook source**
   ```bash
   git clone https://github.com/webex/webexplaybooks.git
   cd webexplaybooks/playbooks/service-app-token-getter/src
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your credentials. Required variables:

   | Variable | Description |
   |----------|-------------|
   | `PORT` | Server port (e.g. `3000`) |
   | `INT_CLIENTID` | Integration Client ID from Webex Developer Portal |
   | `INT_CLIENTSECRET` | Integration Client Secret |
   | `SA_CLIENTID` | Service App Client ID |
   | `SA_CLIENTSECRET` | Service App Client Secret |
   | `TARGET_URL` | Webhook URL (must end with `/webhook`; use your tunnel URL when using ngrok/Pinggy) |

   Leave `INT_ACCESSTOKEN` and `INT_REFRESHTOKEN` empty; they are filled after the first OAuth flow.

4. **Start the server**
   ```bash
   npm start
   ```
   Or for development with auto-restart: `npm run dev`.

5. **Complete the OAuth authorization flow**
   - Open the integration registration page in your browser and copy the authorization URL from the form.
   - Open a new incognito tab, paste the URL, and sign in with the developer account that owns the integration.
   - After authorizing, you will be redirected to the app (e.g. `http://localhost:3000/redirect`); tokens will be stored.

6. **Expose the server for webhooks (local development)**  
   Webhooks require HTTPS. Use a tunnel, then set `TARGET_URL` in `.env` to your tunnel URL plus `/webhook`.
   - **ngrok:** `ngrok http 3000`
   - **Pinggy:** `ssh -p 443 -R0:localhost:3000 a.pinggy.io`

7. **Optional — Run with Docker**
   From the `src/` directory:
   ```bash
   docker build -t service-app-token-getter .
   docker run -p 3000:3000 --env-file .env service-app-token-getter
   ```
   Or with Docker Compose: add a service that builds the image, maps port 3000, and uses `env_file: .env`, then run `docker-compose up -d`.

## Known Limitations

- **Token expiry:** Webex access and refresh tokens expire. This sample demonstrates refresh; production systems should implement secure storage, rotation, and revocation.
- **Webhooks require HTTPS:** Local development needs a tunnel (e.g. ngrok or Pinggy). Production must use HTTPS and validate webhook payloads where the API supports it.
- **Sample code only:** This Playbook is an implementation guide, not production-ready. Do not claim it is suitable for production without additional hardening (authz, rate limiting, retries, audit logging).
- **Webhook lifecycle:** Removing or updating webhooks may require manual API calls (e.g. delete by webhook ID); see [Troubleshooting](#troubleshooting).
- **Webex and APIs:** Only publicly documented Webex APIs are used; internal or experimental endpoints are not in scope.

This Playbook is provided as a starting point. Test thoroughly before use in any production environment.

## API Endpoints

### Inbound (this app's endpoints)

#### POST `/webhook`
Handles webhook events from Webex, primarily focusing on Service App authorization events.

**Request Body:**
```json
{
  "id": "webhook-event-id",
  "name": "authorized",
  "data": {
    "applicationId": "service-app-id",
    "orgId": "organization-id"
  }
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Webhook processed successfully"
}
```

#### GET `/redirect`
Handles OAuth redirection and token exchange during the authorization flow.

**Query Parameters:**
- `code`: Authorization code from Webex
- `state`: State parameter for security

**Response:**
- Redirects to success page or returns error message

### Outbound (Webex APIs called by this app)

The app calls the following Webex APIs. All are documented at [developer.webex.com](https://developer.webex.com).

| Webex API | Method | Purpose |
|-----------|--------|---------|
| [Access Token](https://developer.webex.com/docs/api/v1/access-token) | `POST` `https://webexapis.com/v1/access_token` | Exchange authorization code for access and refresh tokens; refresh access token using refresh token. |
| [Create Webhook](https://developer.webex.com/docs/api/v1/webhooks/create-a-webhook) | `POST` `https://webexapis.com/v1/webhooks` | Register webhooks for `serviceApp` resource, events `authorized` and `deauthorized`. |
| [Get Service App Token](https://developer.webex.com/docs/api/v1/service-apps/get-a-token) | `POST` `https://webexapis.com/v1/applications/{applicationId}/token` | Obtain a token for the Service App when an `authorized` event is received (uses Integration Bearer token, Service App client ID/secret, and target org ID). |

**Typical flow:** After the user completes OAuth at `/redirect`, the app calls the Access Token API, then Create Webhook for the Service App authorized event. When Webex sends an `authorized` event to `/webhook`, the app calls Get Service App Token to obtain a token for that org.

## Troubleshooting

### Common Issues

#### 1. Webhook Creation Errors
**Problem**: Webhooks fail to create or receive events.

**Solution**:
- Ensure `TARGET_URL` includes the `/webhook` path
- Verify your tunnel (ngrok/Pinggy) is running and accessible
- Check that your Integration has the required scopes

#### 2. Token Exchange Failures
**Problem**: Authorization code exchange fails.

**Solution**:
- Verify Integration credentials in `.env` file
- Check that the authorization URL is properly formatted
- Ensure the redirect URI matches your Integration configuration

#### 3. Webhook Cleanup
**Problem**: Need to remove webhooks from the integration.

**Solution**:
1. Get the webhook ID from the console logs
2. Use the Webex API to delete the webhook:
   ```bash
   curl -X DELETE "https://webexapis.com/v1/webhooks/{webhookId}" \
        -H "Authorization: Bearer {access_token}"
   ```
3. Alternatively, use the [List Webhooks](https://developer.webex.com/docs/api/v1/webhooks/list-webhooks) endpoint to find webhook IDs

#### 4. Environment Variable Issues
**Problem**: Server fails to start due to missing environment variables.

**Solution**:
- Ensure all required variables are set in `.env` (in `src/`)
- Check for typos in variable names
- Verify `.env` file is in the `src/` directory when running from there

### Debug Mode

Enable debug logging by setting:
```env
DEBUG=true
```

### Logging

The application logs important events to the console:
- Token exchanges
- Webhook creations
- Authorization events
- Error messages

## Security Considerations

### Best Practices

1. **Environment Variables**: Never commit `.env` files to version control
2. **HTTPS**: Always use HTTPS for production webhooks
3. **Token Storage**: Store tokens securely and refresh them regularly
4. **Access Control**: Limit access to your Integration and Service App credentials
5. **Webhook Validation**: Validate webhook signatures when available

### Production Deployment

For production deployments:
1. Use a proper reverse proxy (nginx, Apache)
2. Implement proper logging and monitoring
3. Set up automated token refresh
4. Use environment-specific configurations
5. Implement proper error handling and retry logic

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes and test thoroughly**
4. **Commit your changes**:
   ```bash
   git commit -m "Add your feature description"
   ```
5. **Push to your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```
6. **Create a Pull Request**

### Development Guidelines

- Follow existing code style and conventions
- Add comments for complex logic
- Update documentation for new features
- Test your changes thoroughly
- Ensure all dependencies are properly declared

## License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for more details.

---

## Additional Resources

- [Webex Developer Documentation](https://developer.webex.com/)
- [Webex Integration Guide](https://developer.webex.com/docs/integrations)
- [Webex Service Apps Guide](https://developer.webex.com/docs/service-apps)
- [Webex Webhooks Documentation](https://developer.webex.com/docs/api/v1/webhooks)
- [OAuth 2.0 Specification](https://tools.ietf.org/html/rfc6749)

## Support

For issues and questions:
- Check the [Troubleshooting](#troubleshooting) section
- Review the [Webex Developer Support](https://developer.webex.com/support)
- Open an issue in this repository

---

**Happy Coding!** 🚀
