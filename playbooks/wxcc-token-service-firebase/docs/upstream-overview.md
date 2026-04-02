# Upstream token-service-sample notes

Material adapted from the upstream sample readme so the playbook keeps a single root
[README.md](../README.md). Canonical sample:
[token-service-sample](https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/token-management-samples/token-service-sample).

## Setup video

[Watch: Token Service setup video](https://app.vidcast.io/share/ed971770-49bb-47e5-96d0-7c920074fd53)

## Related samples

- [token-app-sample](https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/token-management-samples/token-app-sample) — self-hosted Node pattern (see also the Playbook [wxcc-token-management-sample](../../wxcc-token-management-sample/README.md)).
- [app-auth-sample](https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/authentication-samples/app-auth-sample) — OAuth with WxCC API.

## Token lifetime (from upstream)

- Access tokens: up to about 12 hours.
- Refresh tokens: up to about 60 days.
- The function returns a valid access token while the refresh token is still valid; after refresh expiry, repeat the browser OAuth step with the same token name in `state`.

## HTTP API shapes

Success:

```json
{
  "status": "200",
  "token": "example-token-here"
}
```

Error:

```json
{
  "status": "500",
  "message": "error-message-here"
}
```

## `/init` warning

The `/init` route creates or merges a `tokens` document for the `name` query parameter.
Use it only during setup. Calling it in production after tokens are populated can
overwrite or disrupt configuration—follow the upstream guidance.

## Useful links

- [Webex Contact Center for Developers](https://developer.webex.com/docs/webex-contact-center)

## Upstream disclaimer

The upstream repository states that samples are for demos and learning, not
production-grade solutions, and that security, multi-org design, and operations
should be planned explicitly.

## Support

- [Webex Contact Center APIs Developer Community](https://developer.webex.com/docs/webex-contact-center)
- [How to Ask a Question or Initiate a Discussion](https://community.cisco.com/t5/contact-center/webex-contact-center-apis-developer-community-and-support/m-p/4558270)

## Version history (upstream)

- 1.0.0 — Initial project commit
