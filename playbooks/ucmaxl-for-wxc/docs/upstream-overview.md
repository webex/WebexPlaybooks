# Upstream Library Overview — ucmaxl

Source repository: [github.com/jeokrohn/ucmaxl](https://github.com/jeokrohn/ucmaxl)

This document captures the key information from the upstream `ucmaxl` library that is relevant to this Playbook. The library itself does not include a README beyond a brief install note; this document provides the context needed to use it effectively.

---

## What ucmaxl Is

`ucmaxl` is a Python helper library that wraps Cisco UCM's **Administrative XML (AXL) SOAP API** using the [`zeep`](https://docs.python-zeep.org/) SOAP client. It provides:

- **`AXLHelper`** — the main class that manages the SOAP session, auto-detects the UCM version, and exposes convenience methods for common UCM object types.
- **Bundled WSDLs** — AXL WSDL files for UCM versions 9.0, 9.1, 10.0, 10.5, 11.0, 12.0, 12.5, 14.0, and 15.0 are included in the package. For other versions, the library downloads the WSDL from the UCM cluster automatically.
- **`sql_query()`** — executes an Informix SQL statement via the `executeSQLQuery` AXL method and returns results as a list of dicts, with automatic batch pagination for large result sets.
- **`do_device_reset()`** — resets or restarts a UCM device.
- Named wrappers for UCM objects: users, CSS, route partitions, route patterns, route lists, SIP profiles, trunks, process nodes, and more (see `src/ucmaxl/__init__.py`).

---

## Installation

The library has no versioned release on PyPI. Install from the pinned GitHub commit used in this Playbook:

```bash
pip install -e git+https://github.com/jeokrohn/ucmaxl@41fd647731fc8176f1c59a081598b627607814cc#egg=ucmaxl
```

Or use `requirements.txt` in `src/`:

```bash
pip install -r src/requirements.txt
```

---

## Basic Usage

```python
from ucmaxl import AXLHelper

axl = AXLHelper(
    ucm_host="ucm-publisher.example.com",  # or IP; port 8443 is appended automatically
    auth=("axl_user", "axl_password"),     # HTTP Basic auth
    version="14.0",                         # optional; auto-detected if omitted
    verify=False,                           # set True in production
)

# List all users matching a search criterion
users = axl.list_user(userid="%")

# Run a raw Informix SQL query against the UCM database
rows = axl.sql_query("SELECT name, description FROM device WHERE tkclass = 1")

# Access any AXL SOAP method not wrapped by a helper (via __getattr__ proxy)
result = axl.service.listPhone(
    searchCriteria={"name": "%"},
    returnedTags={"name": "", "description": ""},
)

# Close the SOAP session
axl.close()
```

### Using as a Context Manager

```python
with AXLHelper("ucm.example.com", auth=("user", "pass")) as axl:
    phones = axl.sql_query("SELECT name FROM device WHERE tkclass = 1")
```

---

## AXL SOAP Proxy (`__getattr__`)

Any attribute access on `AXLHelper` that is not a defined method is proxied to the underlying `zeep` service object. This means you can call any AXL SOAP operation directly:

```python
axl.listPhone(...)        # → axl.service.listPhone(...)
axl.getUser(...)          # → axl.service.getUser(...)
axl.addLine(...)          # → axl.service.addLine(...)
```

Refer to the [Cisco AXL API Reference](https://developer.cisco.com/docs/axl/) for the full list of supported operations and their parameters.

---

## Supported UCM Versions

The bundled WSDL files cover: **9.0, 9.1, 10.0, 10.5, 11.0, 12.0, 12.5, 14.0, 15.0**

For any other version, `AXLHelper` downloads the WSDL directly from the UCM cluster at `https://<ucm_host>/plugins/axlsqltoolkit.zip`. This requires the machine running the script to have HTTPS access to the UCM publisher.

---

## sql_query() Batch Pagination

For large result sets, UCM returns a SOAP fault: `"Query request too large. Total rows matched: <N>. Suggested row fetch: less than <M>"`.

`AXLHelper.sql_query()` detects this fault and automatically re-issues the query in batches using Informix `SKIP <offset> FIRST <batch_size>` syntax. The results are concatenated and returned as a single flat list. No special handling is required in calling code.

---

## Security Considerations

- **TLS verification** — Set `verify=True` (or pass a CA bundle path) in production. The default `verify=False` disables TLS certificate validation, exposing the connection to man-in-the-middle attacks.
- **Credentials** — Never hardcode credentials. Use environment variables or a secrets manager (see `env.template`).
- **SQL injection** — `sql_query()` accepts raw SQL strings. Validate or parameterize any user-supplied values before incorporating them into queries.
- **Pinned commit** — The library is installed from a pinned commit SHA, not a versioned PyPI release. Audit the source before use in production environments.

---

## License

The `ucmaxl` repository does not include a LICENSE file. This Playbook is distributed under the Webex Playbooks repository [`LICENSE`](../../../LICENSE).
