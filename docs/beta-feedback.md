# Beta feedback and triage

## Reporting a problem

Beta feedback is collected through the repository's
[Beta bug report](https://github.com/ekbatani/inkest/issues/new?template=bug-report.yml).
The form asks for the expected and actual result, reproducible steps, impact,
and environment details. It deliberately does not ask for note content.

Do not put private notes, attachment contents, passwords, session cookies, API
keys, OAuth tokens, Telegram credentials, or unredacted logs in a public issue.
Redact screenshots and logs. Report a potential vulnerability privately through
[GitHub security advisories](https://github.com/ekbatani/inkest/security/advisories/new),
not through the beta bug form.

## Severity definitions

Maintainers assign severity after confirming the report. A reporter's selected
impact helps triage but does not set priority by itself.

| Severity | Meaning | Release handling |
| --- | --- | --- |
| Release-blocking | Credible data loss, privacy or authorization exposure, a security issue, or an editor/app failure that prevents normal use with no safe workaround. | Stop the affected release or beta expansion; acknowledge promptly and track a fix or documented mitigation. |
| High | A common core workflow is blocked or seriously unreliable, but data and access remain safe or a limited workaround exists. | Prioritize for the current beta cycle. |
| Normal | A workflow is impaired, confusing, or inconsistent but has a reasonable workaround. | Schedule against the beta backlog after high issues. |
| Enhancement | A feature request, polish idea, or non-defect improvement. | Record for product review; it does not block release. |

## Triage cadence

- Review new beta reports at least twice each week during the beta.
- Acknowledge reports that contain reproduction steps within two business days.
- Reproduce and assign a severity, owner, and next status within five business
  days; ask for only the minimum extra information needed.
- Review open release-blocking and high issues weekly before inviting more beta
  users or publishing a release.
- Close only with a linked fix, a documented workaround, a duplicate link, or
  an explanation that the report could not be reproduced after follow-up.

Issue reports are public repository records. Test accounts and redacted,
minimal examples are the expected way to reproduce a problem.
