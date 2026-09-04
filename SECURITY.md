# Security policy

## Supported versions

Only the latest release on the `main` branch receives fixes.

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private vulnerability reporting on this repository (Security tab, "Report a vulnerability"), or write to kontakt@ravdev.pl. You will get a reply within a few days.

## Things worth knowing before you deploy

- The dashboard and the JSON API have no authentication. Anyone who can reach the port can add URLs, and the server will open those URLs in a headless browser. Run it on localhost, inside a private network, or behind a reverse proxy with authentication. Do not expose it to the internet as is.
- `.env` holds your Anthropic API key and Discord webhook. Keep it out of version control (it is in `.gitignore`) and out of Docker images (it is in `.dockerignore`).
- Page content is untrusted input. It goes to the model as text only, and the model's answer is validated against a schema before it is stored. It is never executed or rendered as HTML without escaping.
