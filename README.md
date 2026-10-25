# Shiptivity — Y Combinator Activities

This repository contains solutions for a Y Combinator startup training program. The projects reproduce and extend parts of **Shiptivity**, a productivity and shipping-request application.

<img src="images/ycombinator-logo.webp" alt="Y Combinator logo" width="180" align="right">

## About Y Combinator

Y Combinator (YC) is a startup accelerator founded in 2005. It supports early-stage companies through funding, product guidance, founder advice, and access to a large startup network. YC has backed companies such as Airbnb, Stripe, Dropbox, DoorDash, and Coinbase.

This repository is based on a virtual internship-style program designed to teach practical startup skills. Its activities cover frontend development, backend API work, database persistence, SQL analytics, and product ideation.

<br clear="right">

## Repository Structure

```text
.
├── backend/    Express API and SQLite persistence
├── database/   SQL analytics, charts, and product ideas
├── frontend/   React Kanban board interface
├── images/     Documentation images
└── start.js    Root launcher for frontend and backend
```

## Projects

### Frontend

The frontend is a React Kanban board for shipping requests. It displays clients in three swimlanes:

- Backlog
- In Progress
- Complete

Cards can be dragged between lanes and reordered within a lane through Dragula.

Current frontend behavior:

- Uses React component state.
- Contains a local static client list in `frontend/src/Board.js`.
- Does not currently load clients from the backend API.
- Does not currently persist drag-and-drop changes through HTTP requests.

Main files:

- `frontend/src/App.js` — application shell and tab selection.
- `frontend/src/Board.js` — Kanban state and drag-and-drop behavior.
- `frontend/src/Swimlane.js` — swimlane rendering.
- `frontend/src/Card.js` — card rendering.
- `frontend/src/Navigation.js` — navigation tabs.

### Backend

The backend is an Express API backed by SQLite. It manages client status and priority ordering.

Available endpoints:

```text
GET /                           API health message
GET /api/v1/clients             List all clients
GET /api/v1/clients?status=...  Filter clients by status
GET /api/v1/clients/:id         Get one client
PUT /api/v1/clients/:id         Update status and/or priority
```

Valid statuses:

```text
backlog
in-progress
complete
```

The update endpoint:

- Validates client IDs.
- Validates statuses and priorities.
- Moves clients between swimlanes.
- Reorders priorities inside each status.
- Keeps priorities sequential, starting at `1`.
- Performs updates inside a SQLite transaction.

Main files:

- `backend/server.js` — Express application and API routes.
- `backend/clients.db` — SQLite database used by the API.
- `backend/clients.sql` — database schema and seed data.
- `backend/test/clients.test.js` — endpoint and ordering tests.

### Database Analytics

The database project analyzes the release of the Kanban Board on **2018-06-02**.

It measures:

- Daily active users before and after the release.
- Status changes by card.
- Status transition frequencies.
- Daily card-change activity.

Recorded findings:

- Mean daily active users before release: `3.63`.
- Mean daily active users after release: `11.79`.
- Increase in mean daily active users: `225.1%`.
- Actual status transitions: `286`.
- Cards with at least one status transition: `162`.
- Most common transition: `backlog -> in-progress`.

Generated charts:

- `database/charts/daily_active_users_before_after.png`
- `database/charts/status_changes_by_card.png`

Main files:

- `database/answer.sql` — SQL queries for the analysis.
- `database/generate_charts.py` — chart generation script.
- `database/ideas.md` — data-driven product ideas.
- `database/resolution.md` — analysis resolution and reproducibility notes.
- `database/shiptivity.db` — SQLite analytics database.

## Technology Stack

### Frontend Stack

- JavaScript
- React `16.7.0`
- React DOM `16.7.0`
- Bootstrap `4.2.1`
- Dragula `3.7.2`
- jQuery `3.3.1`
- Popper.js `1.14.7`
- Create React App through `react-scripts`
- CSS
- HTML

### Backend Stack

- JavaScript
- Node.js
- Express `4.16.4`
- SQLite
- `better-sqlite3` `5.4.0`
- Babel
- `@babel/cli`
- `@babel/core`
- `@babel/preset-env`
- `babel-watch`

### Database and Analytics Stack

- SQL
- SQLite
- Python
- pandas
- Matplotlib
- Python `sqlite3`
- CSV support through Python's standard library

### Development and Testing Tools

- npm
- Node.js child processes
- HTTP endpoint tests using Node's built-in `http` module
- Node's built-in `assert` module
- Git

## Requirements

- Node.js `11.10.0` is the version declared by the frontend project.
- npm compatible with the selected Node.js version.
- Python 3 for analytics scripts.
- SQLite for direct database queries.

The backend uses a native `better-sqlite3` binary. Its binary must be compiled for the Node.js version used to run the backend.

## Installation

Install backend dependencies:

```bash
npm --prefix backend install
```

Install frontend dependencies:

```bash
npm --prefix frontend install
```

For the analytics project, create or activate a Python environment and install the required packages:

```bash
python -m pip install pandas matplotlib
```

## Running the Application

The root launcher starts the backend and frontend together:

```bash
node start.js
```

Services:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:3001`

The launcher:

- Starts `backend` with `npm start`.
- Starts `frontend` with `npm start`.
- Sets `DB_PATH` to the absolute path of `backend/clients.db`.
- Prevents the frontend from opening a browser automatically.
- Stops both child processes when the launcher receives `SIGINT` or `SIGTERM`.
- Stops the remaining process if one child process exits unexpectedly.

## Node.js Compatibility

The installed `better-sqlite3` binary must match the active Node.js ABI.

If the backend reports an error similar to this:

```text
The module ... better_sqlite3.node was compiled against a different Node.js version
```

Use the Node.js version expected by the project and reinstall dependencies:

```bash
nvm install 11.10.0
nvm use 11.10.0
npm --prefix backend install
npm --prefix frontend install
node start.js
```

If using a different Node.js version, rebuild or reinstall `better-sqlite3` in the backend environment:

```bash
npm --prefix backend rebuild better-sqlite3
```

The native module must compile successfully for the active Node.js version. A successful frontend startup does not mean that the backend started successfully.

## Backend Tests

Run backend tests with:

```bash
npm --prefix backend test
```

The test suite builds the backend with Babel and verifies:

- Status changes.
- Priority insertion.
- Priority reordering.
- Moving clients between statuses.
- Invalid IDs.
- Invalid statuses.
- Invalid priorities.
- Database consistency after rejected requests.

## Database Analysis

Run the chart generator from the database directory:

```bash
cd database
python generate_charts.py
```

Run SQL directly with SQLite:

```bash
sqlite3 database/shiptivity.db
```

The analytics database is read-only for the analysis queries. `database/shiptivity.dump` can restore the original database state if needed.

## Product Ideas From the Analysis

The analytics work suggests three product improvements:

1. **Daily board digest** — summarize recent card movement and suggest a next action.
2. **Stalled-card reminders** — notify users about cards with no recent movement.
3. **Rework and collaboration prompts** — capture reasons for backward status transitions and notify collaborators.

Each idea should be evaluated with measurable metrics and, where possible, a randomized holdout group.

## Current Integration Status

The backend already supports persistent client state. The frontend currently uses static data and does not call the API.

To complete the full-stack integration, the frontend still needs to:

1. Load clients from `GET /api/v1/clients`.
2. Map API statuses to the three swimlanes.
3. Send `PUT /api/v1/clients/:id` after a drop or reorder.
4. Refresh state from the backend after successful updates.
5. Display request failures instead of silently keeping stale local state.

## License and Attribution

This repository contains educational work based on the Shiptivity and Y Combinator virtual internship activities. See the individual project metadata and upstream references for additional attribution details.
