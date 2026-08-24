# Security policy

## Reporting a vulnerability

Do not open a public GitHub issue for a security vulnerability.

Use a private GitHub Security Advisory for this repository, or contact the
OpenCoven maintainers through the official Discord and request a private
security channel. Include reproduction steps, affected routes or commits, and
the impact you believe is possible.

We aim to acknowledge reports within 48 hours and to address confirmed
vulnerabilities according to severity. These targets are goals, not contractual
service-level guarantees.

## In scope

Security reports are welcome for:

- cross-site scripting or unsafe MDX rendering;
- credential, cookie, authorization-header, or local-daemon data leakage;
- bypasses in the loopback-only Coven proxy validation;
- server-side request forgery through API playground routes;
- abuse paths in documentation assistants, feedback, or search bridges;
- exposure of private source, environment variables, build artifacts, or
  generated content;
- redirect or canonical-URL behavior that enables a practical security issue;
- dependency or build-pipeline compromise specific to this repository.

The docs site's local daemon bridge is intentionally narrow: it must accept only
loopback HTTP targets under `/api/`, strip credential-bearing request headers,
and fail closed on hosted deployments that cannot reach a reader's local
socket.

## Product-security documentation

Incorrect security documentation is urgent and should be reported, but it is
not automatically a software vulnerability. Use a normal documentation issue
for an inaccurate claim unless the inaccuracy itself creates an exploitable
condition or causes sensitive data exposure.

Runtime, identity, memory, and agent-execution vulnerabilities belong in the
repository that implements the affected contract. When ownership is unclear,
report privately here and maintainers will route it.

## Out of scope

- vulnerabilities that exist only in an upstream dependency and do not have a
  repository-specific exploit path;
- model-provider API issues;
- denial of service requiring control of the same local user account without
  crossing an additional trust boundary;
- synthetic demo content that cannot access genuine local data.

## Disclosure

OpenCoven will credit researchers who responsibly disclose confirmed
vulnerabilities when they request credit and doing so does not interfere with
remediation.
