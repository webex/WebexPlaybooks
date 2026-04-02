# UCM Config Analyzer for Webex Calling Migration

This Playbook is adapted from the [ucmmigration](https://github.com/jeokrohn/ucmmigration) sample on GitHub.

## Use Case Overview

Organizations preparing to migrate from Cisco Unified Communications Manager (UCM) to **Webex Calling** often face a discovery problem: they do not have a clear picture of what is in their UCM deployment before migration planning begins. Users share lines, phones are shared across workers, hunt groups cross team boundaries, and dial plans carry years of accumulated complexity — all of which affect how users must be grouped and sequenced during migration.

This Playbook packages the **UCM Config Analyzer**, a Python tool that reads a standard UCM **Bulk Administration Tool (BAT) export** TAR file and produces interactive visualizations and analysis reports. A calling administrator or migration engineer can run it against their own export data in under an hour to answer:

- Which users are tightly coupled (shared lines, shared phones, BLF pickup, hunt groups) and must migrate together?
- Which phone models are supported by Webex Calling, and how many need replacement?
- What does the dial plan look like (translation patterns, route patterns, CSS combinations)?
- Where are the location clusters in the network?

**Target persona:** Calling administrator or UC migration engineer preparing a Cisco UCM-to-Webex Calling migration.

**Estimated implementation time:** 2–4 hours (tool setup and initial analysis run; deeper dial-plan interpretation may take additional time).

## Architecture

The UCM Config Analyzer operates entirely **offline** — it does not connect to a live UCM server or to any Webex API. The workflow is:

1. An administrator exports the UCM configuration using the **Bulk Administration Tool (BAT)** within CUCM, producing a `.tar` archive.
2. The archive is placed in the project directory on the analyst's workstation.
3. The Python tool parses the CSV files inside the archive through the `ucmexport` library.
4. The `App` module runs an interactive CLI menu of analysis functions.
5. Results are displayed as console output and **Plotly** interactive browser charts.
6. The analyst uses the output to build a Webex Calling migration plan.

See the Mermaid diagram in [/diagrams/architecture-diagram.md](diagrams/architecture-diagram.md) for a visual overview.

The `ucmexport` library supports the following UCM object types: phones, end users, directory numbers, CSS, device pools, hunt pilots, hunt lists, line groups, call park, call pickup groups, route patterns, translation patterns, device profiles, locations, and remote destinations.

## Prerequisites

**Cisco UCM requirements:**
- Access to a Cisco UCM deployment with **Bulk Administration Tool (BAT)** access (typically requires CCM Admin or BAT Admin role).
- Ability to perform a full UCM configuration export — this generates a `.tar` file containing multiple CSV files (phones, end users, directory numbers, etc.).
- UCM 10.x or later is recommended; the tool was built against UCM CSV export formats current as of UCM 12.x.

**Webex requirements:**
- No Webex account is required to run the analysis. Webex Calling is the migration *target* — you will use the output of this tool to plan your Webex Calling onboarding.
- To act on the analysis output, you will need a Webex Calling organization with the appropriate licenses (Webex Calling — Professional or similar) and access to Control Hub.

**Developer environment:**
- Python 3.8 or later (tested smoke import on **Python 3.13**)
- `pip` package manager
- The playbook’s `requirements.txt` bumps **numpy** and **scipy** slightly above the upstream pins so **Python 3.13** can use prebuilt wheels (upstream `numpy==2.0.2` may try to compile from source and fail on 3.13).
- A virtual environment tool (`venv`, `virtualenv`, or `virtualenvwrapper`) — strongly recommended to isolate dependencies
- A modern browser (for Plotly interactive visualizations)
- Approximately 500 MB of disk space for Python packages (numpy, scipy, matplotlib, plotly)

**Network/firewall:**
- No inbound connectivity required — the tool is fully local.
- Plotly renders charts in the local browser; no data is sent to Plotly's servers in the default offline-rendering mode.

## Code Scaffold

The source code under `/src/` is vendored directly from the upstream repository and demonstrates how to parse UCM bulk export archives and drive analysis visualizations.

**Entry points:**

| File | Purpose |
|------|---------|
| `src/main.py` | Primary entry point. Discovers all `*.tar` files in the current directory, loads them via `App`, and starts the interactive menu. |
| `src/simple.py` | Minimal one-file demo: loads `sample.tar`, counts phones, and prints phones with multiple lines. Good starting point for scripting custom queries. |

**Core library — `src/ucmexport/`:**

- `proxy/__init__.py` — `Proxy` class: the main facade. Instantiate with a TAR filename; exposes typed container attributes (`phones`, `end_user`, `hunt_pilot`, `translation_pattern`, etc.).
- `objects/` — One file per UCM object type (`phone.py`, `enduser.py`, `directorynumber.py`, etc.), each defining a container and a typed model class.

**Analysis modules:**

- `src/app/__init__.py` — `App` class with an interactive text menu (~840 lines). Key analyses: user dependency graph construction, supported vs. unsupported device breakdown, phone/user consistency, DN/dial-plan Sankey, CSS combinations, translation pattern treemap, abbreviated dialing, hunt group dump.
- `src/digit_analysis/` — Digit tree analysis: builds and traverses dial-plan node trees (`DaNode`) to evaluate routing logic.
- `src/user_dependency_graph/` — `UserGraph` class: constructs a NetworkX graph of user coupling via shared phones, shared lines, hunt pilots, BLF subscriptions, and call pickup groups. Used to identify migration clusters.

**Utility scripts:**

| File | Purpose |
|------|---------|
| `src/transform_tar.py` | CLI tool to strip noisy/sensitive columns from `phone.csv` and `enduser.csv` inside a TAR and write a cleaned `*_transformed.tar`. Useful for reducing export size before analysis. |
| `src/type_user_association.py` | Reads `enduser.csv` from TAR files and prints all distinct `TYPE USER ASSOCIATION` values across one or more exports. |
| `src/reduce_tar.py` | Reduces a TAR archive to a smaller subset; useful for testing with large production exports. |

**What the code does NOT do:**
- It does not connect to a live UCM server or call the UCM AXL API.
- It does not call any Webex API — migration execution is out of scope.
- It is not production-hardened; it is an analysis sandbox intended for use on analyst workstations.
- Secrets and credentials are not required for the analysis phase, but `src/env.template` documents the `TAR_FILE` variable used by `type_user_association.py`.

For upstream context and additional notes, see [docs/upstream-overview.md](docs/upstream-overview.md).

## Deployment Guide

### Part A — Export your UCM configuration

1. Log in to your Cisco UCM Administration interface.
2. Navigate to **Bulk Administration → Export Configuration**.
3. Select all object types you want to analyze (recommended: phones, end users, directory numbers, hunt pilots, hunt lists, line groups, CSS, route patterns, translation patterns, device pools, locations).
4. Click **Export** and wait for the job to complete under **Bulk Administration → Job Scheduler**.
5. Download the resulting `.tar` file to your analyst workstation.

<!-- TODO: verify exact UCM menu paths against your UCM version (10.x vs 11.x vs 12.x menus differ slightly) -->

### Part B — Set up the Python environment

6. Install Python 3.8 or later from [python.org](https://www.python.org/downloads/) if not already present. Confirm with:
   ```bash
   python3 --version
   ```
7. Clone or download this playbook's `src/` directory to a working folder on your workstation:
   ```bash
   git clone https://github.com/webex/WebexPlaybooks.git
   cd WebexPlaybooks/playbooks/ucm-config-analyzer/src
   ```
8. Create and activate a Python virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate      # macOS/Linux
   .venv\Scripts\activate.bat     # Windows
   ```
9. Install all required packages:
   ```bash
   pip install -r requirements.txt
   ```
10. Optional — verify the environment (no UCM `.tar` needed):
    ```bash
    python -c "from ucmexport import Proxy; from app import App; from user_dependency_graph import UserGraph; import digit_analysis; print('All core imports OK')"
    ```

### Part C — Run the analysis

11. Copy the UCM export `.tar` file(s) into the `src/` directory (the same directory as `main.py`). The tool automatically discovers all `*.tar` files in the current working directory.
12. Run the main analysis tool:
    ```bash
    python main.py
    ```
13. The tool will log startup information and then display an interactive text menu. Use the numbered options to:
    - Select which TAR file to analyze (if multiple are present)
    - Toggle user dependency relation types (hunt pilots, shared phones, shared lines, BLF, call pickup groups)
    - Run individual analyses (user clusters, device type breakdown, dial plan Sankey, translation pattern treemap, etc.)
14. For each visualization option, a Plotly chart will open in your default browser. Close the browser tab to return to the menu.

### Part D — Quick scripted query (optional)

15. To run a minimal custom query without the interactive menu, edit `simple.py` and replace `'sample.tar'` with your TAR filename, then run:
    ```bash
    python simple.py
    ```
    This demonstrates how to use the `Proxy` class directly for scripted analysis.

### Part E — Clean and slim the TAR before analysis (optional)

16. If the export is very large or contains sensitive fields you want to strip before sharing, use `transform_tar.py`:
    ```bash
    python transform_tar.py <your_export.tar>
    ```
    This writes a `<your_export>_transformed.tar` with noisy columns removed from `phone.csv` and `enduser.csv`.

## Known Limitations

- **Offline analysis only:** The tool reads static UCM export TAR files. It does not connect to a live UCM server, does not use the AXL API, and does not call any Webex API. Migration execution requires separate tooling (see the [UCM to Webex Calling Migration playbook](../ucm-to-wxc-migration/README.md) for migration execution).
- **Export format dependency:** The parser is tuned to UCM BAT export CSV formats from UCM 10.x–12.x. Column name changes in newer UCM releases may require updates to the object models in `ucmexport/objects/`.
- **Python 3.8 baseline:** The upstream code targets Python 3.8. It runs on 3.9+ in practice (including **3.13** with the playbook’s `numpy`/`scipy` pins), but type annotations use older union syntax (`Optional[X]`) and some walrus operator patterns. Test against your Python version before use.
- **No authentication or credential handling:** This tool requires no credentials to run. The `TAR_FILE` environment variable in `env.template` is only used by the `type_user_association.py` utility script.
- **Large exports:** Very large UCM deployments (tens of thousands of phones) may take several minutes to parse and may require significant RAM for NetworkX graph operations. The `reduce_tar.py` and `transform_tar.py` utilities can help reduce export size for initial testing.
- **Plotly display:** Visualizations open in the system default browser. In headless or server environments, `fig.show()` may fail; redirect to `fig.write_html()` for file output.
- **No license file in upstream repo:** The upstream code at [jeokrohn/ucmmigration](https://github.com/jeokrohn/ucmmigration) is provided "as is" with no explicit open-source license. Review the upstream repository before any commercial or redistributed use.
- **Standard Webex disclaimer:** This Playbook is provided as a starting point. Webex does not guarantee the functional accuracy of the source code. Test thoroughly before use in a production environment.
