# SellSync AI

> **One Product. Every Marketplace. One Dashboard.**

SellSync AI is an enterprise-grade, multi-marketplace e-commerce SaaS platform engineered for Indian sellers, D2C brands, and multi-channel retailers expanding across Flipkart, Meesho, Shopify, WooCommerce, Myntra, and AJIO.

---

## 🚀 Key Highlights & Architecture

- **Multi-Tenant Workspace Isolation**: Every seller organization operates in an isolated workspace with strict tenant security, custom roles, and team membership.
- **Provider-Independent AI Listing Generator**: Generates optimized product titles, attributes, bullet points, and SEO descriptions tailored to individual marketplace taxonomies without hallucinating specifications.
- **Atomic Inventory Engine**: Prevents overselling across connected marketplaces using safety stock calculation and row-level reservation locks:
  $$\text{Available Stock} = \text{On Hand} - \text{Reserved Stock} - \text{Safety Stock}$$
- **One-Click Multi-Channel Publishing**: Publishes canonical product data to multiple marketplaces simultaneously with independent queue workers and per-marketplace error isolation.
- **Unified Order & Return Management**: Centralizes orders from all marketplaces with idempotent webhook processing and status synchronization.
- **SaaS Billing Engine**: Built for India with Razorpay (supporting GST e-invoices, coupons, and recurring subscriptions) plus international Stripe configuration.
- **Super Admin Governance**: System-wide analytics, MRR/ARR tracking, connector health monitoring, and plan configuration without code changes.

---

## 🛠️ Technology Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui primitives, Framer Motion, TanStack Query, React Hook Form, Zod, Recharts.
- **Backend**: Python 3.11+ / FastAPI, SQLAlchemy 2.0 (Async), Pydantic v2, Alembic.
- **Database**: PostgreSQL (Row-Level Security, UUID primary keys, Timestamptz) & Redis (Cache & Celery broker).
- **Background Tasks**: Celery with Redis for asynchronous publishing, inventory sync, and webhook processing.
- **Integrations**: Official Shopify GraphQL Admin API, WooCommerce REST API v3, Flipkart Seller API, with structured adapters for Meesho, Myntra, and AJIO.

---

## 📂 Project Structure

```
├── backend/
│   ├── app/
│   │   ├── api/             # API route controllers (v1)
│   │   ├── core/            # Configuration, JWT security, RBAC, exceptions
│   │   ├── db/              # SQLAlchemy session & base classes
│   │   ├── models/          # Declarative SQLAlchemy models
│   │   ├── schemas/         # Pydantic v2 schemas
│   │   └── services/        # Business logic services
│   ├── alembic/             # Database migrations
│   ├── tests/               # Pytest automated test suite
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── components/      # UI components & Design System
│   │   └── lib/             # API client, Auth state, utility functions
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml       # Local dev stack (Postgres, Redis, API, Web)
├── .env.example             # Environment variable template
├── DEVELOPMENT_STATUS.md    # Phase-by-phase implementation status
└── README.md
```

---

## ⚡ Quick Start

### 1. Prerequisites
- Python 3.11+
- Node.js 20+
- PostgreSQL & Redis (or Docker Compose)

### 2. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
cp ../.env.example .env
pytest tests/
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the SaaS application.

