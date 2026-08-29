# LedgerPulse: E-Commerce Deterministic Data Reconciliation & Executive Dashboard

**LedgerPulse** is an end-to-end, production-ready web application designed for financial controllers and e-commerce business owners. It ingests store sales exports (`orders.csv`) and payment gateway exports (`payments.csv`), deterministically reconciles records to uncover hidden revenue leakage, presents financial metrics on an executive dashboard, and leverages OpenAI LLM to provide plain-language explanations and action plans for every discrepancy.

---

## Executive Overview & Business Value

In online store operations, discrepancies between the e-commerce platform's database and payment gateway processors (e.g. Stripe, PayPal) lead to uncollected revenue, double-charging customers, fee overcharges, and chargeback risks.

LedgerPulse answers three critical questions at a glance:
1. **How bad is it?** Headline metrics highlighting total reconciled value vs. total disputed value and net **Money at Risk**.
2. **What kind of problems do we have?** Categorized breakdown of discrepancies (unmatched orders, duplicate payments, amount variances, status mismatches, excessive processing fees).
3. **Which ones should we look at first?** Prioritized drill-down table with severity badges (`CRITICAL`, `HIGH`, `MEDIUM`) and AI-generated root cause analysis.

---

## Tech Stack & Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            NEXT.JS 14 FRONTEND                              │
│ ┌───────────────────┐ ┌────────────────────┐ ┌───────────────────────────┐ │
│ │  Auth & Ingestion │ │ Executive Dashboard│ │ Interactive Drill-Down    │ │
│ │  (JWT / CSV Drop) │ │ (KPI Cards/Charts) │ │ Table & AI Modal          │ │
│ └─────────┬─────────┘ └─────────┬──────────┘ └─────────────┬─────────────┘ │
└───────────┼─────────────────────┼──────────────────────────┼───────────────┘
            │                     │                          │
┌───────────▼─────────────────────▼──────────────────────────▼───────────────┐
│                      BACKEND (NEXT.JS API ROUTES)                           │
│ ┌───────────────────┐ ┌────────────────────┐ ┌───────────────────────────┐ │
│ │ Auth & Security   │ │ Reconciliation     │ │ OpenAI LLM AI Explainer   │ │
│ │ (Bcrypt, JWT)     │ │ Engine (Rule-based)│ │ (Structured Output / 0.2) │ │
│ └─────────┬─────────┘ └─────────┬──────────┘ └─────────────┬─────────────┘ │
└───────────┼─────────────────────┼──────────────────────────┼───────────────┘
            │                     │                          │
            └─────────────────────┼──────────────────────────┘
                                  ▼
                     ┌──────────────────────────┐
                     │   DATABASE (PRISMA/SQL)   │
                     │  - Users                 │
                     │  - Raw Orders & Payments │
                     │  - Reconciliation Runs   │
                     │  - Discrepancies         │
                     └──────────────────────────┘
```

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS, Lucide Icons, Recharts.
- **Backend**: Next.js Server API Routes, Deterministic Matching Algorithm, PapaParse.
- **Authentication**: JWT Cookie session auth + `bcryptjs` password hashing. Per-user data isolation via foreign keys.
- **Database**: Prisma ORM with SQLite (local development) / PostgreSQL (production deployment).
- **AI Integration**: OpenAI `gpt-4o-mini` API integration with structured JSON output and low-temperature setting (`0.2`), backed by a resilient fallback engine.

---

## Reconciliation Engine Logic & Rules

The matching engine is **100% deterministic, repeatable, and rule-based**. An LLM is never used to match records.

### 1. Data Normalization & Sanitization
- **ID Normalization**: Standardizes Order IDs and Payment IDs (`trim()`, `toUpperCase()`, stripping whitespace e.g. `" ORD-1013 "` $\rightarrow$ `"ORD-1013"` and `"ord-1014"` $\rightarrow$ `"ORD-1014"`).
- **Monetary Normalization**: Floats parsed and formatted to 2 decimal places.
- **Status Normalization**: Maps statuses to standardized uppercase enums.

### 2. Matching Heuristics
1. **Direct Exact Match**: Matches `Order.order_id` against `Payment.order_id`.
2. **Duplicate Payment Match**: Detects whether multiple payment capture records point to a single order ID.

### 3. Discrepancy Taxonomy & Tolerances

| Discrepancy Type | Description | Severity | Financial Risk Calculation |
| :--- | :--- | :---: | :--- |
| **`UNMATCHED_ORDER`** | Order marked Completed/Paid in store, but zero payment record exists in payment gateway. | `CRITICAL` | 100% of Order Amount (Uncollected Revenue). |
| **`UNMATCHED_PAYMENT`** | Payment captured in gateway, but no corresponding order exists in store database. | `HIGH` | 100% of Payment Amount (Unallocated Revenue / Ghost Charge). |
| **`DUPLICATE_PAYMENT`** | Multiple captured payment transactions point to the same order ID. | `CRITICAL` | Sum of excess captured payments (Customer Double-Charge Risk). |
| **`AMOUNT_MISMATCH`** | Gateway captured amount $\neq$ Store order amount beyond tolerance threshold ($|\Delta| > \$0.05$). | `HIGH` | $|\text{Order Amount} - \text{Payment Amount}|$ (Variance). |
| **`STATUS_MISMATCH`** | Order status is `CANCELLED`/`REFUNDED` but Payment status is `CAPTURED`/`SETTLED` (or vice versa). | `CRITICAL` | Order or Payment amount (Unrefunded Customer / Goods shipped unpaid). |
| **`FEE_LEAKAGE`** | Gateway processing fee exceeds standard expected contract rate ($> 3.5\%$ of payment amount). | `MEDIUM` | $\text{Fee Amount} - (0.035 \times \text{Payment Amount})$ (Fee Overcharge). |
| **`CURRENCY_MISMATCH`** | Store order currency differs from gateway payment currency. | `MEDIUM` | Unhedged Currency Variance. |

---

## What We Discovered in the Data

Analysis of the real 187-row dataset (`orders.csv` and `payments.csv`) revealed **30 exact discrepancy cases** across **$42,296.99 of store orders** and **$42,719.38 of gateway payments**:

- **Total Reconciled Value**: **$39,688.55** (93.8% of order revenue verified cleanly)
- **Total Disputed Value**: **$2,916.44**
- **Net Money at Risk**: **$1,757.79**

### Detailed Breakdown of Findings & Business Impact

1. **Multi-Currency Mismatches (`CURRENCY_MISMATCH` - 2 items)**:
   - `ORD-1601` ($210.00) recorded in **USD** in the store database, but charged in **EUR** (`TXN700171`) in the payment processor.
   - `ORD-1602` (€145.00) recorded in **EUR** in the store database, but charged in **USD** (`TXN700172`) in the payment processor.
2. **Unrefunded Cancelled Orders & Unpaid Deliveries (`STATUS_MISMATCH` - 2 items, $485.00 Risk)**:
   - `ORD-1701` ($175.00) is marked `CANCELLED` in the store, but payment `TXN700173` remains `SETTLED` (unrefunded money owed to customer).
   - `ORD-2001` ($310.00) is marked `COMPLETED` in store, but gateway transaction `TXN700183` is `FAILED` (goods fulfilled without captured funds).
3. **Duplicate Payment Captures (`DUPLICATE_PAYMENT` - 4 items, $467.58 Overcharge Risk)**:
   - Single order IDs (`ORD-1502`, `ORD-1702`, `ORD-1703`, `ORD-1501`) each had **two separate payment transactions captured** in `payments.csv`, double-charging customers and triggering chargeback penalties.
4. **Uncollected Revenue (`UNMATCHED_ORDER` - 4 items, $392.35 Risk)**:
   - Orders `ORD-1203` ($59.52), `ORD-1201` ($94.87), `ORD-1204` ($157.13), and `ORD-1202` ($80.83) are completed in the store system, but have **zero payment records** in `payments.csv`.
5. **Ghost / Unallocated Gateway Payments (`UNMATCHED_PAYMENT` - 3 items, $308.00 Risk)**:
   - `TXN700162` ($78.98), `TXN700161` ($79.51), and `TXN700163` ($149.51) were captured by the gateway without any matching store order.
6. **Amount Misalignment (`AMOUNT_MISMATCH` - 3 items, $103.50 Risk)**:
   - Variances between store `net_amount` (after promotional discount) and gateway captured amount.
7. **Gateway Processing Fee Leakage (`FEE_LEAKAGE` - 12 items)**:
   - Gateway charged processing fees exceeding the expected contract rate of 3.5% on micro-transactions.
8. **Data Messiness Handled**:
   - Spacing anomalies (e.g. `" ord-1801 "`).
   - Missing fields (e.g. `ORD-2201` missing email).
   - Mixed date formats (`YYYY-MM-DD HH:mm:ss` vs `DD/MM/YYYY HH:mm`).

---

## LLM Integration & AI Explainer Approach

- **Backend-Only Execution**: Called strictly inside Next.js Server API route `/api/llm/explain`. API keys are kept safely in `.env`.
- **Model Choice**: OpenAI `gpt-4o-mini` (or `gpt-3.5-turbo`).
- **Temperature Choice (`0.2`)**:
  - *Why low temperature?* A financial audit explainer requires analytical, objective, and consistent output without imaginative or creative hallucinations. A low temperature of `0.2` ensures the LLM sticks strictly to the provided order and payment data facts.
- **Structured Output**: Uses OpenAI's `response_format: { type: "json_object" }` to enforce a strict JSON schema:
  ```json
  {
    "summary": "Plain-language overview of discrepancy",
    "probableRootCause": "Technical/operational cause hypothesis",
    "businessImpact": "Financial risk and customer satisfaction impact",
    "recommendedActions": ["Actionable step 1", "Actionable step 2"]
  }
  ```
- **Fallback & Resilience**: If `OPENAI_API_KEY` is not provided or network issues occur, the backend automatically invokes a rule-based financial controller fallback explainer so the application remains 100% functional out of the box.

---

## Quick Start & Local Setup

### Prerequisites
- Node.js v18+ and npm installed.

### 1. Installation
```bash
# Install dependencies
npm install
```

### 2. Database Initialization
```bash
# Push Prisma schema to SQLite database (dev.db)
npx prisma db push
```

### 3. Environment Variables Setup
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Default `.env`:
```ini
DATABASE_URL="file:./dev.db"
JWT_SECRET="ledger-pulse-secret-key-2026-production"
OPENAI_API_KEY="sk-proj-..." # Optional
```

### 4. Run Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

### 5. Instant Auditor Sign-In
Click the **"1-Click Demo Auditor Sign In"** button on the login screen to explore pre-loaded datasets instantly.

---

## Future Enhancements

1. **Multi-Currency Real-Time Conversion**: Auto-fetch daily spot FX rates from OpenExchangeRates API to convert foreign currency payments.
2. **Automated Refund & Dispute Triggers**: Allow financial controllers to trigger single-click refunds for duplicate charges directly via gateway APIs (Stripe / PayPal SDK).
3. **Webhooks Integration**: Real-time reconciliation stream via Shopify and Stripe webhooks.

---

## Note on AI Tools Used

AI coding assistants were utilized for pair programming, rapid boilerplate setup, and initial component layout styling. All reconciliation algorithms, financial calculations, database schemas, and business logic were reviewed, verified, and tested to ensure 100% technical accuracy.
