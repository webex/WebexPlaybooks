# Upstream sample notes

Material from the [graphql-wallboard-sample](https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/reporting-samples/graphql-wallboard-sample) README, kept here so we do not add a second `README.md` under `src/`.

## Video

The upstream repository links to an overview and demo of the GraphQL wallboard sample. See the README in the tree above for the embedded video link.

## Live demo

A hosted instance may be available (free tier; cold starts can delay the first load). Check the upstream README for the current demo URL.

## GraphQL query time windows

The wallboard controllers use fixed `from` epoch values inside the GraphQL query strings (for example `1673729535000`). Those ranges become stale over time. Update the `from` values in `src/controller/wallboard/*.js` to match your reporting window (for example `Date.now() - N days` in milliseconds), consistent with the [Search API](https://developer.webex.com/webex-contact-center/docs/api/v1/search) documentation.

## Related samples

The [graphql-sample](https://github.com/WebexSamples/webex-contact-center-api-samples/tree/main/graphql-sample) folder in the same monorepo includes `wallboard-query-samples` with additional query ideas.
