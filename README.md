# Blink

A minimalist, keyboard-driven task manager that feels like a terminal app in the browser. Everything happens through one prompt and a handful of vim-like keys, and the list stays instant with tens of thousands of items.

**Live:** https://blink.luizgustavojunqueira.com (create an account and try it)

## Features

- **Keyboard only.** `j`/`k` to move, `l` to open, `h` to go back, `v` for visual selection, `d d` to delete, `u` to undo. Press `t` at any time to see the keys available where you are.
- **One prompt for everything.** Type to filter the list as you type, start with `:` for commands, and mix modifiers anywhere: `:create pay rent #home !high ^fri`.
- **Groups and panes.** Items nest into groups; entering a group or an item opens a pane on the right, `ctrl+h`/`ctrl+l` move between panes.
- **Due dates in plain words.** `^today`, `^tomorrow`, `^fri`, `^+3`, `^26/11`, `^31/12/26`, plus `:today`, `:week` and `:month` views across every group.
- **Bulk editing.** Mark rows with `space` or select a range with `v`, then `:edit @done !low`, `:move`, `:group` or `d d`.
- **History.** Every change to an item is recorded and browsable from its detail pane.
- **Make it yours.** Themes (with editable copies), remappable keys, animations on/off and English or Brazilian Portuguese, all in `:config`.
- **Agents.** A built-in MCP server lets AI agents read and update your tasks with per-agent tokens you create and revoke in `:config`.
- **Fast and small.** A single Go binary with the UI embedded and one SQLite file. A performance suite guards rendering, navigation and the API with up to 20,000 items in one list.

## Run it locally with Docker

```sh
git clone https://github.com/luizgustavojunqueira/blink.git
cd blink
docker compose up -d --build
```

Open http://localhost:8090 and create an account. The database lives in the `blink-data` Docker volume, so it survives restarts and rebuilds.

- Another port: `BLINK_PORT=9000 docker compose up -d`
- Stop: `docker compose down` (keeps your data)
- Stop and delete all data: `docker compose down -v`
- Behind a reverse proxy that terminates HTTPS: set `TRUST_PROXY=true` so client IPs and secure cookies come from the proxy headers.

## Using Blink

### The prompt

| You type | What happens |
| --- | --- |
| `milk` | Filters the list by title as you type |
| `milk #home @todo` | Filters with modifiers |
| `:create buy milk #home ^tomorrow` | Creates an item |
| `:create work =group` | Creates a group |
| `:edit !high ^none` | Edits the marked items, or the selected one |
| `:move work` | Moves the marked items, or the selected one, into a group |
| `:week` | Open items due this week, from every group |
| `?` | Lists every modifier |

Modifiers work in filters, `:create` and `:edit`:

| Modifier | Meaning | Example |
| --- | --- | --- |
| `@` | status | `@todo`, `@done` |
| `!` | priority | `!low`, `!high`, `!urgent` |
| `#` | tag | `#work` |
| `^` | due date | `^today`, `^fri`, `^+2w`, `^26/11`, `^none` |
| `%` | order | `%due`, `%-priority` |
| `=` | type | `=task`, `=group` |
| `$` | description (rest of the line) | `$ call before noon` |

Other commands: `:filter`, `:delete`, `:archive`, `:group`, `:theme`, `:today`, `:month`, `:config`, `:profile`, `:logout`.

### Keys

| Key | Action |
| --- | --- |
| `j` / `k`, `g g` / `G` | Move down / up, to the top / bottom |
| `ctrl+d` / `ctrl+u` | Move 5 down / up |
| `i`, `/` | Edit the prompt, or clear it and start filtering |
| `l` / `enter` | Enter a group, or open an item's details |
| `h` | Close the current pane |
| `ctrl+h` / `ctrl+l` | Focus the pane on the left / right |
| `1` … `5` | Set status: todo, in progress, done, canceled, archived |
| `space`, `v` | Mark a row, select a range |
| `d d`, `u` | Delete, undo |
| `t` | Show or hide the key hints |
| `escape` | Leave insert/visual mode, then clear filters, marks and selection |

Every remappable key can be changed in `:config`.

### Agents (MCP)

In `:config`, add an agent under **agents** and copy its token (shown once). Point any MCP client at `https://<your-host>/mcp` with the header `Authorization: Bearer <token>`. The agent works on that account's items with the tools `list_projects`, `list_tasks`, `create_task` and `update_item`.

## Development

Requirements: Go 1.26+, Bun 1.4+ and [air](https://github.com/air-verse/air) for live reload.

```sh
make dev-api   # backend on :8081 with live reload (air)
make dev-ui    # frontend on :5173, proxying /api to the backend
```

| Command | What it does |
| --- | --- |
| `make test` | Backend and frontend tests |
| `make build` | Builds the UI, embeds it and compiles `bin/blink` |
| `make generate` | Regenerates the sqlc queries and the TypeScript types |
| `make perf` | API benchmarks and the browser performance suite |

Configuration comes from the environment (or a `.env` file in the repo root, see `.env.example`):

| Variable | Default | |
| --- | --- | --- |
| `PORT` | `8081` | HTTP port |
| `DB_PATH` | `data/blink.db` | SQLite file, created and migrated on start |
| `TRUST_PROXY` | `false` | Trust `X-Forwarded-*` headers from a reverse proxy |

Install the pre-commit hook (lint and tests for the parts you changed) with `cp scripts/pre-commit .git/hooks/`.

### Stack

- **Backend:** Go `net/http`, SQLite (modernc, no CGO), sqlc, golang-migrate, MCP Go SDK
- **Frontend:** React 19, TanStack Query, Zustand, Tailwind, Vite, Vitest

## Deploy

The repo deploys to [Fly.io](https://fly.io): `fly.toml` runs one machine with a volume for the SQLite file, and `.github/workflows/deploy.yml` runs the tests and deploys on every push to `master` (it needs a `FLY_API_TOKEN` repository secret). Keep it at one machine: SQLite lives on a single volume.

Any host that runs a container with a persistent disk works too: build the `Dockerfile` and mount a volume at `/app/data`.

## License

[MIT](LICENSE)
