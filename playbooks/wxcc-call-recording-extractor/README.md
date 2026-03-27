# Webex Contact Center Call Recording Extractor Playbook

This Playbook is adapted from the [call-recording-extractor-sample](https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/call-recording-samples/call-recording-extractor-sample) in the Webex Contact Center API samples repository on GitHub.

## Use Case Overview

This sample shows how to **export Webex Contact Center (WxCC) call recordings** using the documented **Capture API**. You run a Spring Boot web application locally, complete OAuth with your WxCC integration, pick a date range in the UI, and persist recordings to **localhost**, **Amazon S3**, or **Google Cloud Storage**.

**Target persona:** WxCC developers or administrators who want a working Java reference for Capture API authentication, listing captures, and saving audio outside Control Hub.

**Estimated implementation time:** 2–4 hours (register integration, configure environment variables, run Maven, first successful export).

## Architecture

The operator uses a browser against the Spring Boot app on `localhost`. The app performs **OAuth 2.0** (authorization code) against **Webex** (`webexapis.com`), then calls your tenant’s **WxCC API base URL** (for example `https://api.wxcc-us1.cisco.com`) for organization context and **Capture API** operations. Recording files are downloaded from returned URLs and written through a storage abstraction (local directory, S3, or GCS).

See the [architecture diagram](diagrams/architecture-diagram.md) for a sequence view of OAuth, Capture API calls, and storage.

## Prerequisites

- **Webex Contact Center** tenant and appropriate access to recordings; a [Contact Center developer sandbox](https://developer.webex.com/create/docs/sandbox_cc) is suitable for testing.
- **Integration** registered at [Webex Contact Center My Apps](https://developer.webex.com/create/docs/integrations) with redirect URI matching your run (for example `http://localhost:8080`) and scope **`cjp:config_read`** (as in the upstream sample).
- **Data center URL** matching your org (examples: `https://api.wxcc-us1.cisco.com`, `https://api.wxcc-eu1.cisco.com`; see [Captures documentation](https://developer.webex.com/webex-contact-center/docs/api/v1/captures)).
- **Java 11+** and **Maven 3.6+** on your machine.
- **Optional:** AWS or GCP credentials and buckets if you set `WXCC_STORAGE_TARGET` to `fileSystemAWSS3` or `fileSystemGCPCloudStorage` (see `src/env.template`).

## Code Scaffold

The runnable code lives under **`src/`** (Maven project root):

- **`pom.xml`** — Spring Boot 2.5.x, web starter, AWS S3 and Google Cloud Storage clients.
- **`src/main/java/com/webexcc/api/`** — Application entry point, REST controller, WxCC auth and API services, storage implementations.
- **`src/main/resources/application.properties`** and **`application.yml`** — OAuth, API base, and storage settings; values are supplied via **environment variables** (see `src/env.template`).
- **`src/README.md`** — Upstream-oriented run notes, including Maven usage (always run a phase such as `mvn clean package`, not bare `mvn`).

This is **sample code**, not a production integration: simplify token handling, minimal validation, and no multi-tenant hardening. Add logging, secret management, and access control before any production deployment.

## Deployment Guide

1. **Clone** this repository and open `playbooks/wxcc-call-recording-extractor/`.
2. **Register** a Webex Contact Center integration at [My Apps](https://developer.webex.com/create/docs/integrations); copy **Client ID** and **Client Secret**; set **Redirect URI** to `http://localhost:8080` (or your chosen origin, consistent everywhere).
3. **Configure environment:** From `playbooks/wxcc-call-recording-extractor/src`, copy `env.template` to `.env` (or export the same variables). Set at minimum `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI`, and `DATA_CENTER_URL` for your WxCC cluster.
4. **Choose storage:** Set `WXCC_STORAGE_TARGET` to `localhost`, `fileSystemAWSS3`, or `fileSystemGCPCloudStorage`. For GCP, set `GOOGLE_APPLICATION_CREDENTIALS` to a service account JSON path.
5. **Load env vars** into your shell (example: `set -a && source .env && set +a` in bash) from the `src/` directory.
6. **Build:** `cd playbooks/wxcc-call-recording-extractor/src` and run `mvn clean package -DskipTests` (or `mvn clean install -DskipTests`). Do not run plain `mvn` with no goals.
7. **Run:** `java -jar target/capture-0.0.1-SNAPSHOT.jar`.
8. **Open** `http://localhost:8080`, sign in when prompted, and use the UI to export recordings for a selected date range.
9. **Before you open a PR**, run repo validation from the WebexPlaybooks root: `./scripts/validate-playbook-local.sh playbooks/wxcc-call-recording-extractor` and fix any reported issues.
10. **Sanity-check the app:** Confirm `mvn clean package -DskipTests` completes with no errors; start the JAR; complete OAuth once; pick a date that has test traffic; verify new `.wav` (or other) files appear under `LOCALHOST_DATA_DIRECTORY` when `WXCC_STORAGE_TARGET=localhost`.
11. **Secret hygiene:** Ensure your `.env` is gitignored (only `env.template` is committed) and run `git diff` to confirm no client secrets, AWS keys, or GCP material appear in the change set.

For more detail, see `src/README.md` and the [Capture API](https://developer.webex.com/webex-contact-center/docs/api/v1/captures) reference.

## Known Limitations

- **Agent activities time window:** The WxCC [Get Agent Activities](https://developer.webex.com/webex-contact-center/docs/api/v1/agents) API rejects `from`/`to` values more than about **12 months** in the past, and rejects **`to` in the future** (for example choosing “today” in a timezone ahead of UTC, or a future calendar date). Pick a **start date in the past** within the last year, and keep the **days** parameter modest—the sample walks **two calendar days backward per iteration**, so a large value pulls in very old windows and yields empty or skipped slices.
- **Not production-ready:** Treat as a learning scaffold; add security, monitoring, and operational controls for real workloads.
- **Rate limits:** Subject to Webex and WxCC API limits; the sample does not implement backoff or advanced batching.
- **Tokens:** Refresh and session edge cases are simplified; you may need to re-authenticate when tokens expire.
- **Startup noise:** S3/GCP beans may log warnings at startup if credentials are unset while using `localhost` storage only.
- **License:** This Playbook is covered by the Webex Playbooks repository [LICENSE](../../LICENSE). The upstream sample may use a different license; see the [source repo](https://github.com/WebexSamples/webex-contact-center-api-samples).
- **Disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
