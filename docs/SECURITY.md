# Security Policy

## Supported versions

| Version | Supported |
| ------- | --------- |
| `main` (latest) | Yes |

## Reporting a vulnerability

**Do not open a public GitHub issue for security vulnerabilities.**

Use [GitHub Private Vulnerability Reporting](https://github.com/QuantumLogicsLabs/Quantum-AI-Backend/security/advisories/new).

Include reproduction steps, affected endpoints, and impact.

### What to expect

- Triage acknowledgement
- Coordinated fix and disclosure
- Credit when appropriate and desired

## In scope

- Auth / JWT issues
- Unauthorized access to another user’s documents or AI history
- Secrets leakage (`GROQ_API_KEY`, Mongo credentials, tokens) in logs or artifacts
- Prompt injection or data exfiltration with security impact

## Out of scope

- Model hallucination without a security impact
- Issues solely in Quantum-AI-Frontend or QuantumChat messenger repos
- Lost end-user credentials

## Safe harbor

Good-faith research that follows this policy and avoids abusing real user data
will not be pursued legally by the maintainers.
