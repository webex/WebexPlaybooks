# Playbook Pull Request

For **internal contributors** submitting a new Playbook. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full submission process from branch naming through merge.

---

## Required Files

Before submitting, confirm your Playbook folder under `playbooks/<tool-slug>/` includes:

- [ ] **Playbook folder** at `playbooks/<tool-slug>/` with a kebab-case name matching the third-party tool slug
- [ ] **README.md** with all 6 required sections: Use Case Overview, Architecture, Prerequisites, Code Scaffold, Deployment Guide, Known Limitations
- [ ] **APPHUB.yaml** present and correctly formatted (see below)
- [ ] **diagrams/** folder present (e.g. with an architecture diagram)
- [ ] **src/** folder present with sample code

### APPHUB.yaml format

Ensure **APPHUB.yaml** is correctly formatted per the [APPHUB schema in CONTRIBUTING.md](CONTRIBUTING.md#apphubyaml-metadata): all required fields filled, valid values for `vertical` and `webex_component`; `status` = `draft` or `review` (do not set `published`). The Validate Playbook workflow will fail if required fields are missing or invalid.

---

## Author Checklist

Before submitting, confirm:

- [ ] All 6 required sections present in README.md (Use Case Overview, Architecture, Prerequisites, Code Scaffold, Deployment Guide, Known Limitations)
- [ ] APPHUB.yaml complete with all required fields
- [ ] Branch name follows `playbook/<tool-slug>`
- [ ] Code scaffold connects to a real, documented Webex API endpoint
- [ ] Deployment guide tested end-to-end
- [ ] No competitor tools (Genesys, NICE, Five9, Talkdesk) as primary integration targets

---

## Playbook Details

| Field | Value |
|-------|-------|
| Playbook title | |
| Third-party tool | |
| Primary vertical | healthcare / financial-services / retail-ecommerce |
| Target persona | admin / developer / architect |
| Estimated implementation time | |

---

## Review Process and Turnaround

- **Automated validation:** When you open or update this PR, the **Validate Playbook** workflow runs and posts a comment with results. The PR cannot merge until all checks pass. Fix any failures and push to re-run.
- **Human review:** After validation passes, a reviewer performs a ~15-minute spot-check using the [review criteria](CONTRIBUTING.md#review-criteria) in CONTRIBUTING.md. You may receive change requests; push commits to this branch to address them.
- **Turnaround:** Reviewers aim to complete the initial spot-check within **3 business days**; you will be notified of any change requests in the PR.

---

## Reviewer: 15-Minute Spot-Check

- [ ] Does the scaffold connect to a real Webex API, SDK, or Developer Tool?
- [ ] Is the deployment guide followable by a competent developer?
- [ ] Does this duplicate an existing Playbook?

---

## Self-Attestation

By submitting this PR I confirm that the deployment guide is accurate to the best of my knowledge and that Webex does not guarantee the functional accuracy of this Playbook.
