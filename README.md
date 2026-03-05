# Memohub

> A lightweight media memo/manager with a FastAPI backend and a Next.js frontend.

This repository contains a simple media storage and viewing application split into two parts:

- `backend/` — FastAPI application that stores media metadata and serves files.
- `frontend/` — Next.js frontend (React) providing a gallery UI and viewer components.

## Features

- Upload and serve images and videos
- FastAPI backend with SQLAlchemy and SQLite for local development
- Next.js frontend with responsive gallery and modal viewer

## Project structure

- `backend/` — FastAPI app, dependencies in `requirements.txt`, example run command in `run.txt`.
- `frontend/` — Next.js app, scripts in `package.json`.
- `data/` — stored media files (organized by user / collection ids)
- `memohub_db.sqlite3` — default local SQLite database (backend)

## Prerequisites

- Python 3.11+ (or a supported 3.x listed in the backend dependencies)
- Node.js 18+ and npm
- git (optional)

## Backend (development)

1. Create a virtual environment and install dependencies:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

2. The repository includes an example run command in `backend/run.txt`. To run the backend locally (uses uvicorn):

```bash
# from repository root
cd backend
# example (local dev with reload and TLS as shown in run.txt)
uvicorn src.server:app --host localhost --port 8000 --loop asyncio --reload
```

If you want to use TLS (dev certs), the project contains an example in `run.txt` referencing `localhost+2.pem` and `localhost+2-key.pem`.

Open the automatic API docs (when server is running):

- Swagger UI: https://localhost:8000/docs
- ReDoc: https://localhost:8000/redoc

The backend uses SQLite by default: `memohub_db.sqlite3` at the repository root. For production you can swap SQLAlchemy to another database engine.

## Frontend (development)

Install dependencies and run the Next.js dev server:

```bash
cd frontend
npm install
npm run dev
```

By default the frontend dev script uses `node dev-server.js`. Production build and start commands are:

```bash
cd frontend
npm run build
npm run start
```

The frontend is built with Next.js and React; it talks to the FastAPI backend for media and metadata.

## Environment / Configuration

- Backend configuration variables (if any) are defined in the backend source — check `backend/src` for settings and env usage.
- Frontend API base URL can be configured in the frontend code (look in `frontend/lib` or `frontend/app` files).

## Development notes

- Media files are stored in `data/` organized by collection id. Thumbnails ending in `.thumb` are included.
- The backend requires `python-magic` and `pillow` for content-type detection and image processing.
- See `backend/requirements.txt` and `frontend/package.json` for exact dependency versions.

## Contributing

Contributions are welcome. Suggest an issue or open a pull request with a clear description of the change.

## License

This repository does not include a license file. Add a suitable license (for example MIT) to make reuse and contributions clear.

## Where to look next

- Backend API and models: `backend/src/` (look for `server.py`, `models.py`)
- Frontend components: `frontend/components/` and `frontend/app/`

---
Created to make local development easy — run the backend, then the frontend, and open the app in your browser.
# memohub