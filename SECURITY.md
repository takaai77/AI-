# Security Policy

## Security Priorities

1. Protect secrets (API keys, passwords, tokens)
2. Restrict access (least privilege, role-based controls)
3. Validate all external input
4. Keep dependencies updated
5. Keep logs useful but non-sensitive

## Safe Development Rules

- Never commit `.env` or raw secrets.
- Use GitHub Secrets for CI/CD.
- Keep GitHub Actions permissions minimal.
- Avoid exposing admin endpoints without authentication.
- Validate request input on server side.
- Do not log personal data or raw tokens.

## Incident Response (Minimum)

If a secret leak is suspected:

1. Revoke and rotate keys immediately.
2. Review git history and remove sensitive values where possible.
3. Check logs and access history for suspicious usage.
4. Document root cause and prevention actions.

## Reporting

For security issues, open a private report to repository maintainers.
Do not disclose exploit details in public issues before mitigation.
