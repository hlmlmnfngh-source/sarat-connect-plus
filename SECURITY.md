# Security

Speeds uses Bun dependency auditing, CodeQL, Gitleaks, and Trivy in CI. Dependency versions are locked in `bun.lock` and the security workflow blocks high/critical findings from the Bun audit.
