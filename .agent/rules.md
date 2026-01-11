# Agent Rules & Best Practices

## Terminal & Shell

- **Environment**: Fedora Linux.
- **Node.js**: Use `node -v` to verify (current: v24.12.0).
- **Agent Fix**: The `.bashrc` has a specific early-return block for `ANTIGRAVITY_AGENT`. If you are a different agent, you may need a similar environment variable to bypass shell decorations that cause "terminal blindness."
- **Command Style**: Use `docker compose` (not `docker-compose`).

## Backend Development

- **Database**: Use Port 3307 for local dev (mapped from container 3306).
- **Security**: Never share the `.env` contents. Use the `reset_password.js` utility for credential resets.
- **Sanitization**: All HTML from rich text editors (ReactQuill) must be sanitized on the backend using `sanitize-html`.

## Frontend Development

- **Styling**: Tailwind CSS.
- **Icons**: Lucide React.
- **API**: Use the base URL from `config.js`.

## Deployment

- **Branch**: `main` is the source for both environments.
- **Staging**: Auto-deployed on push to `main`.
- **Live**: Manually triggered via GitHub Actions `workflow_dispatch`.
