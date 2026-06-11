# Automated Security Scanning

This repository runs four security checks on every pull request to `main` (and on direct pushes to `main`) via `.github/workflows/security.yml`. A PR cannot be merged while any of these jobs fail.

| Job | Tool | Fails the build on |
| --- | --- | --- |
| `dependency-audit` | `npm audit` | Any **high** or **critical** dependency vulnerability |
| `codeql` | GitHub CodeQL (`security-and-quality` query pack) | Any new **high** or **critical** code alert |
| `gitleaks` | Gitleaks | Any committed secret / credential |
| `trivy-fs` | Aqua Trivy (filesystem scan) | Any **HIGH** or **CRITICAL** OS / lib / IaC vulnerability with a known fix |

## Enabling required checks

To actually **block merging** (not just surface failures), a repository admin must:

1. Go to **Settings → Branches → Branch protection rules**.
2. Add or edit the rule for `main`.
3. Enable **Require status checks to pass before merging** and select:
   - `Dependency Audit (npm audit)`
   - `CodeQL Static Analysis`
   - `Secret Scan (Gitleaks)`
   - `Filesystem Vulnerability Scan (Trivy)`
4. (Recommended) Enable **Require branches to be up to date before merging**.

CodeQL and Trivy also upload SARIF results to the **Security → Code scanning** tab so triage and dismissal happen in the GitHub UI.

## Triaging a failed scan

- **Dependency audit** — run `bun update <pkg>` (or `npm audit fix`) and commit the lockfile.
- **CodeQL** — open the failing job, follow the alert link, and fix the flagged code path. If it is a false positive, dismiss it from the Security tab with a justification.
- **Gitleaks** — rotate the leaked credential immediately, then remove it from history. Use `.gitleaks.toml` to allowlist test fixtures only.
- **Trivy** — upgrade the affected package/base image to a fixed version; for unfixed CVEs, add an entry to `.trivyignore` with a justification.