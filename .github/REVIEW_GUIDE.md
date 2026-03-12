# Playbook PR Review Guide

This document guides reviewers through the manual review of Playbook pull requests.
Use it alongside the automated validation results. Target time: ~15 minutes per PR.

Reference: [CONTRIBUTING.md](../CONTRIBUTING.md) for full quality floor and schema.

---

## Before You Start

- [ ] **Automated validation has passed.** Do not proceed if the Validate Playbook
  workflow failed. The author must fix CI failures first.
- [ ] **Identify changed playbook(s).** The workflow comment lists validated
  folders. Review only those folders (or all if unsure).

---

## 1. README.md — Quality Floor

Verify each required section exists and meets the quality floor.

### Required Sections (all must be present)

- [ ] **Use Case Overview** — Describes the problem, target persona, and estimated
  implementation time (e.g. "2–4 hours").
- [ ] **Architecture** — Explains component connections and references the diagram
  in `/diagrams/`.
- [ ] **Prerequisites** — Lists Webex org, API access, third-party accounts, dev
  environment, and version requirements.
- [ ] **Code Scaffold** — Describes `/src/` structure and what the code demonstrates.
- [ ] **Deployment Guide** — Numbered, step-by-step instructions a developer can follow.
- [ ] **Known Limitations** — Documents constraints, edge cases, token expiry, rate
  limits, and production-readiness disclaimer.

### Quality Floor Considerations

- [ ] **Sample code disclaimer** — Playbook clearly states it is sample code for
  demonstration/learning, not production-ready.
- [ ] **Security guidance** — Notes or references remind users that production
  deployments need authentication, authorization, and audit logging.
- [ ] **Documentation quality** — Sections are clear, accurate, and easy to follow.

---

## 2. APPHUB.yaml — Metadata

Automated validation checks structure; you verify correctness and appropriateness.

- [ ] **product_url** — Points to the correct playbook path in the repo (e.g.
  `https://github.com/webex/WebexPlaybooks/tree/main/playbooks/<slug>`).
- [ ] **product_types** — Matches the playbook's actual Webex product(s).
- [ ] **app_context** — Matches where the integration runs (e.g. space, in_meeting).
- [ ] **categories** — Appropriate for the use case (verticals and/or app categories).
- [ ] **description / tag_line** — Accurate and not misleading.

---

## 3. Source Code (src/)

- [ ] **Connects to a real Webex API** — Code calls documented Webex endpoints,
  SDKs, or Developer Tools. No internal or experimental APIs.
- [ ] **No hardcoded secrets** — Credentials, tokens, and keys come from
  environment variables or config files, not source code.
- [ ] **env.template or .env.example** — Present with required variables and
  comments. No real secrets.
- [ ] **Modular and understandable** — Code structure is clear; comments aid
  understanding where needed.

---

## 4. Deployment Guide — Followability

- [ ] **Steps are complete** — A developer can follow the guide without guessing.
- [ ] **Commands are correct** — Copy-paste commands work (paths, flags, placeholders).
- [ ] **Prerequisites are satisfied first** — Guide assumes prerequisites from
  the Prerequisites section are done.
- [ ] **Manual steps called out** — OAuth flows, ngrok, or approvals are clearly
  indicated.

---

## 5. Diagrams

- [ ] **diagrams/ folder exists** — Contains at least one architecture or flow diagram.
- [ ] **Diagram is referenced** — README Architecture section links to or
  describes the diagram.

---

## 6. Prohibited Content

- [ ] **No competitor tools as primary targets** — Playbook does not integrate
  Genesys, NICE, Five9, or Talkdesk as the main integration target. Webex only.
- [ ] **No production-hardening claims** — Does not claim the playbook is
  production-ready without additional hardening.
- [ ] **No undocumented APIs** — Only uses documented, supported Webex or
  approved third-party APIs.

---

## 7. Duplicates and Overlap

- [ ] **No duplicate playbook** — Does not duplicate an existing playbook for
  the same tool/use case. Check `playbooks/` for similar integrations.

---

## 8. Branch and PR Hygiene

- [ ] **Branch name** — Follows `playbook/<tool-slug>` (e.g. `playbook/epic-ehr`).
- [ ] **PR template completed** — Author filled in Playbook Details and
  checklists.
- [ ] **Self-attestation** — Author confirmed deployment guide accuracy.

---

## When to Request Changes

| Finding | Action |
| ------- | ------ |
| Missing README section or weak content | Request changes; specify what to add. |
| APPHUB.yaml incorrect or misleading | Request changes; cite field and correct value. |
| Code uses undocumented/internal API | Request changes; block merge. |
| Hardcoded secrets | Request changes; block merge. |
| Deployment guide incomplete or broken | Request changes; describe gaps. |
| Competitor tool as primary target | Request changes; block merge. |
| Duplicate of existing playbook | Discuss with author; may close or redirect. |
| Minor typos or style | Optional; can approve with suggestion. |

---

## Approval Checklist Summary

Before approving, confirm:

1. Automated validation passed.
2. All six README sections present and meet quality floor.
3. APPHUB.yaml correct and appropriate.
4. Code uses real Webex APIs; no hardcoded secrets.
5. Deployment guide is followable.
6. No prohibited content (competitors, production claims, undocumented APIs).
7. No duplicate playbook.

---

*Last updated per [CONTRIBUTING.md](../CONTRIBUTING.md) quality floor and review criteria.*
