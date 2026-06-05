# Nayak: AI Courtroom & Judicial Review Suite

Nayak is a high-performance, full-stack monorepo system designed for adversarial legal analysis and judicial review support.

## Product Modules

1. **Nayak**: The parent web application suite.
2. **Nyaybandhu**: The adversarial legal analysis module.
3. **VicharakBandhu**: The judicial review support module.

---

## Repository Structure

```
nayak/ (Root)
├── apps/
│   ├── web/                     # Next.js Frontend (Nayak Suite UI)
│   │   ├── src/
│   │   │   ├── app/             # App Router pages and layouts
│   │   │   ├── components/      # Common UI components & Radix primitives
│   │   │   ├── hooks/           # Custom React hooks
│   │   │   ├── lib/             # Shared helper utilities (e.g. cn class merger)
│   │   │   ├── store/           # Zustand state management slices per module
│   │   │   └── types/           # Global TypeScript declarations
│   │   ├── package.json         # Frontend package config
│   │   └── tailwind.config.ts   # Styling configuration
│   └── api/                     # FastAPI Backend Service
│       ├── app/
│       │   ├── api/             # API v1 route definitions
│       │   ├── core/            # Application settings and configuration
│       │   ├── db/              # SQLAlchemy SQLite setup (base, session, models)
│       │   ├── schemas/         # Pydantic schemas for verification/responses
│       │   ├── services/        # Service layers for operations
│       │   ├── graphs/          # LangGraph state graph definitions
│       │   └── main.py          # Entrypoint & database lifespan setup
│       ├── requirements.txt     # Python backend dependencies
│       └── pyproject.toml       # Python settings configurations
├── .env.example                 # Example template for environment config
├── package.json                 # Monorepo workspaces definition
└── README.md                    # Starter documentation (This file)
```

---

## Setup & Development Guide

### 1. Prerequisites
- **Node.js**: v18.0 or later
- **Python**: v3.10 or later

### 2. Environment Setup
Clone the template file to configure environment settings:
```bash
cp .env.example .env
```

### 3. Backend Setup (`apps/api`)
1. Create a virtual environment and activate it:
   ```bash
   cd apps/api
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Start the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --reload --port 8000
   ```
   The interactive Swagger documentation will be available at [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs).

### 4. Frontend Setup (`apps/web`)
1. Install node dependencies from the monorepo root:
   ```bash
   npm install
   ```
2. Run the Next.js development server:
   ```bash
   npm run dev:web
   ```
   The application will run at [http://localhost:3000](http://localhost:3000).

---

## Shared Coding Conventions

### Frontend (Next.js & TypeScript)
* **Components**: Use functional React components. Place reusable UI primitives inside `src/components/ui/` and complex, feature-specific components inside module subfolders.
* **State**: Use Zustand stores inside `src/store/` (e.g. `nyaybandhu.ts`, `vicharakbandhu.ts`) to manage state for each module independently.
* **Styling**: Tailwind CSS classes with CSS variables defined in `src/app/globals.css`. Ensure dark and light themes are fully supported.
* **Validation**: All forms should be validated using `react-hook-form` coupled with `zod` schemas.

### Backend (FastAPI & Python)
* **Type Annotations**: Leverage Pydantic models in `app/schemas/` to strictly type request bodies and response structures.
* **Database**: Always use the async session context via dependency injection (`get_db`) from `app/db/session.py`.
* **Database Models**: All SQL tables should inherit from the declarative `Base` in `app/db/base.py` and be recorded in `app/db/models.py`.
* **State Graphs**: Any complex, agentic workflows (like legal argument generation or document validation) must be built inside the `app/graphs/` directory using LangGraph.
* **Streaming**: For long-running AI queries or conversations, use FastAPI's `StreamingResponse` with `text/event-stream` format.
