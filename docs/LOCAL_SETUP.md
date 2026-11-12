# Local setup

This takes about five minutes. You need neither a database install nor an API key.

## Requirements

- **Node.js 20.19 or newer.** Node 22 is recommended (`.nvmrc`). With nvm, run `nvm use`.
- npm 10 or newer, which comes with Node.
- Git.
- About 70 MB of free disk for the embedded MongoDB binary, which is downloaded on the first start.

## Steps

```bash
git clone https://github.com/shekhar-narayan-mishra/Ghummoo.git ghumo
cd ghumo
git switch staging        # contributors work from staging once it exists; until then use the branch named in the issue
npm run setup             # installs root, server and client dependencies
npm run dev               # API on http://localhost:5050, web app on http://localhost:5173
```

Open http://localhost:5173.

On the first start, the server:
1. downloads a `mongod` binary into `server/.cache/`;
2. starts an **embedded MongoDB** whose data is stored in `server/.data/`;
3. seeds demo data, every record of which is marked "Demo".

## Demo accounts

All demo accounts share the password in [README.md](../README.md#demo-accounts) when running locally.

| Role | Email |
| --- | --- |
| Traveller | `traveller@ghumo.demo` |
| Organiser (approved) | `operator@ghumo.demo` |
| Organiser (pending approval) | `newoperator@ghumo.demo` |
| Admin | `admin@ghumo.demo` |

## Optional configuration

Copy `server/.env.example` to `server/.env` and edit it. Every variable is documented there. The common ones:

| Variable | When you need it |
| --- | --- |
| `MONGODB_URI` | To use your own MongoDB (for example a free Atlas cluster) instead of the embedded one |
| `AI_PROVIDER` with `ANTHROPIC_API_KEY`, or `OPENAI_API_KEY` and `OPENAI_BASE_URL` | To try AI Package Studio and AI discovery against a real model. Without a key, Studio says it is unavailable and discovery uses the deterministic fallback |
| `JWT_SECRET` | Locally it defaults to a random value, so you are signed out on each restart. Set it to stay signed in |

Never commit `server/.env`. It is gitignored.

## Resetting data

```bash
npm run seed    # WIPES the configured database and reloads the demo data
```

It prints the target it is about to wipe. It refuses, before connecting, when `NODE_ENV=production`
or when `MONGODB_URI` points at anything but the local machine (`localhost`, `127.0.0.1`, `::1`,
or the embedded database); every `mongodb+srv://` URI is treated as remote. Pass `--force` to
confirm a deliberate wipe: `npm run seed -- --force`.

## Production-like run

```bash
npm run build   # builds client/dist
npm start       # one Express process serves the API and the built app on :5050
```

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `The server is starting up` (503) for a long time on first run | The `mongod` download is in progress. Watch the API terminal |
| An error saying the embedded database is locked | Another Ghumo server is using `server/.data`. Stop it, or point `EMBEDDED_DB_PATH` at another folder |
| A Vite error about the Node version | Upgrade to Node 20.19 or newer |
| Port 5050 or 5173 is in use | Set `PORT` in `server/.env`; Vite picks the next free port by itself |
