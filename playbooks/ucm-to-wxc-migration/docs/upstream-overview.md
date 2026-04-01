# Upstream Source Repository Notes

This document preserves the original setup and usage notes from the upstream repository:
[jeokrohn/migrationapi](https://github.com/jeokrohn/migrationapi) on GitHub.

These notes are supplementary to the [Playbook README](../README.md). The README's
Deployment Guide supersedes the instructions below — refer to it for the authoritative
step-by-step setup process.

---

## Original README

> **Python Code to support UCM to Webex Calling migrations**
>
> Based on Python 3.10
>
> To use the sample code:
>
> - Install Python from [python.org](https://www.python.org)
> - Create a virtual environment for Python to keep the module dependencies isolated.
>   The most comfortable way to work with Python virtual environments is to use
>   [virtualenvwrapper](https://virtualenvwrapper.readthedocs.io/en/latest/).
>   A fallback is to follow these steps: https://docs.python.org/3/tutorial/venv.html
> - Download all files of this repository to a project directory.
> - In that project directory install the project requirements with `pip install -r requirements.txt`.
>   If you created and activated a virtual environment first then the project requirements are
>   installed only in the context of your virtual environment.
> - Rename the file `.env sample` in the project directory to `.env` and edit the required settings:
>
>   ```
>   AXL_HOST=<UCM host to be used for AXL requests>
>   AXL_USER=<username for AXL authentication>
>   AXL_PASSWORD=<password for AXL authentication>
>   WEBEX_ACCESS_TOKEN=<access token obtained from developer.webex.com>
>   GMAIL_ID=<gmail email id user to create dummy email addresses for Webex test users>
>   ```
>
> To obtain a Webex access token you need to navigate to https://developer.webex.com and log in as
> an administrator of your Webex site. Click your avatar in the header, then navigate to the
> Developer Token section on the left. Copy the access token from there and paste it to the `.env` file.
>
> For `read_gdpr.py` you have to edit the `read_gdpr.yml` file and enter the host names and credentials
> of the UCM hosts that the tool should read GDPR learned patterns from. The tool creates a CSV file
> with all patterns learned by any of the UCM hosts configured.
>
> Finally, `export_to_csv.py` is a simple tool to extract a table from UCM's Db into a CSV file.
> The table to export is passed as parameter when calling the script. The UCM data dictionary with
> documentation of all tables can be found here: https://developer.cisco.com/docs/axl/

---

## Notes on Upstream Images

The original README referenced several screenshot images stored in `.README_images/` that show
the developer.webex.com token retrieval UI. These images are not included in this Playbook.
To obtain your Webex personal access token:

1. Navigate to [developer.webex.com](https://developer.webex.com) and sign in as an org admin.
2. Click your avatar in the top-right corner.
3. Scroll to the **Personal Access Token** section and click the copy icon.

---

## Upstream Dependency Notes

- **`ucmaxl`** — This is the underlying AXL SOAP library used by `ucm_reader`. It is authored
  by the same developer ([jeokrohn/ucmaxl](https://github.com/jeokrohn/ucmaxl)) and is installed
  directly from a pinned commit SHA. There is no versioned release on PyPI.
- **`wxc-sdk`** — The Webex Calling Python SDK used by `main.py`. It was absent from the upstream
  `requirements.txt` but is available on PyPI as [`wxc-sdk`](https://pypi.org/project/wxc-sdk/).
  Version `1.32.0` has been added to `src/requirements.txt` in this Playbook.
- **`zeep`** — SOAP client library used by `ucmaxl` to communicate with the UCM AXL endpoint.
