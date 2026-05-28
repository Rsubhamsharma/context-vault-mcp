# Context Vault Dashboard

Minimal hackathon dashboard for Context Vault.

## Run

```bash
npm install
copy .env.example .env
npm run dev
```

Set:

```env
VITE_API_URL=http://localhost:4000
```

Routes:

- `/login`
- `/signup`
- `/projects`
- `/projects/:projectId/context`
- `/projects/:projectId/github`
- `/projects/:projectId/suggestions`
- `/projects/:projectId/versions`
- `/projects/:projectId/mcp`
