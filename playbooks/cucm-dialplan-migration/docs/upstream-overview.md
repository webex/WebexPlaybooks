# Upstream Source Overview

This document preserves the original workflow notes from the upstream
[jeokrohn/cisco_dialplan](https://github.com/jeokrohn/cisco_dialplan) repository
(README.rst). Refer to the Playbook [README.md](../README.md) for the full deployment guide.

---

## Original Script Descriptions

- **read_ucm.py** — reads learned patterns from UCM via thin AXL and writes to CSV for further processing
- **normalize.py** — reads exported patterns from UCM (`ILS_Learned_Patterns_ForScript.csv`) and normalizes them for use in Webex Calling
- **normalized.csv** — normalized patterns to be imported into Webex Calling
- **.env (sample)** — sample .env file to define integration parameters to obtain tokens via OAuth flow
- **configure_wxc.py** — configures dial plans in Webex Calling based on `normalized.csv` and config in `config.yml`
- **delete_dialplans.py** — deletes dial plans which are referenced in `config.yml`

---

## Original Workflow

### Step 1: Read patterns from UCM

```bash
./read_ucm.py
```

Patterns are written to `read_ucm.csv`.

### Step 2: Normalize patterns for use in Webex Calling

```bash
./normalize.py read_ucm.csv > normalized.csv
```

Reads patterns from `read_ucm.csv`, normalizes them, and writes output to `normalized.csv`.

### Step 3: Provision dial plans and patterns in Webex Calling

```bash
./configure_wxc.py normalized.csv
```

Reads normalized patterns from `normalized.csv` and config from `config.yml`, then provisions
dial plans and patterns in Webex Calling accordingly.

---

## Notes on Pattern Normalization

The normalizer handles bracket notation commonly found in ILS-learned patterns. For example,
`+1[2-9]XXXXXXX` is expanded into individual patterns `+12XXXXXXX`, `+13XXXXXXX`, etc.

When the same normalized pattern would result from two different source patterns in different
catalogs, the conflict resolution algorithm:

1. Sorts conflicting origin patterns from most-specific (fewest normalized results) to least-specific.
2. Removes the more-specific normalized set from less-specific origins to avoid duplicates.

Conflict resolution messages are printed to stderr during normalization.

---

## config.yml Structure

The `tokens` field is populated automatically after the first OAuth flow. The `dialplans` list
maps UCM remote catalog `routestring` identifiers (used as `catalog` values) to Webex Calling
dial plans, each pointing to a trunk or route group by name.

```yaml
tokens:              # populated automatically; leave empty initially
dialplans:
  - catalogs:
      - '<ucm-routestring-1>'
      - '<ucm-routestring-2>'
    name: dial plan 1
    route_choice: MyTrunkName
    route_type: TRUNK
  - catalogs:
      - '<ucm-routestring-3>'
    name: dial plan 2
    route_choice: MyRouteGroupName
    route_type: ROUTE_GROUP
```

Valid `route_type` values: `TRUNK`, `ROUTE_GROUP`.
