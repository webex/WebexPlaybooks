# Webex Contact Center — Java OAuth token sample

This Playbook is adapted from the [token-java-sample](https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/token-management-samples/token-java-sample) in the WebexSamples `webex-contact-center-api-samples` repository on GitHub.

## Use Case Overview

Developers building Webex Contact Center integrations need a working OAuth2 authorization code flow before they can call WxCC REST or GraphQL APIs. This Playbook packages a small Spring Boot application that logs a user in through Webex, exchanges the code for an access token (including the `self_contained_token` parameter required for WxCC-style tokens), and exposes the token and user claims in JSON for inspection. **That access token is what you use as a WxCC-facing credential:** paste it into API clients, middleware, or **Flow Builder** activities that call outbound HTTP with a `Bearer` header, so you can exercise real contact-center flows and configuration APIs—not only generic Webex OAuth. The target persona is a **developer** or **integration engineer** familiar with Java. Expect roughly **2–4 hours** to register an integration, configure redirect URIs, run the app locally, and validate a successful login.

## Architecture

The browser talks only to the Spring Boot app on localhost. The app redirects the user to Webex for authorization, receives the authorization code on the registered redirect URI, exchanges it for tokens at Webex token endpoint, and stores the session server-side. A functional route returns user profile fields and a `Bearer` access token for copying into API tools. Authentication never embeds secrets in the browser; client credentials are supplied through environment variables at process start.

See the sequence diagram in [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md) for the full flow.

## Using the token with Webex Contact Center

- **WxCC REST and GraphQL:** Use the Bearer token from `/userinfo` as `Authorization: Bearer <token>` when calling documented WxCC APIs, subject to the scopes granted on your integration and entitlements in your org.
- **Flow Builder and automations:** In **Webex Contact Center Flow Builder**, any activity that lets you set HTTP headers (for example outbound **HTTP Request**-style steps or custom integration points) can use the same Bearer value while you prototype how a flow calls external services or WxCC endpoints. Replace hand-copied tokens in production with a proper token service and rotation.
- **Why “contact center” on App Hub:** The sample is sourced from the WxCC API samples repo, requests **`cjp:*`** scopes used for contact-center configuration and user context, and exchanges tokens the way WxCC integrations expect—so it is catalogued under **contact center** rather than as a generic Teams-only OAuth demo.

## Prerequisites

- **Webex:** A Webex account with access to create integrations at [Webex for Developers — My Apps](https://developer.webex.com/my-apps). Scopes used by the sample align with WxCC admin-style access (`cjp:user`, `spark:people_read`, `cjp:config*`). Adjust scopes in configuration only if your integration’s allowed scopes differ.
- **Redirect URI:** Register exactly the redirect URI you will use (default `http://localhost:8080/login/oauth2/code/webexcc`) on the integration. If you change host, port, or path, set `WXCC_OAUTH_REDIRECT_URI` and update the integration to match.
- **Runtime:** **Java 17** and a network path to Maven Central (Gradle downloads dependencies on first run).
- **Repository:** This playbook’s code lives under `src/` relative to this folder (Gradle project root).

Additional upstream notes (video link, support links, license) are in [docs/upstream-overview.md](docs/upstream-overview.md).

## Code Scaffold

The Gradle project under [src/](src/) (playbook code folder) follows the usual Gradle layout: Java and resources live under **`src/main/`** inside that directory (i.e. `playbooks/<slug>/src/src/main/java` and `.../src/main/resources` from the repo root).

- `src/main/java/.../WebexccApplication.java` — Spring Boot entrypoint.
- `src/main/java/.../OAuth2SecurityConfig.java` — OAuth2 login, logout, and custom token request that adds `self_contained_token=true`.
- `src/main/java/.../RequestRouter.java` — `GET /userinfo` returning `UserInfo` JSON including the access token.
- `src/main/resources/application.yaml` — OAuth client and provider endpoints; **client ID and secret are read from environment variables** (see [src/env.template](src/env.template)).
- Static UI under `src/main/resources/static/` for post-login pages.

The sample does **not** implement refresh tokens, encrypted token storage, multi-tenant routing, or production security headers. Treat it as instructional code only.

## Deployment Guide

1. **Create a Webex integration** at [Webex for Developers — My Apps](https://developer.webex.com/my-apps):

   - Choose **Create a New App** → **Create an Integration** (OAuth 2.0 authorization code flow).
   - Give the app a name and description; the **Redirect URI** must include exactly the callback you will use locally. Default for this sample: `http://localhost:8080/login/oauth2/code/webexcc`. If you use another host, port, or path, register that URI instead and set **`WXCC_OAUTH_REDIRECT_URI`** to the same value when you run the app.
   - Under **Scopes**, select the OAuth scopes the sample will request. The defaults in [src/src/main/resources/application.yaml](src/src/main/resources/application.yaml) match the upstream WxCC token sample. Enable these on the integration (or a superset of them):

     | Scope | Role in this sample |
     | ----- | ------------------- |
     | `cjp:user` | WxCC user / session context for Contact Center APIs. |
     | `spark:people_read` | Lets Webex return the signed-in user for `GET https://webexapis.com/v1/people/me` during the OAuth user-info step. |
     | `cjp:config` | Base WxCC configuration access (grouped scope in the developer portal). |
     | `cjp:config_read` | Read WxCC configuration. |
     | `cjp:config_write` | Write WxCC configuration (included for parity with typical admin-style samples). |

     The app sends them as a single comma-separated list (no spaces), same as **`WXCC_OAUTH_SCOPE`** in [src/env.template](src/env.template). If your integration exposes fewer scopes, remove the extras from the integration **and** set `WXCC_OAUTH_SCOPE` to a comma-separated subset that is allowed for your app; otherwise authorization will fail with a scope mismatch.

   - Save the integration and copy the **Client ID** and **Client Secret** (secret is shown once—store it securely).

2. Open a terminal and change to the Gradle project directory: `cd playbooks/wxcc-token-java-sample/src` (adjust the prefix if your clone path differs).

3. Copy [src/env.template](src/env.template) into your shell or IDE run configuration. Set **`WXCC_OAUTH_CLIENT_ID`** and **`WXCC_OAUTH_CLIENT_SECRET`** from the integration. Leave other variables unset to use documented defaults unless you changed redirect URI or scopes above.

4. Confirm the integration’s redirect URI matches `WXCC_OAUTH_REDIRECT_URI` (default `http://localhost:8080/login/oauth2/code/webexcc`).

5. Run `./gradlew bootRun` (Windows: `gradlew.bat bootRun`). Wait until the app reports that it is listening (default port **8080**, overridable with `SERVER_PORT`).

6. Open `http://localhost:8080` in a browser, complete the Webex login, and confirm you reach the static success page.

7. Open `http://localhost:8080/userinfo` to view JSON with user attributes and a `Bearer` access token suitable for testing WxCC APIs.

## Known Limitations

- **Sample only:** Upstream disclaimer applies — not a production security or token-lifecycle design. See [docs/upstream-overview.md](docs/upstream-overview.md) for the original support and video links.
- **Session and tokens:** Access tokens are tied to the servlet session; restarting the app or clearing cookies requires re-authentication. No automatic refresh.
- **Scopes and org:** You must use an integration and user that are entitled to the configured scopes in your org.
- **License:** This Playbook is covered by the Webex Playbooks repository [LICENSE](../../LICENSE). Upstream Java sources are under the Cisco sample license described in [docs/upstream-overview.md](docs/upstream-overview.md).

This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
