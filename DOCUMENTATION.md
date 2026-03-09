# TEMS — Telecom Expense Management System

## Complete Project Documentation

> **Audience:** This documentation is written for absolute beginners. Every concept is explained from scratch — no prior programming knowledge is assumed. If you have never built a web application before, this guide will walk you through every piece of this project.

---

## Table of Contents

1. [What Is TEMS?](#1-what-is-tems)
2. [What Problem Does TEMS Solve?](#2-what-problem-does-tems-solve)
3. [Key Concepts & Terminology](#3-key-concepts--terminology)
4. [Technology Stack Explained](#4-technology-stack-explained)
5. [Project Folder Structure](#5-project-folder-structure)
6. [Prerequisites — What You Need Before Starting](#6-prerequisites--what-you-need-before-starting)
7. [Installation & Setup Guide](#7-installation--setup-guide)
8. [How the Application Works (Architecture)](#8-how-the-application-works-architecture)
9. [Database Design (Data Model)](#9-database-design-data-model)
10. [Server (Back-End) Detailed Walkthrough](#10-server-back-end-detailed-walkthrough)
11. [Client (Front-End) Detailed Walkthrough](#11-client-front-end-detailed-walkthrough)
12. [Every Page Explained](#12-every-page-explained)
13. [API Reference (All Endpoints)](#13-api-reference-all-endpoints)
14. [How Data Flows Through the App](#14-how-data-flows-through-the-app)
15. [Common Tasks & How-To Guides](#15-common-tasks--how-to-guides)
16. [Switching Databases (MySQL → PostgreSQL → MSSQL)](#16-switching-databases-mysql--postgresql--mssql)
17. [Troubleshooting](#17-troubleshooting)
18. [Glossary](#18-glossary)
19. [Prompt Log & Living Documentation](#19-prompt-log--living-documentation)

---

## 1. What Is TEMS?

**TEMS** stands for **Telecom Expense Management System**. It is a full-stack web application designed to help businesses track and manage all of their telecommunications expenses in one centralized place.

Think of it like a digital filing cabinet combined with a smart spreadsheet — it keeps all your telecom vendor information, contracts, circuit details, invoices, and cost savings opportunities organized and accessible from a web browser.

### What Can You Do With TEMS?

- **Manage vendor accounts** — Keep track of who your telecom providers are (AT&T, Verizon, etc.)
- **Track contracts** — Know when contracts expire, what rates you agreed to, and whether they auto-renew
- **Monitor circuits** — See all your telecom circuits (internet connections, phone lines, etc.) in one inventory
- **Process invoices** — Review monthly bills, check for billing errors, and verify charges match contracted rates
- **Track orders** — Follow new service orders from placement through completion
- **Allocate costs** — Split telecom costs across departments and cost centers
- **Identify savings** — Flag billing errors and negotiation opportunities to save money
- **Manage USOC codes** — Maintain a catalog of Universal Service Order Codes with default MRC/NRC rates
- **Track billing disputes** — File, monitor, and resolve billing disputes with vendors
- **Validate rates against contracts** — Automatically compare line-item charges to contracted rates and flag mismatches
- **Export data to CSV** — Download dispute lists and rate audit results as CSV files

---

## 2. What Problem Does TEMS Solve?

Imagine a medium-to-large company that uses services from 5–10 different telecom vendors. Every month, they receive a stack of invoices. Each invoice has multiple line items. Each line item corresponds to a specific circuit or service. The contracted rate might be different from what's actually billed.

**Without TEMS**, someone has to:
- Open each invoice manually
- Look up what the contracted rate should be
- Calculate if there's an overcharge
- Track which department should pay for each charge
- Remember when contracts expire
- Keep spreadsheets updated across teams

**With TEMS**, all of this is automated and centralized:
- Invoices are logged with line items that auto-calculate variance (overcharge/undercharge)
- Contracts show expiration warnings
- Savings opportunities are tracked from identification through resolution
- Costs are allocated to departments with percentage splits
- A dashboard gives instant visibility into the entire telecom portfolio

---

## 3. Key Concepts & Terminology

Before diving into the code, let's understand the business concepts that TEMS manages. Each of these is a "thing" (entity) stored in the database:

### Account
A **vendor account** represents a relationship with a telecom provider. For example, your company might have an account with AT&T and another with Verizon. Each account stores the vendor's name, account number, contact information, and status.

### Contract
A **contract** is a legal agreement between your company and a vendor. It specifies the price you'll pay (the "contracted rate"), how long the agreement lasts (the "term"), and whether it automatically renews. One vendor account can have multiple contracts.

### Circuit
A **circuit** is a specific telecommunications service or connection. Examples include:
- An internet connection (DIA — Dedicated Internet Access)
- An MPLS connection (a type of private network)
- A wireless phone line
- A fiber-optic link between two locations

Each circuit belongs to an account and is usually tied to a contract. It has a physical location, bandwidth (speed), and a monthly cost.

### Order
An **order** is a request to install, modify, or disconnect a circuit. When you sign up for a new internet line, the vendor creates an order to provision (set up) that circuit. Orders track the lifecycle from request through completion.

### Invoice
An **invoice** is a monthly bill from a vendor. It has a total amount, billing period, due date, and payment status. Each invoice contains one or more **line items**.

### Line Item
A **line item** is a single charge on an invoice. For example, one invoice might have:
- Line Item 1: MPLS circuit monthly charge — $1,850.00
- Line Item 2: DIA circuit monthly charge — $750.00
- Line Item 3: Federal USF surcharge (tax) — $190.00

Each line item compares the **billed amount** (what you were actually charged) against the **contracted rate** (what you should have been charged). The difference is called the **variance**. A positive variance means you were overcharged.

### Allocation
An **allocation** splits a line item's cost across different departments or cost centers. For example, if a $1,850 circuit charge needs to be split between IT (60%) and Sales (40%), you'd create two allocations:
- IT: $1,110.00 (60%)
- Sales: $740.00 (40%)

### Cost Saving
A **cost saving** represents an opportunity to save money. This could be:
- A billing error (you were overcharged)
- A contract optimization (market rates have dropped, time to renegotiate)
- A duplicate service (paying for something you don't use)

Each cost saving tracks the projected savings amount, the current status, and whether the savings have been realized (actually gotten back).

### USOC Code
A **USOC code** (Universal Service Order Code) is a standardized code used by telecom carriers to identify specific services or features on a bill. For example:
- Code `1LN` might represent "Basic Local Line"
- Code `MPBXS` might represent "MPLS Port — Small"

Each USOC code has a default **MRC** (Monthly Recurring Charge) and **NRC** (Non-Recurring Charge). TEMS uses these codes to categorize line items and validate billing accuracy.

### Contract Rate
A **contract rate** links a USOC code to a specific contract, defining the agreed MRC and NRC for that service under that contract. When invoices arrive, TEMS compares actual charges against these contracted rates to identify overcharges.

### Dispute
A **dispute** is a formal record of a billing disagreement filed with a vendor. It tracks the disputed amount, type (Overcharge, Missing Credit, Wrong Rate, Duplicate Charge, Service Issue), current status (Open, Under Review, Escalated, Credited, Denied, Closed), and any credits received back.

### Rate Audit / Validation
**Rate validation** is the automated process of comparing every MRC/NRC line-item charge against its corresponding contract rate. Items are flagged as:
- **Validated** — The billed amount matches the contracted rate
- **Variance** — The billed amount differs from the contracted rate
- **Pending** — No contracted rate was provided for comparison
- **Unmatched / Orphan** — The line item references a USOC code with no contract rate on file

### Audit Status
Every line item carries an **audit status** that is automatically computed when the line item is created or updated. This status drives the audit status bar on the Dashboard and the Rate Audit page.

---

## 4. Technology Stack Explained

This section explains every technology used in TEMS, what it does, and why it was chosen.

### Front-End (Client) — What the User Sees

| Technology | What It Is | Why It's Used |
|---|---|---|
| **React 18** | A JavaScript library for building user interfaces | Creates reusable, interactive UI components. When data changes, React efficiently updates only the parts of the screen that need to change. |
| **React Router DOM 6** | Navigation library for React | Enables multiple "pages" in a single-page application (SPA). Instead of loading a whole new HTML page, it swaps out components instantly. |
| **Vite 5** | A build tool and development server | Makes development fast — when you save a file, changes appear in the browser almost instantly (Hot Module Replacement). Also bundles your code for production. |
| **Axios** | HTTP client library | Sends requests to the server API. Makes it easy to do GET, POST, PUT, DELETE requests and handle responses. |
| **Chakra UI 3** | Component library | Provides styled, accessible UI components. TEMS uses it mainly for the provider wrapper and some utilities. |
| **Lucide React** | Icon library | Provides all the icons you see in the sidebar, buttons, and tables (e.g., the building icon, the pencil icon, the trash icon). |
| **Day.js** | Date utility library | Formats dates (e.g., "2026-02-15" → "Feb 15, 2026") and calculates date differences (e.g., "expires in 45 days"). |

### Back-End (Server) — What Runs Behind the Scenes

| Technology | What It Is | Why It's Used |
|---|---|---|
| **Node.js** | JavaScript runtime for servers | Lets you run JavaScript outside a web browser, so you can build server applications. |
| **Express 4** | Web framework for Node.js | Handles HTTP requests (GET, POST, PUT, DELETE) and routes them to the appropriate handler functions. |
| **Knex.js** | SQL query builder | Builds database queries using JavaScript instead of raw SQL strings. Supports MySQL, PostgreSQL, and MSSQL — switching databases requires only a config change, not rewriting queries. Also provides migrations (schema versioning) and seeds (demo data). |
| **MySQL** | Relational database (current) | Stores all the data in structured tables. TEMS currently uses MySQL but is designed to switch to PostgreSQL or MSSQL by changing one environment variable. |
| **mysql2** | MySQL driver for Node.js | The underlying driver that Knex uses to talk to MySQL. If you switch to PostgreSQL, you'd install `pg` instead; for MSSQL, `tedious`. |
| **cors** | Cross-Origin Resource Sharing middleware | Allows the front-end (running on port 2000) to make requests to the back-end (running on port 2001). |
| **dotenv** | Environment variable loader | Reads database credentials from a `.env` file so they aren't hard-coded in the source code. |
| **uuid** | Unique ID generator | Generates universally unique identifiers (used in mock data). |
| **nodemon** | Development auto-restart tool | Automatically restarts the server when you save changes to server files, so you don't have to manually stop and restart. |

### How They Work Together

```
┌─────────────────────────┐        HTTP Requests        ┌──────────────────────┐
│                         │  ──────────────────────────> │                      │
│   BROWSER (Front-End)   │   GET / POST / PUT / DELETE  │   SERVER (Back-End)  │
│                         │                              │                      │
│   React + Vite          │  <────────────────────────── │   Express + Node.js  │
│   Running on port 2000  │        JSON Responses        │   Running on port    │
│                         │                              │    2001              │
└─────────────────────────┘                              └──────────┬───────────┘
                                                                   │
                                                            SQL Queries
                                                                   │
                                                                   ▼
                                                         ┌──────────────────┐
                                                         │                  │
                                                         │   MySQL Database │
                                                         │   "doctore"      │
                                                         │                  │
                                                         └──────────────────┘
```

---

## 5. Project Folder Structure

Below is the complete folder structure with explanations of what every file does:

```
tems/                              ← Root project folder
│
├── client/                        ← FRONT-END (what users see in the browser)
│   ├── index.html                 ← The single HTML page that loads the React app
│   ├── package.json               ← Lists all front-end dependencies and scripts
│   ├── vite.config.js             ← Vite configuration (dev server port, API proxy)
│   │
│   └── src/                       ← All React source code
│       ├── main.jsx               ← Entry point — mounts React into the HTML page
│       ├── App.jsx                ← Main app layout (sidebar, header, routing)
│       ├── api.js                 ← All API functions (talks to the server)
│       ├── index.css              ← Global styles (colors, fonts, layouts)
│       ├── PageTitleContext.js     ← React context for dynamic page titles
│       │
│       ├── components/            ← Reusable UI components
│       │   └── Modal.jsx          ← Pop-up dialog used for create/edit forms
│       │
│       └── pages/                 ← One file per page/view in the app
│           ├── Dashboard.jsx      ← Home page with KPI cards and summaries
│           ├── Accounts.jsx       ← Vendor accounts list (CRUD)
│           ├── AccountDetail.jsx  ← Single account view with inline editing
│           ├── Contracts.jsx      ← Contracts list (CRUD)
│           ├── ContractDetail.jsx ← Single contract view with inline editing
│           ├── Circuits.jsx       ← Circuit inventory list (CRUD)
│           ├── CircuitDetail.jsx  ← Single circuit view with inline editing
│           ├── Orders.jsx         ← Orders list (CRUD)
│           ├── OrderDetail.jsx    ← Single order view with inline editing
│           ├── Invoices.jsx       ← Invoices list (CRUD)
│           ├── InvoiceDetail.jsx  ← Single invoice with line items & allocations
│           ├── Allocations.jsx    ← Cost center allocations list (read-only)
│           ├── CostSavings.jsx    ← Savings pipeline list (CRUD)
│           ├── UsocCodes.jsx      ← USOC code catalog list (CRUD)
│           ├── UsocCodeDetail.jsx ← Single USOC code view with inline editing
│           ├── Disputes.jsx       ← Billing disputes list (CRUD) with CSV export
│           ├── DisputeDetail.jsx  ← Single dispute view with inline editing
│           └── RateAudit.jsx      ← Rate validation report with CSV export
│
└── server/                        ← BACK-END (API server + database)
    ├── server.js                  ← Main server file — starts Express, defines routes
    ├── db.js                      ← Knex database instance + helper utilities
    ├── knexfile.js                ← Knex configuration (DB type, credentials, pool)
    ├── package.json               ← Lists all server dependencies and scripts
    ├── mockData.js                ← In-memory demo data (fallback / reference)
    ├── seed.sql                   ← DEPRECATED — old SQL seed (use Knex seeds instead)
    ├── seed_extra.sql             ← DEPRECATED — old SQL seed (use Knex seeds instead)
    │
    ├── migrations/                ← Knex schema migrations (version-controlled)
    │   ├── 20260228000000_initial_schema.js    ← Creates original 8 tables
    │   ├── 20260228100000_phase_a_usoc_rates.js ← Adds usoc_codes, contract_rates tables; alters contracts & line_items
    │   └── 20260228200000_phase_bcd_disputes.js ← Adds disputes table
    │
    ├── seeds/                     ← Knex seed data (JavaScript-based)
    │   └── 01_seed_data.js        ← All demo data (replaces deprecated seed.sql files)
    │
    └── routes/                    ← API route handlers (one file per entity)
        ├── accounts.js            ← /api/accounts endpoints
        ├── contracts.js           ← /api/contracts endpoints
        ├── circuits.js            ← /api/circuits endpoints
        ├── orders.js              ← /api/orders endpoints
        ├── invoices.js            ← /api/invoices endpoints
        ├── lineItems.js           ← /api/line-items endpoints
        ├── allocations.js         ← /api/allocations endpoints
        ├── costSavings.js         ← /api/cost-savings endpoints
        ├── search.js              ← /api/search endpoint (global search)
        ├── usocCodes.js           ← /api/usoc-codes endpoints
        ├── contractRates.js       ← /api/contract-rates endpoints
        └── disputes.js            ← /api/disputes endpoints
```

---

## 6. Prerequisites — What You Need Before Starting

Before you can run this project, you need the following software installed on your computer:

### 1. Node.js (version 18 or higher)

**What is it?** Node.js lets you run JavaScript on your computer (not just in a browser).

**How to install:**
1. Go to [https://nodejs.org](https://nodejs.org)
2. Download the **LTS** (Long Term Support) version
3. Run the installer — accept all defaults
4. Verify it worked by opening a terminal and typing:
   ```
   node --version
   ```
   You should see something like `v18.17.0` or higher.

Node.js comes with **npm** (Node Package Manager), which installs code libraries. Verify with:
```
npm --version
```

### 2. MySQL (version 8.0 or higher)

**What is it?** MySQL is a database — it stores all the application data in organized tables.

**How to install:**
1. Go to [https://dev.mysql.com/downloads/mysql/](https://dev.mysql.com/downloads/mysql/)
2. Download MySQL Community Server for your operating system
3. Run the installer
4. During setup, you'll be asked to create a **root password** — remember this!
5. Verify it worked:
   ```
   mysql --version
   ```

> **Tip:** You can also install MySQL through tools like XAMPP, WAMP, or Docker if you prefer.

### 3. A Code Editor (Recommended: VS Code)

**What is it?** A text editor designed for writing code.

**How to install:** Go to [https://code.visualstudio.com](https://code.visualstudio.com) and download it.

### 4. A Terminal / Command Prompt

You'll need a terminal to run commands. Options:
- **Windows:** PowerShell (built-in) or Windows Terminal
- **Mac:** Terminal (built-in)
- **Linux:** Any terminal emulator

---

## 7. Installation & Setup Guide

Follow these steps in order:

### Step 1: Get the Code

If you have the project folder already, skip this step. Otherwise, download or clone the repository to your computer.

### Step 2: Create the MySQL Database

Open a terminal and connect to MySQL:

```bash
mysql -u root -p
```

Enter your root password when prompted. Then create the database:

```sql
CREATE DATABASE doctore;
```

> **Why "doctore"?** That's the name configured in the project's database connection settings. You can change it if you prefer (see Step 4).

### Step 3: Create the Environment File

The server needs to know how to connect to your database. Create a file called `.env` in the `server/` folder:

```
server/.env
```

Add these contents (replace `your_password` with your actual MySQL root password):

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=doctore
PORT=2001
```

**What does each line mean?**
- `DB_HOST=localhost` — The database is on your own computer
- `DB_PORT=3306` — MySQL's default port number
- `DB_USER=root` — The MySQL username
- `DB_PASSWORD=your_password` — Your MySQL password
- `DB_NAME=doctore` — Which database to use
- `PORT=2001` — Which port the API server runs on

### Step 4: Install Server Dependencies & Populate the Database

Open a terminal, navigate to the `server/` folder, install the required packages, and run migrations + seeds:

```bash
cd server
npm install
npm run migrate
npm run seed
```

- `npm install` reads `package.json` and downloads all the libraries the server needs (Express, Knex, MySQL driver, etc.) into a `node_modules/` folder.
- `npm run migrate` creates all 19 database tables using the Knex migrations (6 migration files).
- `npm run seed` fills the tables with realistic demo data about telecom vendors like AT&T, Verizon, Lumen, Comcast, and more.

To tear down and rebuild at any time:
```bash
npm run migrate:rollback   # Drop all tables
npm run migrate            # Re-create tables
npm run seed               # Re-insert demo data
```

> **Note:** The `seed.sql` and `seed_extra.sql` files in the server folder are **deprecated** — they use an old column naming scheme. Always use the Knex approach above.

### Step 5: Install Client Dependencies

Open a **new** terminal (or navigate to the `client/` folder):

```bash
cd client
npm install
```

This downloads all the front-end libraries (React, Axios, etc.).

### Step 6: Start the Server

In the `server/` folder:

```bash
npm run dev
```

You should see:
```
MySQL connected successfully
TEMS API server running on port 2001
```

If you see a MySQL connection error, double-check your `.env` file credentials.

### Step 7: Start the Client

In a **separate** terminal, in the `client/` folder:

```bash
npm run dev
```

You should see:
```
  VITE v5.x.x  ready in xxx ms

  ➜  Local:   http://localhost:2000/
```

### Step 8: Open the App

Open your web browser and go to: **http://localhost:2000**

You should see the TEMS dashboard with live data!

---

## 8. How the Application Works (Architecture)

### The Big Picture

TEMS uses a **client-server architecture** — a very common pattern in web development:

1. **The Client (Front-End)** runs in your web browser. It's responsible for:
   - Displaying the user interface (buttons, tables, forms)
   - Handling user interactions (clicking, typing, navigating)
   - Sending requests to the server when it needs data

2. **The Server (Back-End)** runs on your computer as a separate process. It's responsible for:
   - Receiving requests from the client
   - Querying the database for data
   - Sending data back to the client as JSON

3. **The Database** stores all persistent data in structured tables.

### Request-Response Cycle

Here's what happens when you open the Dashboard page:

```
1. You type http://localhost:2000 in your browser
   ↓
2. Vite serves index.html + your React code to the browser
   ↓
3. React renders the Dashboard component
   ↓
4. Dashboard calls getDashboard() from api.js
   ↓
5. Axios sends GET http://localhost:2000/api/dashboard
   ↓
6. Vite's proxy forwards this to http://localhost:2001/api/dashboard
   ↓
7. Express receives the request and runs the dashboard handler in server.js
   ↓
8. The handler sends 14 SQL queries to MySQL
   ↓
9. MySQL returns the results
   ↓
10. The handler packages results into a JSON object and sends it back
    ↓
11. Axios receives the JSON response
    ↓
12. React updates the page with the data (cards, tables fill in)
```

### What Is a "Proxy"?

In development, the client runs on `http://localhost:3000` and the server on `http://localhost:5000`. Normally, the browser would block requests from one to the other (for security). The **proxy** in `vite.config.js` solves this:

```javascript
proxy: {
  '/api': {
    target: 'http://localhost:5000',
    changeOrigin: true,
  },
},
```

This tells Vite: "When the browser requests any URL starting with `/api`, secretly forward it to `http://localhost:5000`." The browser doesn't even know it's talking to a different server.

### Single-Page Application (SPA)

TEMS is a **Single-Page Application**. This means:
- The browser loads ONE HTML page (`index.html`) at startup
- When you navigate (e.g., from Dashboard to Accounts), React **swaps components** — it does NOT load a new HTML page from the server
- This makes navigation feel instant and smooth
- The URL bar still changes (thanks to React Router) so you can bookmark pages

---

## 9. Database Design (Data Model)

The database has **29 tables** across 13 migration files. Here's every table, every column, and what it stores.

> **Naming Convention:** Every table's primary key is named `{table_name}_id` (e.g., `accounts_id`, `circuits_id`). Foreign keys match the referenced table's PK name (e.g., `accounts_id` in `contracts` refers to `accounts.accounts_id`). The one special case is the `circuits` table where the vendor's circuit identifier is stored in `circuit_number` (to avoid collision with the PK `circuits_id`).

### Entity Relationship Diagram

```
┌──────────────┐
│   accounts   │──── 1 account has MANY contracts
│              │──── 1 account has MANY circuits
│              │──── 1 account has MANY orders
│              │──── 1 account has MANY invoices
│              │──── 1 account has MANY cost_savings
│              │──── 1 account has MANY disputes
└──────┬───────┘
       │
       ▼
┌──────────────┐       ┌──────────────────┐
│  contracts   │───────│  contract_rates  │  1 contract has MANY contract_rates
│              │       │                  │  1 contract_rate links to 1 usoc_code
└──────┬───────┘       └────────┬─────────┘
       │                        │
       ▼                        ▼
┌──────────────┐       ┌──────────────────┐
│   circuits   │       │   usoc_codes     │  Standalone USOC code catalog
│              │       │                  │  (linked via contract_rates and line_items)
└──────┬───────┘       └──────────────────┘
       │
       ▼
┌──────────────┐       ┌──────────────┐
│   orders     │<─────>│   circuits   │   (circuits and orders link to each other)
└──────────────┘       └──────────────┘

┌──────────────┐
│   invoices   │──── 1 invoice has MANY line_items
│              │──── 1 invoice has MANY disputes
└──────┬───────┘
       │
       ▼
┌──────────────┐
│  line_items  │──── 1 line_item has MANY allocations
│              │──── 1 line_item can link to 1 circuit
│              │──── 1 line_item can link to 1 usoc_code
│              │──── 1 line_item can have MANY disputes
└──────┬───────┘
       │
       ▼
┌──────────────┐       ┌──────────────┐       ┌──────────────┐
│ allocations  │       │ cost_savings │       │   disputes   │
│              │       │              │       │              │
└──────────────┘       └──────────────┘       └──────────────┘

┌──────────────┐
│    users     │──── 1 user has 1 role (FK → roles)
│              │──── 1 user has MANY notifications
│              │──── 1 user has MANY user_favorites
│              │──── 1 user has MANY audit_log entries
│              │──── 1 user can be assigned MANY invoices
│              │──── 1 user can be assigned MANY orders
│              │──── 1 user can be assigned MANY tickets
└──────┬───────┘
       │
       ▼
┌──────────────┐       ┌──────────────────┐
│    roles     │───────│ role_permissions  │──── links to permissions
└──────────────┘       └──────────────────┘

┌──────────────┐       ┌──────────────────────────────┐
│   tickets    │───────│    ticket_comments            │  1 ticket has MANY comments
└──────────────┘       └──────────────────────────────┘

┌─────────────────────────┐       ┌────────────────────────────┐
│ invoice_reader_templates│───────│  invoice_reader_uploads     │
└─────────────────────────┘       └────────────────────────────┘

Standalone tables: notes (polymorphic), locations, field_catalog,
vendor_remit, spend_categories, announcements, saved_reports
```

### Table: `accounts`

Stores telecom vendor information.

| Column | Type | Description | Example |
|---|---|---|---|
| `accounts_id` | INT (auto) | Primary key, assigned automatically | `1` |
| `name` | VARCHAR(120) | Vendor name | `"AT&T"` |
| `account_number` | VARCHAR(80) | Your account number with this vendor | `"ATT-8872341"` |
| `vendor_type` | VARCHAR(60) | Category of vendor | `"Telecom"`, `"ISP"`, `"Wireless"` |
| `contact_name` | VARCHAR(120) | Primary billing contact name | `"John Smith"` |
| `contact_email` | VARCHAR(120) | Vendor's billing contact email | `"billing@att.com"` |
| `contact_phone` | VARCHAR(40) | Vendor's phone number | `"800-288-2020"` |
| `status` | VARCHAR(30) | Whether this account is active | `"Active"` or `"Inactive"` |
| `created_at` | DATE | When this account was added | `"2023-01-15"` |

### Table: `contracts`

Stores contract agreements between your company and vendors.

| Column | Type | Description | Example |
|---|---|---|---|
| `contracts_id` | INT (auto) | Primary key | `1` |
| `accounts_id` | INT | Which vendor this contract is with (FK → `accounts.accounts_id`) | `1` (= AT&T) |
| `name` | VARCHAR(160) | Contract name/title | `"AT&T MPLS Master Agreement"` |
| `contract_number` | VARCHAR(80) | Vendor's contract reference number | `"ATT-MPLS-2023"` |
| `start_date` | DATE | When the contract begins | `"2023-01-01"` |
| `end_date` | DATE | When the contract expires | `"2026-12-31"` |
| `contracted_rate` | DECIMAL(12,2) | Agreed price | `1850.00` |
| `rate_unit` | VARCHAR(60) | What the rate covers | `"per circuit/month"` |
| `term_months` | INT | Contract duration in months | `48` |
| `status` | VARCHAR(30) | Current state | `"Active"`, `"Expired"`, `"Terminated"` |
| `auto_renew` | TINYINT(1) | Does it auto-renew? (0=No, 1=Yes) | `1` |
| `minimum_spend` | DECIMAL(12,2) (nullable) | Minimum contractual spend commitment | `50000.00` |
| `etf_amount` | DECIMAL(12,2) (nullable) | Early Termination Fee if contract is broken | `25000.00` |
| `commitment_type` | VARCHAR(60) (nullable) | Type of commitment | `"Volume"`, `"Minimum Spend"`, `"Revenue"`, `"None"` |

### Table: `circuits`

Stores individual telecom circuits/services.

| Column | Type | Description | Example |
|---|---|---|---|
| `circuits_id` | INT (auto) | Primary key (internal) | `1` |
| `accounts_id` | INT | Which vendor provides this circuit (FK → `accounts`) | `1` (= AT&T) |
| `contracts_id` | INT | Which contract governs this circuit (FK → `contracts`) | `1` |
| `orders_id` | INT (nullable) | Which order installed this circuit (FK → `orders`) | `1` |
| `circuit_number` | VARCHAR(100) | Vendor's circuit identifier (business-facing) | `"ATT/MPLS/00112233"` |
| `type` | VARCHAR(60) | Type of circuit | `"MPLS"`, `"DIA"`, `"SD-WAN"` |
| `bandwidth` | VARCHAR(40) | Speed/capacity | `"100 Mbps"`, `"1 Gbps"` |
| `location` | VARCHAR(200) | Physical location | `"Chicago, IL - HQ"` |
| `contracted_rate` | DECIMAL(12,2) | Monthly rate per contract | `1850.00` |
| `status` | VARCHAR(40) | Current state | `"Active"`, `"Pending"`, `"Disconnected"` |
| `install_date` | DATE (nullable) | When the circuit was installed | `"2023-02-10"` |
| `disconnect_date` | DATE (nullable) | When the circuit was disconnected | `null` (still active) |

### Table: `orders`

Stores service orders (install, modify, disconnect).

| Column | Type | Description | Example |
|---|---|---|---|
| `orders_id` | INT (auto) | Primary key | `1` |
| `accounts_id` | INT | Which vendor the order is with (FK → `accounts`) | `1` |
| `contracts_id` | INT | Under which contract (FK → `contracts`) | `1` |
| `circuits_id` | INT (nullable) | Which circuit this order relates to (FK → `circuits`) | `1` |
| `order_number` | VARCHAR(80) | Vendor's order tracking number | `"ORD-2023-0001"` |
| `description` | VARCHAR(255) | What the order is for | `"MPLS Circuit - Chicago HQ"` |
| `contracted_rate` | DECIMAL(12,2) | Rate for the ordered service | `1850.00` |
| `order_date` | DATE | When the order was placed | `"2023-01-20"` |
| `due_date` | DATE | Expected completion date | `"2023-02-10"` |
| `status` | VARCHAR(40) | Current state | `"In Progress"`, `"Completed"`, `"Cancelled"` |
| `notes` | TEXT | Additional information | `"Standard install, no issues"` |

### Table: `invoices`

Stores monthly vendor bills.

| Column | Type | Description | Example |
|---|---|---|---|
| `invoices_id` | INT (auto) | Primary key | `1` |
| `accounts_id` | INT | Which vendor sent this invoice (FK → `accounts`) | `1` |
| `invoice_number` | VARCHAR(80) | Vendor's invoice reference number | `"ATT-INV-20260101"` |
| `invoice_date` | DATE | Date the invoice was issued | `"2026-01-01"` |
| `due_date` | DATE | Payment deadline | `"2026-01-31"` |
| `period_start` | DATE | Start of billing period | `"2026-01-01"` |
| `period_end` | DATE | End of billing period | `"2026-01-31"` |
| `total_amount` | DECIMAL(12,2) | Total invoice amount | `3890.00` |
| `status` | VARCHAR(40) | Payment state | `"Open"`, `"Paid"`, `"Disputed"`, `"Void"` |
| `payment_date` | DATE (nullable) | When it was paid | `"2026-01-28"` or `null` |

### Table: `line_items`

Stores individual charges on an invoice.

| Column | Type | Description | Example |
|---|---|---|---|
| `line_items_id` | INT (auto) | Primary key | `1` |
| `invoices_id` | INT | Which invoice this charge belongs to (FK → `invoices`) | `1` |
| `circuits_id` | INT (nullable) | Which circuit this charge is for (FK → `circuits`) | `1` (or `null` for taxes) |
| `description` | VARCHAR(255) | Description of the charge | `"MPLS MRC - Chicago HQ"` |
| `charge_type` | VARCHAR(60) | Category | `"MRC"` (Monthly Recurring), `"Tax/Surcharge"` |
| `amount` | DECIMAL(12,2) | What was actually billed | `1850.00` |
| `contracted_rate` | DECIMAL(12,2) (nullable) | What should have been billed | `1850.00` |
| `variance` | DECIMAL(12,2) (nullable) | Difference (amount - contracted_rate) | `0.00` (no overcharge) |
| `period_start` | DATE | Charge period start | `"2026-01-01"` |
| `period_end` | DATE | Charge period end | `"2026-01-31"` |
| `usoc_codes_id` | INT (nullable) | Which USOC code this charge maps to (FK → `usoc_codes`) | `3` |
| `mrc_amount` | DECIMAL(12,2) (nullable) | Monthly Recurring Charge portion | `1850.00` |
| `nrc_amount` | DECIMAL(12,2) (nullable) | Non-Recurring Charge portion | `0.00` |
| `audit_status` | VARCHAR(40) (nullable) | Auto-computed billing audit result | `"Validated"`, `"Variance"`, `"Pending"` |

> **Important:** When `variance` is positive (e.g., `230.00`), it means you were **overcharged** by that amount. When it's `0.00`, the billing matches the contract. Tax/surcharge line items have `null` variance because they aren't tied to contracted rates.

> **Audit Status:** When a line item is created or updated, the server automatically computes `audit_status`: **Validated** if the billed amount matches the contracted rate (within $0.005), **Variance** if it differs, **Pending** if no contracted rate is available for comparison.

### Table: `allocations`

Stores how charges are split across departments.

| Column | Type | Description | Example |
|---|---|---|---|
| `allocations_id` | INT (auto) | Primary key | `1` |
| `line_items_id` | INT | Which line item this allocation is for (FK → `line_items`) | `1` |
| `cost_center` | VARCHAR(120) | Department's cost center code | `"CC-100 - IT Infrastructure"` |
| `department` | VARCHAR(120) | Department name | `"Information Technology"` |
| `percentage` | DECIMAL(5,2) | What percentage this department pays | `100.00` |
| `allocated_amount` | DECIMAL(12,2) | Dollar amount allocated | `1850.00` |
| `notes` | TEXT | Additional info | `"Full allocation to IT"` |

### Table: `cost_savings`

Tracks money-saving opportunities.

| Column | Type | Description | Example |
|---|---|---|---|
| `cost_savings_id` | INT (auto) | Primary key | `1` |
| `accounts_id` | INT | Which vendor the savings relate to (FK → `accounts`) | `1` |
| `circuits_id` | INT (nullable) | Which specific circuit (if applicable) (FK → `circuits`) | `2` |
| `line_items_id` | INT (nullable) | Which line item flagged the issue (FK → `line_items`) | `5` |
| `invoices_id` | INT (nullable) | Which invoice contains the overcharge (FK → `invoices`) | `2` |
| `category` | VARCHAR(80) | Type of savings opportunity | `"Billing Error"`, `"Contract Optimization"` |
| `description` | TEXT | Detailed explanation | `"AT&T Dallas MPLS overbilled $230..."` |
| `identified_date` | DATE | When the opportunity was found | `"2026-02-10"` |
| `status` | VARCHAR(40) | Progress state | `"Identified"`, `"In Progress"`, `"Resolved"` |
| `projected_savings` | DECIMAL(12,2) | Expected savings amount | `230.00` |
| `realized_savings` | DECIMAL(12,2) | Actual savings recovered so far | `0.00` |
| `notes` | TEXT | Follow-up notes | `"Credit request submitted 2/10/26"` |

### Table: `usoc_codes`

Stores Universal Service Order Codes — standardized telecom billing codes.

| Column | Type | Description | Example |
|---|---|---|---|
| `usoc_codes_id` | INT (auto) | Primary key | `1` |
| `usoc_code` | VARCHAR(20) | The USOC code itself (unique) | `"1LN"`, `"MPBXS"` |
| `description` | VARCHAR(255) | Human-readable description | `"Basic Local Line"` |
| `category` | VARCHAR(80) (nullable) | Service category | `"Access"`, `"Transport"`, `"Feature"`, `"Equipment"`, `"Surcharge"` |
| `sub_category` | VARCHAR(80) (nullable) | Sub-category for finer grouping | `"Voice"`, `"Data"` |
| `default_mrc` | DECIMAL(12,2) | Default monthly recurring charge | `45.00` |
| `default_nrc` | DECIMAL(12,2) | Default non-recurring charge | `150.00` |
| `unit` | VARCHAR(60) (nullable) | What the rate covers | `"per circuit"`, `"per line"`, `"per GB"` |
| `status` | VARCHAR(30) | Whether this code is active | `"Active"` or `"Inactive"` |

### Table: `contract_rates`

Links USOC codes to specific contracts with negotiated MRC/NRC rates.

| Column | Type | Description | Example |
|---|---|---|---|
| `contract_rates_id` | INT (auto) | Primary key | `1` |
| `contracts_id` | INT | Which contract this rate belongs to (FK → `contracts`) | `1` |
| `usoc_codes_id` | INT | Which USOC code (FK → `usoc_codes`) | `3` |
| `mrc` | DECIMAL(12,2) | Contracted monthly recurring charge | `1850.00` |
| `nrc` | DECIMAL(12,2) | Contracted non-recurring charge | `0.00` |
| `effective_date` | DATE (nullable) | When this rate becomes active | `"2023-01-01"` |
| `expiration_date` | DATE (nullable) | When this rate expires | `"2026-12-31"` |
| `notes` | TEXT (nullable) | Additional notes | `"Negotiated 15% discount"` |

> **Unique Constraint:** The combination of (`contracts_id`, `usoc_codes_id`, `effective_date`) must be unique — one contract can have only one rate per USOC code per effective date.

### Table: `disputes`

Tracks billing disputes filed with telecom vendors.

| Column | Type | Description | Example |
|---|---|---|---|
| `disputes_id` | INT (auto) | Primary key | `1` |
| `line_items_id` | INT (nullable) | Which line item is disputed (FK → `line_items`) | `5` |
| `invoices_id` | INT | Which invoice the dispute is on (FK → `invoices`) | `2` |
| `accounts_id` | INT | Which vendor the dispute is with (FK → `accounts`) | `1` |
| `dispute_type` | VARCHAR(50) | Category of dispute | `"Overcharge"`, `"Missing Credit"`, `"Wrong Rate"`, `"Duplicate Charge"`, `"Service Issue"` |
| `amount` | DECIMAL(12,2) | Disputed dollar amount | `230.00` |
| `status` | VARCHAR(30) | Current dispute state | `"Open"`, `"Under Review"`, `"Escalated"`, `"Credited"`, `"Denied"`, `"Closed"` |
| `filed_date` | DATE | When the dispute was filed | `"2026-02-15"` |
| `resolved_date` | DATE (nullable) | When the dispute was resolved | `null` (still open) |
| `resolution_notes` | TEXT (nullable) | How it was resolved | `"Vendor issued full credit"` |
| `credit_amount` | DECIMAL(12,2) (nullable) | Credit received from vendor | `230.00` |
| `reference_number` | VARCHAR(100) (nullable) | Vendor's dispute tracking number | `"DISP-ATT-2026-001"` |
| `notes` | TEXT (nullable) | Additional notes | `"Escalated to account manager"` |
| `created_at` | TIMESTAMP | When this record was created | Auto-generated |
| `updated_at` | TIMESTAMP | When this record was last updated | Auto-generated |

### Table: `roles`

Stores user roles for role-based access control (RBAC).

| Column | Type | Description | Example |
|---|---|---|---|
| `roles_id` | INT (auto) | Primary key | `1` |
| `name` | VARCHAR(60) | Role name (unique) | `"Admin"`, `"Standard"` |
| `description` | VARCHAR(255) (nullable) | Role description | `"Full system access"` |
| `created_at` | TIMESTAMP | When created | Auto-generated |

### Table: `permissions`

Stores granular permissions that can be assigned to roles.

| Column | Type | Description | Example |
|---|---|---|---|
| `permissions_id` | INT (auto) | Primary key | `1` |
| `resource` | VARCHAR(80) | Entity/area the permission covers | `"accounts"`, `"invoices"` |
| `action` | VARCHAR(40) | Allowed action | `"read"`, `"write"`, `"delete"` |
| `description` | VARCHAR(255) (nullable) | Human-readable description | `"Can view accounts"` |
| `created_at` | TIMESTAMP | When created | Auto-generated |

> **Unique Constraint:** The combination of (`resource`, `action`) must be unique.

### Table: `role_permissions`

Join table linking roles to permissions (many-to-many).

| Column | Type | Description | Example |
|---|---|---|---|
| `role_permissions_id` | INT (auto) | Primary key | `1` |
| `roles_id` | INT UNSIGNED | Which role (FK → `roles`) | `1` |
| `permissions_id` | INT UNSIGNED | Which permission (FK → `permissions`) | `3` |

> **Unique Constraint:** The combination of (`roles_id`, `permissions_id`) must be unique. Both FKs cascade on delete.

### Table: `users`

Stores application user accounts with SSO-ready fields.

| Column | Type | Description | Example |
|---|---|---|---|
| `users_id` | INT (auto) | Primary key | `1` |
| `email` | VARCHAR(255) | User email (unique) | `"admin@company.com"` |
| `display_name` | VARCHAR(120) | Full display name | `"John Smith"` |
| `sso_subject` | VARCHAR(255) (nullable) | SSO subject identifier (indexed) | `"00u1a2b3c4d5e6f"` |
| `sso_provider` | VARCHAR(80) (nullable) | SSO identity provider | `"okta"`, `"azure-ad"` |
| `roles_id` | INT UNSIGNED | Assigned role (FK → `roles`) | `1` |
| `status` | VARCHAR(30) | Account status (indexed) | `"Active"`, `"Inactive"`, `"Suspended"` |
| `avatar_url` | VARCHAR(500) (nullable) | Profile picture URL | `null` |
| `last_login` | TIMESTAMP (nullable) | Last login timestamp | `"2026-03-01 14:30:00"` |
| `created_at` | TIMESTAMP | When created | Auto-generated |
| `updated_at` | TIMESTAMP | When last updated | Auto-generated |

### Table: `audit_log`

Records all create, update, and delete operations across the system.

| Column | Type | Description | Example |
|---|---|---|---|
| `audit_log_id` | INT (auto) | Primary key | `1` |
| `users_id` | INT UNSIGNED (nullable) | Who performed the action (FK → `users`) | `1` |
| `action` | VARCHAR(20) | Operation type | `"CREATE"`, `"UPDATE"`, `"DELETE"` |
| `resource` | VARCHAR(80) | Which entity was affected (indexed) | `"accounts"`, `"invoices"` |
| `resource_id` | INT UNSIGNED (nullable) | ID of the affected record | `5` |
| `old_values` | JSON (nullable) | Previous state (for updates) | `{"status":"Open"}` |
| `new_values` | JSON (nullable) | New state | `{"status":"Paid"}` |
| `ip_address` | VARCHAR(45) (nullable) | Client IP address | `"192.168.1.10"` |
| `created_at` | TIMESTAMP | When the action occurred (indexed) | Auto-generated |

### Table: `invoice_reader_templates`

Stores saved column-mapping templates for the Invoice Reader.

| Column | Type | Description | Example |
|---|---|---|---|
| `invoice_reader_templates_id` | INT (auto) | Primary key | `1` |
| `accounts_id` | INT UNSIGNED (nullable) | Linked vendor (FK → `accounts`) | `1` |
| `name` | VARCHAR(160) | Template name | `"AT&T Monthly Excel"` |
| `format_type` | VARCHAR(20) | File format (indexed) | `"Excel"`, `"EDI"`, `"PDF"` |
| `config` | TEXT | Column mapping JSON | `{"columnMappings":{...}}` |
| `status` | VARCHAR(30) | Active / Inactive (indexed) | `"Active"` |
| `created_at` | TIMESTAMP | When created | Auto-generated |
| `updated_at` | DATE (nullable) | When last updated | Auto-generated |

### Table: `invoice_reader_uploads`

Tracks every invoice import run with row counts and error details.

| Column | Type | Description | Example |
|---|---|---|---|
| `invoice_reader_uploads_id` | INT (auto) | Primary key | `1` |
| `invoice_reader_templates_id` | INT UNSIGNED (nullable) | Template used (FK → `invoice_reader_templates`) | `1` |
| `accounts_id` | INT UNSIGNED (nullable) | Linked vendor (FK → `accounts`) | `1` |
| `file_name` | VARCHAR(255) | Uploaded file name | `"ATT_Jan2026.xlsx"` |
| `format_type` | VARCHAR(20) | Detected format | `"Excel"` |
| `status` | VARCHAR(30) | Import status | `"Pending"`, `"Completed"`, `"Failed"` |
| `total_rows` | INT (nullable) | Total rows processed | `150` |
| `inserted_invoices` | INT (nullable) | Invoices created | `3` |
| `inserted_line_items` | INT (nullable) | Line items created | `142` |
| `error_count` | INT (nullable) | Errors encountered | `0` |
| `errors` | TEXT (nullable) | Error details | `null` |
| `created_at` | TIMESTAMP | When the import started | Auto-generated |
| `completed_at` | TIMESTAMP (nullable) | When the import finished | Auto-generated |

### Table: `tickets`

Stores user-created support/work tickets linked to any entity.

| Column | Type | Description | Example |
|---|---|---|---|
| `tickets_id` | INT (auto) | Primary key | `1` |
| `ticket_number` | VARCHAR(30) | Unique ticket reference (unique) | `"TKT-00001"` |
| `title` | VARCHAR(255) | Ticket subject | `"MPLS circuit billing discrepancy"` |
| `description` | TEXT (nullable) | Detailed description | `"Invoice shows $200 over contract..."` |
| `category` | VARCHAR(80) | Ticket category | `"Billing"`, `"Provisioning"`, `"Other"` |
| `priority` | VARCHAR(20) | Priority level (indexed) | `"Low"`, `"Medium"`, `"High"`, `"Urgent"` |
| `status` | VARCHAR(40) | Current status (indexed) | `"Open"`, `"In Progress"`, `"Resolved"`, `"Closed"` |
| `source_entity_type` | VARCHAR(50) (nullable) | Linked entity type | `"invoice"`, `"circuit"`, `"order"` |
| `source_entity_id` | INT UNSIGNED (nullable) | Linked entity ID | `5` |
| `source_label` | VARCHAR(255) (nullable) | Display label for linked entity | `"INV-ATT-20260101"` |
| `assigned_users_id` | INT UNSIGNED (nullable) | Assigned user (FK → `users`) | `2` |
| `created_by` | VARCHAR(150) (nullable, indexed) | Who created the ticket | `"jsmith"` |
| `due_date` | DATE (nullable) | Due date | `"2026-03-15"` |
| `resolved_date` | DATE (nullable) | When resolved | `null` |
| `resolution` | TEXT (nullable) | Resolution details | `"Credit issued by vendor"` |
| `tags` | VARCHAR(500) (nullable) | Comma-separated tags | `"billing,urgent"` |
| `created_at` | TIMESTAMP | When created | Auto-generated |
| `updated_at` | TIMESTAMP | When last updated | Auto-generated |

### Table: `ticket_comments`

Stores comments/activity on tickets.

| Column | Type | Description | Example |
|---|---|---|---|
| `ticket_comments_id` | INT (auto) | Primary key | `1` |
| `tickets_id` | INT UNSIGNED | Which ticket (FK → `tickets`, CASCADE delete) | `1` |
| `author` | VARCHAR(150) | Who wrote the comment | `"jsmith"` |
| `content` | TEXT | Comment body | `"Vendor confirmed credit pending"` |
| `comment_type` | VARCHAR(30) | Comment classification | `"comment"`, `"status_change"`, `"system"` |
| `created_at` | TIMESTAMP | When created | Auto-generated |

### Table: `saved_reports`

Stores user-created report configurations.

| Column | Type | Description | Example |
|---|---|---|---|
| `saved_reports_id` | INT (auto) | Primary key | `1` |
| `name` | VARCHAR(200) | Report name | `"Monthly Spend by Vendor"` |
| `description` | TEXT (nullable) | Report description | `"Breakdown of monthly charges..."` |
| `config` | JSON | Report configuration (tables, columns, filters, grouping) | `{"tables":["invoices"],...}` |
| `created_by` | INT UNSIGNED (nullable) | Who created the report (FK → `users`) | `1` |
| `created_at` | TIMESTAMP | When created | Auto-generated |
| `updated_at` | TIMESTAMP | When last updated | Auto-generated |

### Table: `notifications`

Stores user-targeted notifications (e.g. invoice assignment changes).

| Column | Type | Description | Example |
|---|---|---|---|
| `notifications_id` | INT (auto) | Primary key | `1` |
| `users_id` | INT UNSIGNED | Target user (FK → `users`, CASCADE delete) | `2` |
| `type` | VARCHAR(50) | Visual style | `"info"`, `"warning"`, `"danger"` |
| `title` | VARCHAR(200) | Notification heading | `"Invoice Assigned"` |
| `message` | TEXT | Notification body | `"Invoice ATT-INV-20260101 was assigned to you"` |
| `entity_type` | VARCHAR(50) (nullable) | Linked entity type | `"invoice"`, `"order"` |
| `entity_id` | INT UNSIGNED (nullable) | Linked entity ID | `5` |
| `is_read` | BOOLEAN | Read status | `false` |
| `created_at` | TIMESTAMP | When created | Auto-generated |

> **Index:** Composite index on (`users_id`, `is_read`) for fast unread notification queries.

### Relationships Between Tables (Foreign Keys)

Foreign keys enforce data integrity — they make sure you can't, for example, create a circuit that references a non-existent account.

| From Table | Column | References | Meaning |
|---|---|---|---|
| `contracts` | `accounts_id` | `accounts.accounts_id` | Every contract belongs to one account |
| `orders` | `accounts_id` | `accounts.accounts_id` | Every order belongs to one account |
| `orders` | `contracts_id` | `contracts.contracts_id` | Every order is under one contract |
| `orders` | `circuits_id` | `circuits.circuits_id` | An order may relate to one circuit |
| `circuits` | `accounts_id` | `accounts.accounts_id` | Every circuit belongs to one account |
| `circuits` | `contracts_id` | `contracts.contracts_id` | Every circuit is under one contract |
| `circuits` | `orders_id` | `orders.orders_id` | A circuit may be linked to one order |
| `invoices` | `accounts_id` | `accounts.accounts_id` | Every invoice is from one account |
| `line_items` | `invoices_id` | `invoices.invoices_id` | Every line item belongs to one invoice |
| `line_items` | `circuits_id` | `circuits.circuits_id` | A line item may reference one circuit |
| `allocations` | `line_items_id` | `line_items.line_items_id` | Every allocation is for one line item |
| `cost_savings` | `accounts_id` | `accounts.accounts_id` | Every savings record belongs to an account |
| `cost_savings` | `circuits_id` | `circuits.circuits_id` | A savings record may reference a circuit |
| `cost_savings` | `line_items_id` | `line_items.line_items_id` | May reference the overcharged line item |
| `cost_savings` | `invoices_id` | `invoices.invoices_id` | May reference the invoice with the error |
| `contract_rates` | `contracts_id` | `contracts.contracts_id` | Every contract rate belongs to one contract (CASCADE delete) |
| `contract_rates` | `usoc_codes_id` | `usoc_codes.usoc_codes_id` | Every contract rate links to one USOC code (RESTRICT delete) |
| `line_items` | `usoc_codes_id` | `usoc_codes.usoc_codes_id` | A line item may reference one USOC code (SET NULL on delete) |
| `disputes` | `line_items_id` | `line_items.line_items_id` | A dispute may reference one line item (SET NULL on delete) |
| `disputes` | `invoices_id` | `invoices.invoices_id` | Every dispute belongs to one invoice (CASCADE delete) |
| `disputes` | `accounts_id` | `accounts.accounts_id` | Every dispute belongs to one account (CASCADE delete) |
| `vendor_remit` | `accounts_id` | `accounts.accounts_id` | Every remit record belongs to one account |
| `announcements` | `created_by` | `users.users_id` | Announcement author |
| `users` | `roles_id` | `roles.roles_id` | Every user has one role (RESTRICT delete) |
| `role_permissions` | `roles_id` | `roles.roles_id` | Links role to permission (CASCADE delete) |
| `role_permissions` | `permissions_id` | `permissions.permissions_id` | Links permission to role (CASCADE delete) |
| `audit_log` | `users_id` | `users.users_id` | Who performed the action (SET NULL on delete) |
| `user_favorites` | `users_id` | `users.users_id` | Favorite belongs to one user |
| `invoice_reader_templates` | `accounts_id` | `accounts.accounts_id` | Template linked to one vendor (SET NULL on delete) |
| `invoice_reader_uploads` | `invoice_reader_templates_id` | `invoice_reader_templates.invoice_reader_templates_id` | Upload used one template (SET NULL on delete) |
| `invoice_reader_uploads` | `accounts_id` | `accounts.accounts_id` | Upload linked to one vendor (SET NULL on delete) |
| `invoices` | `assigned_users_id` | `users.users_id` | Invoice assigned to one user (SET NULL on delete) |
| `orders` | `assigned_users_id` | `users.users_id` | Order assigned to one user (SET NULL on delete) |
| `tickets` | `assigned_users_id` | `users.users_id` | Ticket assigned to one user (SET NULL on delete) |
| `ticket_comments` | `tickets_id` | `tickets.tickets_id` | Comment belongs to one ticket (CASCADE delete) |
| `saved_reports` | `created_by` | `users.users_id` | Report created by one user (SET NULL on delete) |
| `notifications` | `users_id` | `users.users_id` | Notification targets one user (CASCADE delete) |

### Table: `notes`

Polymorphic notes attached to any entity (accounts, contracts, circuits, invoices, etc.).

| Column | Type | Description | Example |
|---|---|---|---|
| `notes_id` | INT (auto) | Primary key | `1` |
| `entity_type` | VARCHAR(50) | Which table the note belongs to | `"accounts"`, `"invoices"`, `"circuits"` |
| `entity_id` | INT UNSIGNED | Primary key of the linked record | `1` |
| `content` | TEXT | Note body | `"Called billing, credit pending"` |
| `author` | VARCHAR(150) | Who wrote the note | `"jsmith"` |
| `note_type` | VARCHAR(50) | Classification | `"note"`, `"call"`, `"email"`, `"escalation"` |
| `created_at` | TIMESTAMP | When created | Auto-generated |

### Table: `user_favorites`

Saved search filters / quick-access links per user.

| Column | Type | Description | Example |
|---|---|---|---|
| `user_favorites_id` | INT (auto) | Primary key | `1` |
| `users_id` | INT UNSIGNED | Which user (FK → `users`) | `1` |
| `name` | VARCHAR(120) | Friendly label | `"AT&T Open Disputes"` |
| `path` | VARCHAR(255) | Front-end route | `"/disputes"` |
| `filters` | JSON | Saved filter state | `{"status":"Open","accounts_id":1}` |
| `filter_summary` | VARCHAR(500) | Human-readable filter summary | `"Status: Open • Vendor: AT&T"` |
| `icon` | VARCHAR(60) | Lucide icon name | `"Star"` |
| `created_at` | TIMESTAMP | When created | Auto-generated |

### Table: `locations`

Physical site locations that circuits can be installed at.

| Column | Type | Description | Example |
|---|---|---|---|
| `locations_id` | INT (auto) | Primary key | `1` |
| `name` | VARCHAR(120) | Site name | `"Chicago HQ"` |
| `site_code` | VARCHAR(40) | Internal site code | `"CHI-01"` |
| `site_type` | VARCHAR(60) | Type of site | `"Office"`, `"Data Center"`, `"Branch"` |
| `address` | TEXT | Street address | `"123 N Wacker Dr"` |
| `city` | VARCHAR(80) | City | `"Chicago"` |
| `state` | VARCHAR(40) | State/province | `"IL"` |
| `zip` | VARCHAR(20) | Postal code | `"60606"` |
| `country` | VARCHAR(60) | Country (default USA) | `"USA"` |
| `contact_name` | VARCHAR(120) | On-site contact | `"Jane Doe"` |
| `contact_phone` | VARCHAR(40) | On-site phone | `"312-555-1234"` |
| `contact_email` | VARCHAR(120) | On-site email | `"jane@company.com"` |
| `status` | VARCHAR(30) | Active / Inactive | `"Active"` |
| `notes` | TEXT | Additional info | — |
| `created_at` | TIMESTAMP | When created | Auto-generated |

### Table: `field_catalog`

Configurable lookup values for dropdown fields across the application.

| Column | Type | Description | Example |
|---|---|---|---|
| `field_catalog_id` | INT (auto) | Primary key | `1` |
| `category` | VARCHAR(80) | Which field this value applies to | `"circuit_type"`, `"vendor_type"` |
| `label` | VARCHAR(120) | Display text | `"MPLS"` |
| `value` | VARCHAR(200) | Stored value | `"MPLS"` |
| `description` | TEXT | Admin notes | `"Multiprotocol Label Switching"` |
| `sort_order` | INT | Display order | `10` |
| `is_active` | BOOLEAN | Whether to show in dropdowns | `true` |
| `created_at` | TIMESTAMP | When created | Auto-generated |

### Table: `vendor_remit`

ACH / payment remittance details for each vendor. **Contains sensitive financial data — see DEPLOYMENT.md.**

| Column | Type | Description | Example |
|---|---|---|---|
| `vendor_remit_id` | INT (auto) | Primary key | `1` |
| `accounts_id` | INT | Which vendor (FK → `accounts`) | `1` |
| `remit_name` | VARCHAR(120) | Remit-to name | `"AT&T Services Inc"` |
| `remit_code` | VARCHAR(80) | Internal reference code | `"ATT-ACH-1"` |
| `payment_method` | VARCHAR(30) | Payment type | `"ACH"`, `"Check"`, `"Wire"` |
| `bank_name` | VARCHAR(120) | Bank name | `"JPMorgan Chase"` |
| `routing_number` | VARCHAR(20) | ABA routing number | `"021000021"` |
| `bank_account_number` | VARCHAR(40) | Bank account number | `"0012345678"` |
| `remit_address` | VARCHAR(255) | Payment mailing address | `"PO Box 9001"` |
| `remit_city` | VARCHAR(80) | Payment city | `"Atlanta"` |
| `remit_state` | VARCHAR(40) | Payment state | `"GA"` |
| `remit_zip` | VARCHAR(20) | Payment ZIP | `"30348"` |
| `status` | VARCHAR(30) | Active / Inactive | `"Active"` |
| `notes` | TEXT | Additional info | — |
| `created_at` | TIMESTAMP | When created | Auto-generated |

### Table: `spend_categories`

Hierarchical spend classification tree for GL code mapping and reporting.

| Column | Type | Description | Example |
|---|---|---|---|
| `spend_categories_id` | INT (auto) | Primary key | `1` |
| `name` | VARCHAR(120) | Category name | `"Voice Services"` |
| `code` | VARCHAR(40) | Short code | `"VOICE"` |
| `description` | TEXT | Details | — |
| `parent_id` | INT (nullable, self-FK) | Parent category for hierarchy | `null` (top-level) or `1` |
| `is_active` | BOOLEAN | Include in lookups | `true` |
| `created_at` | TIMESTAMP | When created | Auto-generated |

### Table: `announcements`

System-wide banners/notices shown to users on the Dashboard.

| Column | Type | Description | Example |
|---|---|---|---|
| `announcements_id` | INT (auto) | Primary key | `1` |
| `title` | VARCHAR(200) | Banner heading | `"Maintenance Window Tonight"` |
| `message` | TEXT | Full announcement text | `"The system will be down 10–11 PM CST"` |
| `type` | VARCHAR(30) | Visual style | `"info"`, `"warning"`, `"success"`, `"error"` |
| `is_active` | BOOLEAN | Whether to display | `true` |
| `start_date` | DATE (nullable) | First shown date | `"2026-03-07"` |
| `end_date` | DATE (nullable) | Last shown date | `"2026-03-07"` |
| `created_by` | INT (nullable, FK → `users`) | Who created it | `1` |
| `created_at` | TIMESTAMP | When created | Auto-generated |

---

## 10. Server (Back-End) Detailed Walkthrough

### File: `server/server.js` — The Main Server

This is the entry point for the back-end. Here's what it does, line by line:

```javascript
require('dotenv').config();          // Load .env file into process.env
const express = require('express');   // Import Express framework
const cors = require('cors');         // Import CORS middleware
const db = require('./db');           // Import database connection

const app = express();                // Create an Express application
app.use(cors());                      // Allow cross-origin requests
app.use(express.json());             // Parse JSON request bodies
```

**What is middleware?** Middleware is code that runs on every request before it reaches the route handler. `cors()` adds headers that allow browser requests. `express.json()` reads the request body and makes it available as `req.body`.

Then it registers all the route files:

```javascript
app.use('/api/accounts',       require('./routes/accounts'));
app.use('/api/contracts',      require('./routes/contracts'));
app.use('/api/circuits',       require('./routes/circuits'));
app.use('/api/orders',         require('./routes/orders'));
app.use('/api/invoices',       require('./routes/invoices'));
app.use('/api/line-items',     require('./routes/lineItems'));
app.use('/api/allocations',    require('./routes/allocations'));
app.use('/api/cost-savings',   require('./routes/costSavings'));
app.use('/api/search',         require('./routes/search'));
app.use('/api/usoc-codes',     require('./routes/usocCodes'));
app.use('/api/contract-rates', require('./routes/contractRates'));
app.use('/api/disputes',       require('./routes/disputes'));
app.use('/api/vendors',        require('./routes/vendors'));
app.use('/api/locations',      require('./routes/locations'));
app.use('/api/field-catalog',  require('./routes/fieldCatalog'));
app.use('/api/vendor-remit',   require('./routes/vendorRemit'));
app.use('/api/announcements',  require('./routes/announcements'));
app.use('/api/spend-categories', require('./routes/spendCategories'));
app.use('/api/users',          require('./routes/users'));
app.use('/api/roles',          require('./routes/roles'));
app.use('/api/batch-upload',   require('./routes/batchUpload'));
app.use('/api/invoice-reader', require('./routes/invoiceReader'));
app.use('/api/notes',          require('./routes/notes'));
app.use('/api/favorites',      require('./routes/favorites'));
app.use('/api/tickets',        require('./routes/tickets'));
app.use('/api/reports',        require('./routes/reports'));
app.use('/api/notifications',  require('./routes/notifications'));
```

This means: "When someone makes a request to `/api/accounts/...`, hand it off to the `accounts.js` route file." The same pattern applies for all 27 route files.

The file also contains two endpoints defined directly:

**Dashboard endpoint** — runs 14 database queries in parallel to gather all summary statistics:

```javascript
app.get('/api/dashboard', async (req, res) => {
  // Runs 14 database queries to get summary statistics:
  //  - totalAccounts, activeContracts, activeCircuits, openInvoices
  //  - totalBilled, totalVariance, totalSavingsIdentified, pendingOrders
  //  - totalMrc (sum of line_items.mrc_amount)
  //  - totalNrc (sum of line_items.nrc_amount)
  //  - auditCounts (validated/variance/pending from line_items.audit_status)
  //  - openDisputes (count where status ≠ 'Closed')
  //  - recentInvoices (top 5), savingsOpportunities, recentVariances (top 10)
});
```

**Rate Validation endpoint** — compares line-item charges against contract rates:

```javascript
app.get('/api/rate-validation', async (req, res) => {
  // Joins line_items → usoc_codes → contract_rates
  // Computes mrc_delta, nrc_delta, mrc_match, nrc_match, compliant
  // Returns { summary: { total, matched, mismatched, noRate }, items: [...] }
});
```

### File: `server/db.js` — Database Connection (Knex)

This creates a **Knex instance** that connects to the database:

```javascript
const knex = require('knex');
const config = require('./knexfile');

const db = knex(config[process.env.NODE_ENV || 'development']);
```

Knex is a **query builder** — it lets you write database queries in JavaScript instead of raw SQL strings. The same queries work on MySQL, PostgreSQL, and MSSQL.

**Connection pooling** is handled automatically by Knex. It creates a few connections upfront and reuses them across requests. The pool is configured in `knexfile.js` with `min: 2` / `max: 10`.

The file also exports a **helper function** for inserting rows:

```javascript
db.insertReturningId = async function (table, data) {
  const pkColumn = `${table}_id`;                    // e.g. accounts_id, circuits_id
  const result = await this(table).insert(data).returning(pkColumn);
  const first = result[0];
  return typeof first === 'object' ? first[pkColumn] : first;
};
```

This helper handles a cross-database difference: MySQL returns the new ID as a number, while PostgreSQL/MSSQL return it as an object `{ accounts_id: 5 }`. The helper normalizes this so all routes work identically on any database. It derives the primary key column name automatically using the convention `{table_name}_id`.

### File: `server/knexfile.js` — Database Configuration

This file tells Knex how to connect to the database:

```javascript
module.exports = {
  development: {
    client: process.env.DB_CLIENT || 'mysql2',  // Change to 'pg' or 'mssql'
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'doctore',
    },
    pool: { min: 2, max: 10 },
    migrations: { directory: './migrations' },
    seeds: { directory: './seeds' },
  },
};
```

**To switch databases**, change the `DB_CLIENT` environment variable:
- MySQL: `DB_CLIENT=mysql2` (default)
- PostgreSQL: `DB_CLIENT=pg`
- MSSQL: `DB_CLIENT=mssql`

### Route Files — The CRUD Pattern (Knex Query Builder)

Every route file follows the same pattern using Knex's chainable query builder. Let's understand it using `routes/accounts.js` as an example:

#### GET All (List)
```javascript
router.get('/', async (req, res) => {
  const rows = await db('accounts').orderBy('name');
  res.json(rows);
});
```
- **What it does:** Returns all accounts, sorted by name
- `db('accounts')` tells Knex which table to query
- `.orderBy('name')` adds `ORDER BY name` to the query
- Knex automatically builds the SQL and returns results as an array

#### GET One (Detail)
```javascript
router.get('/:id', async (req, res) => {
  const row = await db('accounts').where('accounts_id', req.params.id).first();
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});
```
- `.where('accounts_id', req.params.id)` adds a `WHERE accounts_id = ?` clause (Knex parameterizes values automatically to prevent SQL injection)
- `.first()` returns a single object instead of an array

#### POST (Create)
```javascript
router.post('/', async (req, res) => {
  const { name, account_number, ... } = req.body;
  const id = await db.insertReturningId('accounts', {
    name, account_number, ...
  });
  const row = await db('accounts').where('accounts_id', id).first();
  res.status(201).json(row);
});
```
- `db.insertReturningId()` is a custom helper that inserts a row and returns its new ID — works on MySQL, PostgreSQL, and MSSQL
- After inserting, we fetch the full new row and return it

#### PUT (Update)
```javascript
router.put('/:id', async (req, res) => {
  const { name, account_number, ... } = req.body;
  await db('accounts').where('accounts_id', req.params.id).update({
    name, account_number, ...
  });
  const row = await db('accounts').where('accounts_id', req.params.id).first();
  res.json(row);
});
```
- `.update({...})` generates an `UPDATE ... SET ...` query

#### DELETE
```javascript
router.delete('/:id', async (req, res) => {
  await db('accounts').where('accounts_id', req.params.id).del();
  res.json({ success: true });
});
```
- `.del()` generates a `DELETE FROM ... WHERE ...` query

### The `baseQuery()` Pattern

Most route files define a `baseQuery()` helper function that pre-configures JOINs and column selections:

```javascript
function baseQuery() {
  return db('circuits as ci')
    .leftJoin('accounts as a', 'ci.accounts_id', 'a.accounts_id')
    .leftJoin('contracts as co', 'ci.contracts_id', 'co.contracts_id')
    .leftJoin('orders as o', 'ci.orders_id', 'o.orders_id')
    .select('ci.*', 'a.name as account_name', 'co.contract_number', 'o.order_number');
}

// Usage:
const rows = await baseQuery().where('ci.status', 'Active');      // List
const row  = await baseQuery().where('ci.circuits_id', 5).first();  // Single
```

This avoids duplicating the same JOIN logic across GET endpoints.

### Special Route Features

Some routes have extra capabilities:

- **Filtering:** `GET /api/contracts?accounts_id=1` returns only contracts for account #1. The route handler conditionally chains `.where()` calls based on query parameters.

- **Joins:** Most routes use Knex `.leftJoin()` to include related data. For example, getting a circuit also returns the account name, contract number, and order number.

- **Nested Resources:** `GET /api/accounts/:id/circuits` returns all circuits belonging to a specific account. `GET /api/contracts/:id/orders` returns all orders under a specific contract.

- **Calculated Fields:** When creating/updating a line item, the server automatically calculates `variance = amount - contracted_rate`.

### File: `server/routes/search.js` — Global Search

The search endpoint accepts a query string and searches across **6 tables** simultaneously using Knex:

```javascript
router.get('/', async (req, res) => {
  const q = req.query.q;  // Get search term from URL: /api/search?q=ATT
  const like = `%${q}%`;  // Add wildcards for partial matching
  
  // Search all 6 tables in parallel using Knex
  const [accounts, contracts, circuits, orders, invoices, usoc_codes] = await Promise.all([
    db('accounts as a').select('a.accounts_id', 'a.name', 'a.account_number as sub')
      .where('a.name', 'like', like).orWhere('a.account_number', 'like', like).limit(6),
    db('contracts as c').leftJoin('accounts as a', 'c.accounts_id', 'a.accounts_id')
      .select('c.contracts_id', 'c.name', 'a.name as sub')
      .where('c.contract_number', 'like', like).orWhere('c.name', 'like', like).limit(6),
    // ... circuits, orders, invoices ...
    db('usoc_codes as u').select('u.usoc_codes_id', 'u.usoc_code', 'u.description')
      .where('u.usoc_code', 'like', like).orWhere('u.description', 'like', like).limit(6),
  ]);
  
  res.json({ accounts, contracts, circuits, orders, invoices, usoc_codes });
});
```

**`.where('column', 'like', pattern)`** uses Knex's chainable syntax for `LIKE` queries. On MySQL and MSSQL, `LIKE` is case-insensitive by default. For PostgreSQL, you would change `'like'` to `'ilike'` for case-insensitive matching.

**`Promise.all()`** runs all 6 searches simultaneously instead of one after another, making search much faster.

### New Route Files

Three additional route files follow the same CRUD pattern described above:

- **`routes/usocCodes.js`** — CRUD for USOC codes. Supports optional `?category=` and `?status=` query filters. 
- **`routes/contractRates.js`** — CRUD for contract rates. Base query joins `contracts`, `usoc_codes`, and `accounts` to return rich data. Supports `?contracts_id=` and `?usoc_codes_id=` filters.
- **`routes/disputes.js`** — CRUD for disputes. Base query joins `invoices`, `accounts`, and `line_items` to include vendor name, invoice number, and line item description in every response.

### Additional Route Files

These route files were added for administration, collaboration, and supplemental modules:

- **`routes/users.js`** — Full user management CRUD. `GET /:id` returns enriched data with `assigned_invoices_count`, `assigned_orders_count`, and `audit_actions_count`. Sub-routes: `GET /:id/invoices`, `GET /:id/orders`, `GET /:id/activity`. Status validation includes Active, Inactive, and Suspended.
- **`routes/roles.js`** — CRUD for roles and permissions. Includes audit-log query endpoint with resource whitelist.
- **`routes/notifications.js`** — `GET /` returns notifications for the current user. `PATCH /:id/read` marks one as read. `PATCH /read-all` marks all as read.
- **`routes/tickets.js`** — CRUD for tickets with ticket_comments sub-resource.
- **`routes/notes.js`** — Polymorphic notes CRUD (entity_type + entity_id pattern).
- **`routes/favorites.js`** — User favorites CRUD.
- **`routes/vendors.js`**, **`routes/locations.js`**, **`routes/fieldCatalog.js`**, **`routes/vendorRemit.js`**, **`routes/announcements.js`**, **`routes/spendCategories.js`** — Standard CRUD for supplemental reference tables.
- **`routes/batchUpload.js`** — Batch import via Excel templates.
- **`routes/invoiceReader.js`** — Multi-format invoice parsing and batch import (EDI, Excel, PDF).
- **`routes/reports.js`** — Saved report CRUD and report execution.

---

## 11. Client (Front-End) Detailed Walkthrough

### File: `client/index.html` — The Shell

This is the only HTML file in the entire application. It contains:

```html
<div id="root"></div>
<script type="module" src="/src/main.jsx"></script>
```

The `<div id="root">` is where React will insert the entire application. The `<script>` tag loads the React code.

### File: `client/src/main.jsx` — The Entry Point

```jsx
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider value={defaultSystem}>
      <App />
    </ChakraProvider>
  </React.StrictMode>
);
```

This code:
1. Finds the `<div id="root">` in the HTML
2. Wraps the entire app in `ChakraProvider` (UI system) and `React.StrictMode` (development helper)
3. Renders the `<App />` component — which is the entire application

### File: `client/src/api.js` — The API Layer

This file is the **single source of truth** for all server communication. Every API call in the entire application goes through this file.

```javascript
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Accounts
export const getAccounts = () => api.get('/accounts');
export const getAccount  = id => api.get(`/accounts/${id}`);
export const createAccount = d => api.post('/accounts', d);
export const updateAccount = (id, d) => api.put(`/accounts/${id}`, d);
export const deleteAccount = id => api.delete(`/accounts/${id}`);
// ... same pattern for contracts, circuits, orders, invoices, line items, allocations, cost savings

// USOC Codes
export const getUsocCodes   = params => api.get('/usoc-codes', { params });
export const getUsocCode    = id => api.get(`/usoc-codes/${id}`);
export const createUsocCode = d => api.post('/usoc-codes', d);
export const updateUsocCode = (id, d) => api.put(`/usoc-codes/${id}`, d);
export const deleteUsocCode = id => api.delete(`/usoc-codes/${id}`);

// Contract Rates
export const getContractRates   = params => api.get('/contract-rates', { params });
export const getContractRate    = id => api.get(`/contract-rates/${id}`);
export const createContractRate = d => api.post('/contract-rates', d);
export const updateContractRate = (id, d) => api.put(`/contract-rates/${id}`, d);
export const deleteContractRate = id => api.delete(`/contract-rates/${id}`);

// Disputes
export const getDisputes   = params => api.get('/disputes', { params });
export const getDispute    = id => api.get(`/disputes/${id}`);
export const createDispute = d => api.post('/disputes', d);
export const updateDispute = (id, d) => api.put(`/disputes/${id}`, d);
export const deleteDispute = id => api.delete(`/disputes/${id}`);

// Rate Validation
export const getRateValidation = () => api.get('/rate-validation');

// Global Search
export const globalSearch = q => api.get('/search', { params: { q } });
```

**Why is this useful?**
- All API URLs are defined in one place — if the server URL changes, you only update this file
- Each function has a clear name that describes what it does
- The `baseURL: '/api'` means every request automatically starts with `/api`

### File: `client/src/App.jsx` — The Main Layout

This is the most important React file. It defines the overall page layout and Navigation.

#### The Layout Structure

```
┌──────────────────────────────────────────────────────────────────┐
│ ┌───────────┐  ┌──────────────────────────────────────────────┐  │
│ │           │  │  HEADER (page title, search bar, date, user) │  │
│ │  SIDEBAR  │  ├──────────────────────────────────────────────┤  │
│ │           │  │  BREADCRUMB BAR (navigation history)         │  │
│ │  Dashboard│  ├──────────────────────────────────────────────┤  │
│ │  Accounts │  │                                              │  │
│ │  Contracts│  │                                              │  │
│ │  Circuits │  │           PAGE CONTENT                       │  │
│ │  Orders   │  │           (changes based on URL)             │  │
│ │  Invoices │  │                                              │  │
│ │  USOC     │  │                                              │  │
│ │  Disputes │  │                                              │  │
│ │  Rate Aud.│  │                                              │  │
│ │  Alloc.   │  │                                              │  │
│ │  Savings  │  │                                              │  │
│ │  [◀ ▶]    │  │                                              │  │
│ └───────────┘  └──────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
```

#### The Sidebar

The sidebar has:
- **TEMS logo** at the top with a dollar sign icon
- **11 navigation items** — one for each main section, each expandable into sub-items
- **Collapse toggle** at the bottom — click to shrink the sidebar to just icons
- **Active state highlighting** — the current page is highlighted

The navigation items are defined as an array with nested `children` for sub-menus:

```javascript
const NAV = [
  { path: '/',             icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/accounts',     icon: Building2,       label: 'Accounts',
    children: [
      { path: '/accounts',          label: 'All Accounts' },
      { path: '/service-providers', label: 'Service Providers' },
      { path: '/gl-codes',          label: 'GL Codes' },
    ],
  },
  { path: '/contracts',    icon: FileText,        label: 'Contracts',
    children: [
      { path: '/contracts',  label: 'All Contracts' },
      { path: '/usoc-codes', label: 'USOC Codes' },
      { path: '/disputes',   label: 'Disputes' },
      { path: '/rate-audit', label: 'Rate Audit' },
    ],
  },
  { path: '/circuits',     icon: Network,         label: 'Circuits',
    children: [
      { path: '/circuits',     label: 'All Circuits' },
      { path: '/cost-savings', label: 'Cost Savings' },
      { path: '/projects',     label: 'Projects' },
    ],
  },
  { path: '/orders',       icon: ShoppingCart,    label: 'Orders',
    children: [
      { path: '/orders',     label: 'All Orders' },
      { path: '/milestones', label: 'Milestones' },
    ],
  },
  { path: '/invoices',     icon: Receipt,         label: 'Invoices',
    children: [
      { path: '/invoices',          label: 'All Invoices' },
      { path: '/invoice-reader',    label: 'Invoice Reader' },
      { path: '/allocations',       label: 'Allocations' },
      { path: '/invoice-approvers', label: 'Invoice Approvers' },
    ],
  },
  { path: '/reports',      icon: BarChart2,       label: 'Reports',
    children: [
      { path: '/reports',       label: 'All Reports' },
      { path: '/create-graph',  label: 'Create Graph' },
      { path: '/create-report', label: 'Create Report' },
    ],
  },
  { path: '/administration', icon: Wrench, label: 'Administration', adminOnly: true,
    children: [
      { path: '/batch-upload', label: 'Batch Upload' },
      { path: '/users',        label: 'Users' },
    ],
  },
  { path: '/audit-log',    icon: Shield,          label: 'Audit Log', adminOnly: true },
];
```

#### The Header

The header has three sections (using CSS Grid):
1. **Left:** Current page title and subtitle
2. **Center:** Global search bar
3. **Right:** Today's date and a user avatar

#### Global Search

The search bar is a powerful feature that searches across all data types simultaneously:

1. User types at least 2 characters
2. After a 300ms pause (debounce — prevents searching on every keystroke), an API call is made
3. Results appear in a dropdown, grouped by type (Accounts, Contracts, Circuits, etc.)
4. Each result is color-coded and clickable — clicking navigates to that item's detail page

#### The Router (Page Switching)

React Router maps URLs to components:

```jsx
<Routes>
  <Route path="/"             element={<Dashboard />} />
  <Route path="/accounts"     element={<Accounts />} />
  <Route path="/accounts/:id" element={<AccountDetail />} />
  // ... etc.
</Routes>
```

When you navigate to `/accounts`, React displays the `<Accounts />` component. When you navigate to `/accounts/3`, it displays `<AccountDetail />` and the `:id` parameter is `3`.

#### Breadcrumb Navigation

The breadcrumb bar shows your navigation history (like breadcrumbs in a forest):

```
Dashboard › Accounts › AT&T › Circuits › ATT/MPLS/00112233
```

Each entry is clickable — you can jump back to any previous page. There's also a "Clear" button to reset the trail.

### File: `client/src/components/Modal.jsx` — Reusable Dialog

The Modal component creates a "popup" form for creating/editing records. It:
- Renders a dark overlay covering the entire screen
- Shows a white card in the center with a title, form content, and Save/Cancel buttons
- Closes when you click the overlay, click X, or click Cancel
- Is reusable — every list page uses the same Modal component with different form fields inside

### File: `client/src/PageTitleContext.js` — Dynamic Page Titles

This uses React's Context API to let detail pages (like AccountDetail) set a custom page title in the header. For example, when viewing AT&T's detail page, the title changes from "Account Detail" to "AT&T".

### File: `client/src/index.css` — Global Styles

This CSS file defines the entire visual design system:

- **Color Palette:** Dark navy sidebar (`#0f172a`), white content area, blue accents (`#3b82f6`)
- **KPI Cards:** 7 color variants (blue, teal, purple, orange, green, red, slate) with icons and numbers
- **Data Tables:** Dark header, alternating white/light-blue rows, hover highlight
- **Forms:** Clean labels, bordered inputs with focus states
- **Badges:** Color-coded status indicators (green for Active, red for Disputed, etc.)
- **Buttons:** Primary (blue), ghost (transparent), danger (red) styles
- **Modals:** Overlay with blur effect, centered card

---

## 12. Every Page Explained

### Dashboard (`/`)

**Purpose:** Home page — gives a bird's-eye view of your entire telecom portfolio.

**What you see:**
- **Hero Banner** — Large blue section showing Total Billed amount and Savings Pipeline total. If there are billing variances, a red alert appears. Also shows **Total MRC** and **Total NRC** summary figures.
- **9 KPI Cards:**
  - Vendors — total number of vendor accounts
  - Active Contracts — number of contracts currently active
  - Active Circuits — number of circuits currently in service
  - Open Invoices — number of invoices awaiting payment
  - Pending Orders — number of orders in progress
  - Billing Variance — total dollar amount of overcharges found
  - Total MRC — sum of all MRC (Monthly Recurring Charge) line items
  - Total NRC — sum of all NRC (Non-Recurring Charge) line items
  - Open Disputes — count of unresolved billing disputes
- **Audit Status Bar** — A horizontal bar chart showing the distribution of line-item audit statuses (Validated, Variance, Pending)
- **Recent Invoices Table** — Shows the 5 most recent invoices with status, amount, and quick navigation
- **Savings Opportunities Table** — Lists all unresolved savings with projected amounts
- **Recent Variances Table** — Shows the 10 most recent line items flagged with "Variance" audit status, including invoice number, circuit, account, and amounts

**Data source:** One API call to `GET /api/dashboard` which runs 14 database queries.

---

### Accounts (`/accounts`)

**Purpose:** View and manage all vendor accounts.

**What you see:**
- **3 KPI Cards:** Total Accounts, Active, Inactive
- **Data Table** with columns: Vendor Name, Account Number, Vendor Type, Contact Email, Phone, Status
- **"+ New Account" button** — Opens a modal form to create a new account
- **Edit/Delete buttons** on each row

**CRUD Operations:**
- **Create:** Click "+ New Account" → Fill in the form → Click Save
- **Read:** The table loads automatically when you visit the page
- **Update:** Click the pencil icon on any row → Modal opens with current values → Edit and Save
- **Delete:** Click the trash icon → Confirm in the dialog

**Clicking a vendor name** navigates to the Account Detail page.

---

### Account Detail (`/accounts/:id`)

**Purpose:** View and edit all details for a single vendor account, including its linked circuits.

**What you see:**
- **Header** with vendor name, type badge, status badge, account icon, and Save button
- **4 KPI Cards:** Total Circuits, Active Circuits, Pending/Suspended, Monthly MRC (total monthly cost of all active circuits)
- **Editable Form Fields** (inline — not in a modal):
  - Vendor Name, Account Number, Vendor Type, Status, Contact Email, Contact Phone
- **Circuits Table** — All circuits that belong to this account

**How inline editing works:**
1. Change any field value in the form
2. An "Unsaved changes" indicator appears
3. Click the Save button to persist changes to the database
4. A toast notification confirms success

---

### Contracts (`/contracts`)

**Purpose:** View and manage all vendor contracts.

**What you see:**
- **3 KPI Cards:** Total Contracts, Active, Expiring Soon (within 90 days)
- **Data Table** with columns: Vendor, Contract #, Name, Start Date, End Date, Rate, Term, Auto-Renew, Status
- **"+ New Contract" button** for creating
- **Edit/Delete buttons** on each row

**Special features:**
- The "Expiring Soon" card highlights contracts expiring within 90 days in orange
- Auto-renew contracts are marked with a green badge
- Clicking a contract name or number navigates to Contract Detail

---

### Contract Detail (`/contracts/:id`)

**Purpose:** View and edit a single contract, see its circuits, orders, and rate schedule.

**What you see:**
- **Header** with contract name, number, status, auto-renew indicator
- **Expiry Warnings:** Orange "Expiring Soon" badge or red "Expired" badge when applicable
- **4 KPI Cards:** Contracted Rate, Term (showing days remaining or "Expired"), Circuits (count + total MRC), Orders (count + in-progress count)
- **Editable Form** — All contract fields including **Minimum Spend**, **ETF Amount**, and **Commitment Type**
- **Rate Schedule Card** — Shows all contract rates linked to this contract, listing USOC codes with their negotiated MRC/NRC and effective/expiration dates
- **Circuits Table** — All circuits under this contract
- **Orders Table** — All orders under this contract

---

### Circuits (`/circuits`)

**Purpose:** View and manage the complete circuit inventory.

**What you see:**
- **3 KPI Cards:** Total Circuits, Active Circuits, Monthly MRC
- **Data Table** with columns: Circuit ID, Vendor, Location, Type, Bandwidth, Monthly Cost, Status
- **"+ New Circuit" button** for creating
- **Edit/Delete buttons** on each row

**Clicking a circuit ID** navigates to Circuit Detail.

---

### Circuit Detail (`/circuits/:id`)

**Purpose:** View and edit a single circuit, see its related order and invoices.

**What you see:**
- **Header** with circuit ID, location, vendor, status
- **3 KPI Cards:** Circuit Type (with bandwidth), Monthly Rate, Invoices on File
- **Editable Form** — All circuit fields including dropdowns for Vendor Account, Contract, and Linked Order
- **Related Order Section** — Shows the order that installed this circuit (if any)
- **Invoices Table** — All invoices that contain charges for this circuit, showing circuit-specific totals

---

### Orders (`/orders`)

**Purpose:** View and manage service orders.

**What you see:**
- **4 KPI Cards:** Total Orders, Pending, In Progress, Completed
- **Data Table** with columns: Order #, Vendor, Description, Circuit, Order Date, Due Date, Rate, Status
- **"+ New Order" button** for creating
- **Edit/Delete buttons** on each row

**Clicking an order number** navigates to Order Detail.

---

### Order Detail (`/orders/:id`)

**Purpose:** View and edit a single order, see its linked circuits.

**What you see:**
- **Header** with order number, vendor, contract, status, and overdue alert (if past due date)
- **4 KPI Cards:** Order Date, Due Date (red if overdue), Contracted Rate, Circuits on Order
- **Editable Form** — All order fields including a Notes textarea
- **Circuits Table** — Circuits linked to this order

---

### Invoices (`/invoices`)

**Purpose:** View and manage all vendor invoices.

**What you see:**
- **4 KPI Cards:** Total Invoices, Open, Paid, Total Billed
- **Data Table** with columns: Invoice #, Vendor, Invoice Date, Due Date, Amount, Variance, Status
- **Variance Column** — Color-coded: red for overcharges, green for undercharges
- **View button** (eye icon) — Navigates to Invoice Detail
- **Edit/Delete buttons** on each row

**Clicking an invoice number** navigates to Invoice Detail.

---

### Invoice Detail (`/invoices/:id`)

**Purpose:** The most detailed page in the app. Shows a single invoice with its line items and cost allocations.

**What you see:**

**Invoice Header Card:**
- Invoice number, vendor name, status badge
- Key dates: Invoice Date, Due Date, Period, Payment Date (if paid)

**3 KPI Cards:**
- Invoice Total — the bill amount
- Billing Variance — total overcharge/undercharge across all line items
- Total Allocated — how much has been allocated to departments

**Line Items Table:**
- Every charge on this invoice
- Columns: Description, Circuit (clickable), USOC Code, Charge Type, MRC, NRC, Billed Amount, Contracted Rate, Variance, Audit Status
- **Audit Status** column is color-coded: green for "Validated", red for "Variance", yellow for "Pending"
- **"+ Add Line Item" button** — Create a new charge
- **Edit/Delete buttons** on each line item
- **"Allocate" button** on each line item — Opens the allocation modal

**Allocations Table:**
- How charges have been split across departments
- Columns: Line Item, Cost Center, Department, Percentage, Allocated Amount, Notes
- **Delete button** to remove an allocation

**CRUD Operations:**
- **Line Items:** Full create, read, update, delete
- **Allocations:** Create (via the Allocate button on a line item) and Delete
- **Invoice itself:** Read-only on this page (edited from the Invoices list)

---

### Allocations (`/allocations`)

**Purpose:** A read-only overview of all cost allocations across all invoices.

**What you see:**
- **3 KPI Cards:** Total Allocated (dollar amount), Allocation Records (count), Invoices (count of invoices that have allocations)
- **Invoice Filter Dropdown** — Filter to see allocations for a specific invoice
- **Data Table** with columns: Invoice #, Vendor, Line Item Description, Cost Center, Department, %, Amount, Notes
- **View button** (eye icon) — Navigates to the parent invoice detail

> **Note:** You cannot create or edit allocations from this page. To manage allocations, go to the specific invoice's detail page.

---

### Cost Savings (`/cost-savings`)

**Purpose:** Track and manage savings opportunities — billing errors, contract negotiation opportunities, and more.

**What you see:**
- **3 KPI Cards:** Open Opportunities, Projected Savings (total expected), Realized Savings (total recovered)
- **Data Table** with columns: Vendor, Category, Description, Projected $, Realized $, Identified Date, Status
- **"+ New Saving" button** for creating
- **Edit/Delete buttons** on each row

**Categories of savings:**
| Category | What It Means |
|---|---|
| Billing Error | The vendor charged more than the contracted rate |
| Contract Optimization | Rates can be reduced through renegotiation |
| Disconnect | Paying for a service that's no longer needed |
| Rate Negotiation | Market rates have dropped below your contract rate |
| Duplicate | Paying for the same service twice |
| Other | Any other savings opportunity |

**Status flow:** `Identified` → `In Progress` → `Resolved`

---

### USOC Codes (`/usoc-codes`)

**Purpose:** Manage the catalog of Universal Service Order Codes used to classify telecom charges.

**What you see:**
- **3 KPI Cards:** Total Codes, Active Codes, Categories (distinct count)
- **Data Table** with columns: USOC Code, Description, Category, Sub-Category, Default MRC, Default NRC, Unit, Status
- **"+ New USOC Code" button** for creating
- **Edit/Delete buttons** on each row

**Clicking a USOC code** navigates to the USOC Code Detail page.

---

### USOC Code Detail (`/usoc-codes/:id`)

**Purpose:** View and edit a single USOC code with all its details.

**What you see:**
- **Header** with USOC code value, category badge, status badge
- **Editable Form Fields** (inline):
  - USOC Code, Description, Category, Sub-Category, Default MRC, Default NRC, Unit, Status
- **Save button** to persist changes

---

### Disputes (`/disputes`)

**Purpose:** Track and manage billing disputes filed with telecom vendors.

**What you see:**
- **3 KPI Cards:** Total Disputes, Open Disputes, Total Disputed Amount
- **Data Table** with columns: Reference #, Vendor, Invoice #, Type, Amount, Status, Filed Date, Credit Amount
- **"+ New Dispute" button** for creating
- **"Export CSV" button** — Downloads all disputes as a CSV file
- **Edit/Delete buttons** on each row

**Clicking a reference number** navigates to the Dispute Detail page.

**Status flow:** `Open` → `Under Review` → `Escalated` → `Credited` / `Denied` → `Closed`

---

### Dispute Detail (`/disputes/:id`)

**Purpose:** View and edit a single billing dispute.

**What you see:**
- **Header** with reference number, vendor name, dispute type badge, status badge
- **Editable Form Fields** (inline):
  - Dispute Type, Amount, Status, Filed Date, Resolved Date, Credit Amount, Reference Number, Notes, Resolution Notes
  - Dropdowns for linked Invoice and Account
- **Save button** to persist changes

---

### Rate Audit (`/rate-audit`)

**Purpose:** View the results of automated rate validation — comparing line-item charges against contracted rates.

**What you see:**
- **4 KPI Cards:** Total Items, Matched (compliant), Mismatched (non-compliant), No Rate (no contract rate on file)
- **Compliance Summary** — Shows overall compliance percentage
- **"Export CSV" button** — Downloads all rate validation results as a CSV file
- **Data Table** with columns: Invoice #, Circuit #, USOC Code, Description, Billed MRC, Rate MRC, MRC Delta, Billed NRC, Rate NRC, NRC Delta, Compliant (✓/✗)
- Color-coded rows: green for compliant, red for non-compliant

**Data source:** One API call to `GET /api/rate-validation` which joins line items, USOC codes, and contract rates.

---

### Invoice Reader (`/invoice-reader`)

**Purpose:** Dynamically parse vendor invoices in EDI, Excel, or PDF format and batch-import their data into the TEMS database. This tool eliminates manual invoice entry for high-volume billing files.

**Supported formats:**
| Format | Extensions | Notes |
|---|---|---|
| Excel | `.xlsx`, `.xls`, `.csv` | Reads all sheets; you select which one to use |
| EDI | `.edi`, `.txt` | Parses X12 810 Invoice segments (ISA, BIG, IT1, PID, TDS, DTM) |
| PDF | `.pdf` | Extracts tabular text using whitespace-based column detection |

**Three tabs:**

**Upload & Process tab** — A 4-step wizard:
1. **Upload File** — Drag-and-drop or file picker; optionally select an account and/or apply a saved template
2. **Map Columns** — After the file is parsed, every detected column appears with a sample value and a dropdown to map it to a target field (`invoices.invoice_number`, `invoices.total_amount`, `line_items.amount`, etc.). Excel files show a sheet selector.
3. **Review** — Summary of active mappings, file name, and account. Option to save the mapping as a named template for future reuse.
4. **Results** — Stats: total rows processed, invoices created, line items created, and errors. Any row-level errors are listed with details.

**Saved Templates tab** — Lists all saved column-mapping templates. Each shows format, column count, and linked account. You can click **Use** to pre-load the template for the next upload, or delete templates.

**Upload History tab** — A table of every import run, showing file name, format, status (Pending / Processing / Completed / Failed), row counts, and date.

**How batch insertion works:**
- Rows are grouped by invoice number (if mapped)
- Each unique invoice is inserted into the `invoices` table
- Its line items are inserted into `line_items` in chunks of 500 rows
- Circuit number and USOC code values are auto-resolved to their FK IDs via a pre-loaded lookup cache
- Each run is tracked in `invoice_reader_uploads` regardless of success or failure

---

### Users (`/users`)

**Purpose:** View and manage all application user accounts.

**What you see:**
- **4 KPI Cards:** Total Users, Active, Inactive/Suspended, SSO Linked
- **Data Table** with columns: Name (clickable), Email, Role (badge), Status (badge), SSO Provider, Last Login, Created
- **"+ New User" button** — Navigates to the User Add page
- **Bulk delete** via checkbox multi-select

**Clicking a user name** navigates to the User Detail page.

---

### User Detail (`/users/:id`)

**Purpose:** View and edit a single user account with all their system activity.

**What you see:**
- **Sticky Header** with avatar, display name, email, role badge, status badge, SSO indicator, and section navigation icons
- **4 KPI Cards:** Assigned Invoices, Assigned Orders, Audit Actions, Last Login
- **User Details Section** — Editable inline form: Display Name, Email, Role (dropdown), Status, Avatar URL
- **SSO Configuration Section** — SSO Subject ID and SSO Provider fields with informational box about SSO transition
- **Assigned Invoices Table** — All invoices assigned to this user (invoice number, account, amount, status, dates)
- **Assigned Orders Table** — All orders assigned to this user (order number, account, description, rate, status)
- **Recent Activity Table** — Last 50 audit log entries by this user (action, resource, resource ID, timestamp)
- **Change History** — Full audit trail of changes to this user record

**Data sources:** `GET /api/users/:id` (enriched with counts), `GET /api/users/:id/invoices`, `GET /api/users/:id/orders`, `GET /api/users/:id/activity`

---

### User Add (`/users/new`)

**Purpose:** Create a new user account.

**What you see:**
- **User Information Section** — Display Name, Email, Role (dropdown populated from /api/roles), Status (Active/Inactive/Suspended), Avatar URL
- **SSO Configuration Section** — SSO Subject ID and SSO Provider
- **Save button** — Creates the user and redirects to the new user's detail page

---

## 13. API Reference (All Endpoints)

Every API endpoint the server provides. All URLs are relative to `http://localhost:5000`.

### Dashboard

| Method | URL | Description |
|---|---|---|
| GET | `/api/dashboard` | Get all dashboard summary data |

**Response includes:** `totalAccounts`, `activeContracts`, `activeCircuits`, `openInvoices`, `totalBilled`, `totalVariance`, `totalSavingsIdentified`, `pendingOrders`, `totalMrc`, `totalNrc`, `auditCounts` (object with `validated`, `variance`, `pending`), `openDisputes`, `recentInvoices` (array), `savingsOpportunities` (array), `recentVariances` (array of top 10 variance line items)

---

### Accounts

| Method | URL | Description |
|---|---|---|
| GET | `/api/accounts` | List all accounts |
| GET | `/api/accounts/:id` | Get one account by ID |
| POST | `/api/accounts` | Create a new account |
| PUT | `/api/accounts/:id` | Update an account |
| DELETE | `/api/accounts/:id` | Delete an account |
| GET | `/api/accounts/:id/circuits` | Get all circuits for an account |

**POST/PUT body fields:** `name`, `account_number`, `vendor_type`, `contact_email`, `contact_phone`, `status`

---

### Contracts

| Method | URL | Description |
|---|---|---|
| GET | `/api/contracts` | List all contracts |
| GET | `/api/contracts?accounts_id=1` | List contracts filtered by account |
| GET | `/api/contracts/:id` | Get one contract by ID |
| POST | `/api/contracts` | Create a new contract |
| PUT | `/api/contracts/:id` | Update a contract |
| DELETE | `/api/contracts/:id` | Delete a contract |
| GET | `/api/contracts/:id/circuits` | Get all circuits under a contract |
| GET | `/api/contracts/:id/orders` | Get all orders under a contract |

**POST/PUT body fields:** `accounts_id`, `name`, `contract_number`, `start_date`, `end_date`, `contracted_rate`, `rate_unit`, `term_months`, `status`, `auto_renew`, `minimum_spend`, `etf_amount`, `commitment_type`

---

### Circuits

| Method | URL | Description |
|---|---|---|
| GET | `/api/circuits` | List all circuits |
| GET | `/api/circuits?accounts_id=1&status=Active` | Filtered by account and/or status |
| GET | `/api/circuits/:id` | Get one circuit by ID |
| POST | `/api/circuits` | Create a new circuit |
| PUT | `/api/circuits/:id` | Update a circuit |
| DELETE | `/api/circuits/:id` | Delete a circuit |
| GET | `/api/circuits/:id/invoices` | Get invoices containing this circuit |

**POST/PUT body fields:** `accounts_id`, `contracts_id`, `orders_id`, `circuit_number`, `type`, `bandwidth`, `location`, `contracted_rate`, `status`, `install_date`, `disconnect_date`

---

### Orders

| Method | URL | Description |
|---|---|---|
| GET | `/api/orders` | List all orders |
| GET | `/api/orders?accounts_id=1&status=In Progress` | Filtered by account and/or status |
| GET | `/api/orders/:id` | Get one order by ID |
| POST | `/api/orders` | Create a new order |
| PUT | `/api/orders/:id` | Update an order |
| DELETE | `/api/orders/:id` | Delete an order |
| GET | `/api/orders/:id/circuits` | Get circuits linked to this order |

**POST/PUT body fields:** `accounts_id`, `contracts_id`, `circuits_id`, `order_number`, `description`, `contracted_rate`, `order_date`, `due_date`, `status`, `notes`

---

### Invoices

| Method | URL | Description |
|---|---|---|
| GET | `/api/invoices` | List all invoices |
| GET | `/api/invoices?accounts_id=1&status=Open` | Filtered by account and/or status |
| GET | `/api/invoices/:id` | Get one invoice (includes line items) |
| POST | `/api/invoices` | Create a new invoice |
| PUT | `/api/invoices/:id` | Update an invoice |
| DELETE | `/api/invoices/:id` | Delete an invoice |

**POST/PUT body fields:** `accounts_id`, `invoice_number`, `invoice_date`, `due_date`, `period_start`, `period_end`, `total_amount`, `status`, `payment_date`

> **Note:** `GET /api/invoices/:id` returns the invoice object WITH a nested `line_items` array — this is the only endpoint that returns related data embedded.

---

### Line Items

| Method | URL | Description |
|---|---|---|
| GET | `/api/line-items` | List all line items |
| GET | `/api/line-items?invoices_id=1` | Filter by invoice |
| GET | `/api/line-items?circuits_id=1` | Filter by circuit |
| GET | `/api/line-items/:id` | Get one line item by ID |
| POST | `/api/line-items` | Create a new line item |
| PUT | `/api/line-items/:id` | Update a line item |
| DELETE | `/api/line-items/:id` | Delete a line item |

**POST/PUT body fields:** `invoices_id`, `circuits_id`, `usoc_codes_id`, `description`, `charge_type`, `amount`, `contracted_rate`, `mrc_amount`, `nrc_amount`, `period_start`, `period_end`

> **Note:** `variance` is automatically calculated by the server as `amount - contracted_rate`. `audit_status` is automatically computed: "Validated" if |variance| < $0.005, "Variance" if > $0.005, "Pending" if no contracted_rate. You do not send these in the request.

---

### Allocations

| Method | URL | Description |
|---|---|---|
| GET | `/api/allocations` | List all allocations |
| GET | `/api/allocations?line_items_id=1` | Filter by line item |
| GET | `/api/allocations?invoices_id=1` | Filter by invoice |
| GET | `/api/allocations/:id` | Get one allocation by ID |
| POST | `/api/allocations` | Create a new allocation |
| PUT | `/api/allocations/:id` | Update an allocation |
| DELETE | `/api/allocations/:id` | Delete an allocation |

**POST/PUT body fields:** `line_items_id`, `cost_center`, `department`, `percentage`, `allocated_amount`, `notes`

---

### Cost Savings

| Method | URL | Description |
|---|---|---|
| GET | `/api/cost-savings` | List all cost savings |
| GET | `/api/cost-savings?accounts_id=1&status=Identified` | Filtered by account and/or status |
| GET | `/api/cost-savings/:id` | Get one cost saving by ID |
| POST | `/api/cost-savings` | Create a new cost saving |
| PUT | `/api/cost-savings/:id` | Update a cost saving |
| DELETE | `/api/cost-savings/:id` | Delete a cost saving |

**POST/PUT body fields:** `accounts_id`, `circuits_id`, `line_items_id`, `invoices_id`, `category`, `description`, `identified_date`, `status`, `projected_savings`, `realized_savings`, `notes`

---

### Global Search

| Method | URL | Description |
|---|---|---|
| GET | `/api/search?q=ATT` | Search across all entities |

**Response:** `{ accounts: [...], contracts: [...], circuits: [...], orders: [...], invoices: [...], usoc_codes: [...] }`

Each array contains matching records with their primary key (`{entity}_id`) and display fields. Minimum query length: 2 characters. Maximum results per category: 6.

---

### USOC Codes

| Method | URL | Description |
|---|---|---|
| GET | `/api/usoc-codes` | List all USOC codes |
| GET | `/api/usoc-codes?category=Access&status=Active` | Filtered by category and/or status |
| GET | `/api/usoc-codes/:id` | Get one USOC code by ID |
| POST | `/api/usoc-codes` | Create a new USOC code |
| PUT | `/api/usoc-codes/:id` | Update a USOC code |
| DELETE | `/api/usoc-codes/:id` | Delete a USOC code |

**POST/PUT body fields:** `usoc_code`, `description`, `category`, `sub_category`, `default_mrc`, `default_nrc`, `unit`, `status`

---

### Contract Rates

| Method | URL | Description |
|---|---|---|
| GET | `/api/contract-rates` | List all contract rates (joins contracts, USOC codes, accounts) |
| GET | `/api/contract-rates?contracts_id=1` | Filter by contract |
| GET | `/api/contract-rates?usoc_codes_id=3` | Filter by USOC code |
| GET | `/api/contract-rates/:id` | Get one contract rate by ID |
| POST | `/api/contract-rates` | Create a new contract rate |
| PUT | `/api/contract-rates/:id` | Update a contract rate |
| DELETE | `/api/contract-rates/:id` | Delete a contract rate |

**POST/PUT body fields:** `contracts_id`, `usoc_codes_id`, `mrc`, `nrc`, `effective_date`, `expiration_date`, `notes`

---

### Disputes

| Method | URL | Description |
|---|---|---|
| GET | `/api/disputes` | List all disputes (joins invoices, accounts, line_items) |
| GET | `/api/disputes/:id` | Get one dispute by ID |
| POST | `/api/disputes` | Create a new dispute |
| PUT | `/api/disputes/:id` | Update a dispute |
| DELETE | `/api/disputes/:id` | Delete a dispute |

**POST/PUT body fields:** `line_items_id`, `invoices_id`, `accounts_id`, `dispute_type`, `amount`, `status`, `filed_date`, `resolved_date`, `resolution_notes`, `credit_amount`, `reference_number`, `notes`

---

### Invoice Reader

| Method | URL | Description |
|---|---|---|
| GET | `/api/invoice-reader/fields` | List available invoice & line-item target fields for mapping |
| POST | `/api/invoice-reader/parse` | Upload a file and get back a parsed preview (columns, sample rows, format info) |
| POST | `/api/invoice-reader/process` | Upload a file + mappings (or template ID) and batch-import into the DB |
| GET | `/api/invoice-reader/templates` | List all saved reader templates |
| GET | `/api/invoice-reader/templates/:id` | Get one template by ID |
| POST | `/api/invoice-reader/templates` | Create a new reader template |
| PUT | `/api/invoice-reader/templates/:id` | Update a reader template |
| DELETE | `/api/invoice-reader/templates/:id` | Delete a reader template |
| GET | `/api/invoice-reader/uploads` | List upload history |

**`POST /api/invoice-reader/parse` — multipart form fields:**
- `file` — the invoice file (required)

**Response for Excel:** `{ format, fileName, sheets: [{ name, headers, totalRows, previewRows }] }`
**Response for EDI:** `{ format, invoiceCount, segments, headers, previewRows, structured }`
**Response for PDF:** `{ format, pages, headers, previewRows, rawText, totalLines }`

**`POST /api/invoice-reader/process` — multipart form fields:**
- `file` — the invoice file (required)
- `mappings` — JSON string: `{ "Source Column": { "field": "invoice_number", "table": "invoices", "type": "string" }, ... }`
- `template_id` — ID of a saved template (alternative to sending mappings directly)
- `accounts_id` — account to associate with imported invoices
- `sheet_name` — which Excel sheet to use (optional, defaults to first)

**`POST /api/invoice-reader/templates` body fields:** `name`, `accounts_id`, `format_type` (Excel/EDI/PDF), `config` (object with `columnMappings` and optional `sheetName`)

---

### Rate Validation

| Method | URL | Description |
|---|---|---|
| GET | `/api/rate-validation` | Run rate validation across all line items |

**Response includes:**
- `summary`: `{ total, matched, mismatched, noRate }`
- `items`: Array of line items with: `invoice_number`, `circuit_number`, `usoc_code`, `description`, `mrc_amount`, `nrc_amount`, `rate_mrc`, `rate_nrc`, `mrc_delta`, `nrc_delta`, `mrc_match`, `nrc_match`, `compliant`

---

### Users

| Method | URL | Description |
|---|---|---|
| GET | `/api/users` | List all users (joins roles for role name) |
| GET | `/api/users/:id` | Get one user by ID (enriched: includes assigned_invoices_count, assigned_orders_count, audit_actions_count) |
| POST | `/api/users` | Create a new user |
| PUT | `/api/users/:id` | Update a user |
| DELETE | `/api/users/:id` | Delete a user |
| GET | `/api/users/:id/invoices` | Get all invoices assigned to a user (joins accounts for account_name) |
| GET | `/api/users/:id/orders` | Get all orders assigned to a user (joins accounts for account_name) |
| GET | `/api/users/:id/activity` | Get recent audit log entries by a user (limit 50) |

**POST/PUT body fields:** `email`, `display_name`, `sso_subject`, `sso_provider`, `roles_id`, `status`, `avatar_url`

**Status validation:** `Active`, `Inactive`, `Suspended`

---

### Roles

| Method | URL | Description |
|---|---|---|
| GET | `/api/roles` | List all roles |
| GET | `/api/roles/:id` | Get one role by ID |
| POST | `/api/roles` | Create a new role |
| PUT | `/api/roles/:id` | Update a role |
| DELETE | `/api/roles/:id` | Delete a role |

---

### Notifications

| Method | URL | Description |
|---|---|---|
| GET | `/api/notifications` | Get all notifications for the current user |
| PATCH | `/api/notifications/:id/read` | Mark a single notification as read |
| PATCH | `/api/notifications/read-all` | Mark all notifications as read for the current user |

---

### Tickets

| Method | URL | Description |
|---|---|---|
| GET | `/api/tickets` | List all tickets |
| GET | `/api/tickets/:id` | Get one ticket by ID |
| POST | `/api/tickets` | Create a new ticket |
| PUT | `/api/tickets/:id` | Update a ticket |
| DELETE | `/api/tickets/:id` | Delete a ticket |

**POST/PUT body fields:** `ticket_number`, `title`, `description`, `category`, `priority`, `status`, `source_entity_type`, `source_entity_id`, `source_label`, `assigned_users_id`, `created_by`, `due_date`, `resolved_date`, `resolution`, `tags`

---

## 14. How Data Flows Through the App

Let's trace a complete scenario — creating a new vendor account — to see every piece working together.

### Scenario: Creating a New Account

**Step 1 — User clicks "+ New Account"**
- The `Accounts.jsx` component responds to the click event
- It opens the Modal component with an empty form

**Step 2 — User fills in the form and clicks Save**
- The form data is collected into a JavaScript object:
  ```javascript
  { name: "Sprint Business", account_number: "SPR-12345", vendor_type: "Wireless", ... }
  ```

**Step 3 — The API call is made**
- `Accounts.jsx` calls `createAccount(formData)` from `api.js`
- `api.js` sends: `POST /api/accounts` with the form data as JSON in the request body

**Step 4 — Vite proxy forwards the request**
- The browser sent the request to `http://localhost:3000/api/accounts`
- Vite's proxy forwards it to `http://localhost:5000/api/accounts`

**Step 5 — Express routes the request**
- `server.js` sees the URL starts with `/api/accounts` → hands it to `routes/accounts.js`
- The `router.post('/')` handler matches

**Step 6 — The handler writes to the database**
Knex builds and executes:
```sql
INSERT INTO accounts (name, account_number, vendor_type, ...) VALUES ('Sprint Business', 'SPR-12345', 'Wireless', ...)
```

**Step 7 — The handler reads back the new record**
Knex builds and executes:
```sql
SELECT * FROM accounts WHERE accounts_id = 10  -- 10 is the auto-generated ID
```

**Step 8 — The response is sent back**
- The new account object (with its auto-generated `accounts_id` and `created_at`) is sent as JSON
- HTTP status: 201 (Created)

**Step 9 — The client receives the response**
- `api.js` receives the response and returns the data to `Accounts.jsx`
- `Accounts.jsx` adds the new account to its local state array
- React re-renders the table — the new account appears instantly
- A green toast notification says "Account created"
- The modal closes

### The Entire Trip

```
User clicks Save
     ↓
Accounts.jsx → createAccount(data)
     ↓
api.js → POST http://localhost:3000/api/accounts  (with JSON body)
     ↓
vite proxy → http://localhost:5000/api/accounts
     ↓
server.js → routes/accounts.js → router.post('/')
     ↓
db.insertReturningId('accounts', data)  →  MySQL (via Knex)
     ↓
MySQL inserts the row, Knex returns the new accounts_id (e.g. 10)
     ↓
db('accounts').where('accounts_id', 10).first()  →  MySQL (via Knex)
     ↓
MySQL returns the full account row
     ↓
res.status(201).json(accountRow)  →  HTTP Response
     ↓
api.js receives response → returns to Accounts.jsx
     ↓
Accounts.jsx updates state → React re-renders → New row appears in table
     ↓
Toast notification: "Account created" ✓
```

---

## 15. Common Tasks & How-To Guides

### How to Add a New Vendor Account

1. Navigate to **Accounts** in the sidebar
2. Click **"+ New Account"**
3. Fill in: Vendor Name, Account Number, Vendor Type, Contact Email, Phone
4. Set Status to "Active"
5. Click **Save**

### How to Check for Billing Errors

1. Navigate to **Invoices** in the sidebar
2. Look at the **Variance** column — any red numbers indicate overcharges
3. Click the invoice number to see details
4. In the **Line Items** table, check which specific circuit has a variance
5. If confirmed, go to **Cost Savings** and create a new savings record

### How to Track a Contract Expiration

1. Navigate to **Contracts** in the sidebar
2. Check the **"Expiring Soon"** KPI card — it shows contracts expiring within 90 days
3. Click on a contract to see its detail page
4. The header will show an orange "Expiring Soon" or red "Expired" badge
5. The "Term" KPI card shows exactly how many days remain

### How to Allocate Costs to Departments

1. Navigate to **Invoices** and find the invoice
2. Click the invoice number to open it
3. In the **Line Items** table, find the charge you want to allocate
4. Click the **"Allocate"** button on that line item
5. Enter: Cost Center, Department, Percentage, and Notes
6. The Allocated Amount is calculated automatically (percentage × line item amount)
7. Click **Save**
8. You can create multiple allocations for the same line item (e.g., 60% IT + 40% Sales)

### How to Use Global Search

1. Click the search bar in the header (or just start typing)
2. Type at least 2 characters
3. Results appear grouped by type (Accounts, Contracts, Circuits, Orders, Invoices, USOC Codes)
4. Click any result to navigate directly to that item
5. Press the X icon to clear the search

### How to Manage USOC Codes

1. Navigate to **USOC Codes** in the sidebar
2. Click **"+ New USOC Code"** to create a new code
3. Fill in: USOC Code, Description, Category, Sub-Category, Default MRC, Default NRC, Unit, Status
4. Click **Save**
5. To edit, click the pencil icon on any row, or click the code to open its detail page for inline editing

### How to File a Billing Dispute

1. Navigate to **Disputes** in the sidebar
2. Click **"+ New Dispute"**
3. Select the Invoice and Account
4. Choose a Dispute Type (Overcharge, Missing Credit, Wrong Rate, Duplicate Charge, or Service Issue)
5. Enter the disputed Amount and Filed Date
6. Optionally add a Reference Number and Notes
7. Click **Save**
8. Update the dispute status as it progresses through review

### How to Run a Rate Audit

1. Navigate to **Rate Audit** in the sidebar
2. The page automatically loads and compares all line-item charges against their contract rates
3. Review the KPI cards for a high-level compliance overview (Matched, Mismatched, No Rate)
4. Scroll through the table to see individual item-level comparisons
5. Non-compliant items are highlighted in red with their MRC/NRC delta amounts
6. Click **"Export CSV"** to download the full report for offline analysis

### How to Export Data as CSV

1. Navigate to either the **Disputes** or **Rate Audit** page
2. Click the **"Export CSV"** button in the page header
3. A `.csv` file is downloaded to your computer containing all currently displayed data
4. Open it in Excel, Google Sheets, or any spreadsheet application

### How to Add a New Technology/Feature to the Project

If you want to add a new entity (e.g., "Locations"):

1. **Database:** Create a Knex migration in `server/migrations/` (see existing migration for the pattern)
2. **Server Route:** Create `server/routes/locations.js` following the same pattern as other routes
3. **Register Route:** Add `app.use('/api/locations', require('./routes/locations'))` in `server.js`
4. **API Functions:** Add `getLocations`, `getLocation`, `createLocation`, `updateLocation`, `deleteLocation` to `client/src/api.js`
5. **Page Components:** Create `client/src/pages/Locations.jsx` (list page) and optionally `LocationDetail.jsx`
6. **Routing:** Add `<Route path="/locations" element={<Locations />} />` in `App.jsx`
7. **Navigation:** Add an entry to the `NAV` array in `App.jsx`

---

## 16. Switching Databases (MySQL → PostgreSQL → MSSQL)

TEMS is built with **Knex.js**, a query builder that generates database-specific SQL automatically. This means you can switch from MySQL to PostgreSQL or MSSQL by changing configuration — no code changes required.

### How It Works

All database queries are written using Knex's JavaScript API:

```javascript
// This Knex code:
db('accounts').where('status', 'Active').orderBy('name')

// Generates this SQL on MySQL:
// SELECT * FROM `accounts` WHERE `status` = 'Active' ORDER BY `name`

// And this SQL on PostgreSQL:
// SELECT * FROM "accounts" WHERE "status" = 'Active' ORDER BY "name"
```

Knex handles quoting, data types, and syntax differences between databases.

### Step-by-Step: Switch to PostgreSQL

1. **Install the PostgreSQL driver:**
   ```bash
   cd server
   npm install pg
   ```

2. **Update your `.env` file:**
   ```env
   DB_CLIENT=pg
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=doctore
   ```

3. **Create the database:**
   ```bash
   createdb doctore
   ```

4. **Run Knex migrations to create tables:**
   ```bash
   npm run migrate
   ```

5. **Run Knex seeds to insert demo data:**
   ```bash
   npm run seed
   ```

6. **Start the server** — it now talks to PostgreSQL.

### Step-by-Step: Switch to MSSQL

1. **Install the MSSQL driver:**
   ```bash
   cd server
   npm install tedious
   ```

2. **Update your `.env` file:**
   ```env
   DB_CLIENT=mssql
   DB_HOST=localhost
   DB_PORT=1433
   DB_USER=sa
   DB_PASSWORD=your_password
   DB_NAME=doctore
   ```

3. **Run migrations and seeds as above.**

### What About the `seed.sql` Files?

The `seed.sql` and `seed_extra.sql` files are **deprecated** — they use the old column naming scheme (`id`, `account_id`, etc.) that is no longer used. They are kept for historical reference only. Use the Knex migration and seed files (`migrations/` and `seeds/` folders) instead — these use the current `{table}_id` naming convention and work on all three databases.

### Known Differences

| Feature | MySQL | PostgreSQL | MSSQL |
|---|---|---|---|
| `LIKE` case sensitivity | Case-insensitive | Case-sensitive (use `ILIKE`) | Case-insensitive |
| Boolean storage | `TINYINT(1)` | `BOOLEAN` | `BIT` |
| Auto-increment | `AUTO_INCREMENT` | `SERIAL` | `IDENTITY` |
| Default port | 3306 | 5432 | 1433 |

> **Note:** The search route uses `LIKE` which is case-insensitive on MySQL and MSSQL. On PostgreSQL, search would become case-sensitive. To fix this, change `'like'` to `'ilike'` in `routes/search.js`.

---

## 17. Troubleshooting

### "MySQL connection error" when starting the server

**Cause:** The server can't connect to MySQL.

**Fix:**
1. Make sure MySQL is running: `mysql -u root -p` should work
2. Check your `server/.env` file — are the credentials correct?
3. Make sure the `doctore` database exists: `SHOW DATABASES;`
4. If you changed the MySQL root password, update `.env`

### "Cannot find module 'express'" or similar

**Cause:** Dependencies weren't installed.

**Fix:** Run `npm install` in both the `server/` and `client/` folders.

### Client shows a blank white page

**Cause:** Usually a JavaScript error.

**Fix:**
1. Open browser developer tools (F12 or Ctrl+Shift+I)
2. Check the **Console** tab for red error messages
3. Common cause: server isn't running, so API calls fail

### "Port 5000 already in use"

**Cause:** Something else is using port 5000 (common on macOS with AirPlay).

**Fix:** Change the port in `server/.env`:
```
PORT=5001
```
And update `client/vite.config.js`:
```javascript
proxy: { '/api': { target: 'http://localhost:5001' } }
```

### Data not showing up / empty tables

**Cause:** Seed data wasn't loaded.

**Fix:** Run the Knex seeds:
```bash
cd server
npm run migrate
npm run seed
```

### Changes not appearing after editing a file

**Server files:** If using `npm run dev`, nodemon auto-restarts. If using `npm start`, restart manually.

**Client files:** Vite has Hot Module Replacement — changes should appear instantly. If not, refresh the browser (Ctrl+R).

---

## 18. Glossary

| Term | Definition |
|---|---|
| **API** | Application Programming Interface — a set of URLs the server provides for the client to request data or perform actions |
| **Audit Status** | An automatically computed label on each line item indicating whether its charge matches the contracted rate — values: Validated, Variance, Pending, Unmatched, Orphan |
| **Axios** | A JavaScript library for making HTTP requests from the browser |
| **Bandwidth** | The speed/capacity of a telecom circuit (e.g., 100 Mbps) |
| **Compliance** | Whether a line item's billed charge matches its contracted rate — a compliant item has no MRC/NRC delta |
| **Contract Rate** | A record linking a USOC code to a specific contract with negotiated MRC and NRC values |
| **CRUD** | Create, Read, Update, Delete — the four basic data operations |
| **CSV Export** | A feature that downloads table data as a Comma-Separated Values file, openable in Excel or Google Sheets |
| **Component** | A reusable piece of a React user interface (like a button, form, or entire page) |
| **Connection Pool** | A set of reusable database connections that improve performance |
| **CORS** | Cross-Origin Resource Sharing — a browser security feature that controls which websites can talk to which servers |
| **Cost Center** | An organizational unit (like a department) that is responsible for certain costs |
| **DIA** | Dedicated Internet Access — a type of internet circuit with guaranteed bandwidth |
| **Dispute** | A formal billing disagreement filed with a vendor, tracking the disputed amount, status, and any credits received |
| **Express** | A Node.js framework for building web servers |
| **Foreign Key** | A column in one database table that references the primary key of another table, creating a relationship |
| **Hook (React)** | A function like `useState` or `useEffect` that lets React components have state and side effects |
| **JSON** | JavaScript Object Notation — a text format for sending data between client and server |
| **JSX** | A syntax extension that lets you write HTML-like code inside JavaScript (used by React) |
| **KPI** | Key Performance Indicator — an important metric displayed prominently |
| **Knex.js** | A SQL query builder for Node.js that generates database-specific SQL from JavaScript, supporting MySQL, PostgreSQL, and MSSQL |
| **Line Item** | A single charge or entry on an invoice |
| **Migration** | A versioned script that creates, alters, or drops database tables — used by Knex to manage schema changes |
| **MPLS** | Multiprotocol Label Switching — a type of private network circuit |
| **MRC** | Monthly Recurring Charge — the amount billed every month for a service |
| **Middleware** | Code that processes requests before they reach the main handler (e.g., CORS, JSON parsing) |
| **Modal** | A popup dialog that overlays the page, often used for forms |
| **MySQL** | A relational database management system (RDBMS) that stores data in tables |
| **Node.js** | A runtime that lets you execute JavaScript on a server (outside the browser) |
| **NPM** | Node Package Manager — installs and manages JavaScript libraries |
| **NRC** | Non-Recurring Charge — a one-time fee billed for a service (e.g., installation, activation) |
| **Primary Key** | A unique identifier for each row in a database table (in TEMS, named `{table_name}_id`, e.g. `accounts_id`) |
| **Proxy** | An intermediary that forwards requests — Vite proxies `/api` requests to the Express server |
| **Query Builder** | A library (like Knex) that lets you build SQL queries using JavaScript method chains instead of raw SQL strings |
| **Rate Audit** | The automated process of comparing line-item charges against contracted rates to identify billing discrepancies |
| **React** | A JavaScript library for building user interfaces with reusable components |
| **React Router** | A library that enables URL-based navigation in single-page React applications |
| **REST** | Representational State Transfer — a style of API design using HTTP methods (GET, POST, PUT, DELETE) |
| **SD-WAN** | Software-Defined Wide Area Network — a modern type of network technology |
| **SPA** | Single-Page Application — a web app that loads one HTML page and dynamically updates it |
| **SQL** | Structured Query Language — the language used to communicate with databases |
| **Seed (database)** | A script that inserts initial or demo data into database tables — Knex seeds are JavaScript files in the `seeds/` folder |
| **State (React)** | Data that a component "remembers" between renders (managed with `useState`) |
| **Toast** | A temporary notification message that appears briefly (usually in a corner of the screen) |
| **USOC** | Universal Service Order Code — a standardized code used by telecom carriers to identify specific services or features on a bill |
| **Variance** | The difference between what was billed and what was contracted (overcharge or undercharge) |
| **Vite** | A fast build tool and development server for modern web applications |
| **Wavelength** | A type of high-capacity fiber-optic circuit |

---

## Quick Reference Card

| Action | Where | How |
|---|---|---|
| View system overview | Dashboard | Open the app — Dashboard is the home page |
| Manage vendors | Accounts page | Create/Edit/Delete via table and modal |
| View vendor details | Account Detail | Click a vendor name on the Accounts page |
| Manage contracts | Contracts page | Create/Edit/Delete via table and modal |
| View contract details | Contract Detail | Click a contract name on the Contracts page |
| Manage circuits | Circuits page | Create/Edit/Delete via table and modal |
| View circuit details | Circuit Detail | Click a circuit ID on the Circuits page |
| Manage orders | Orders page | Create/Edit/Delete via table and modal |
| View order details | Order Detail | Click an order number on the Orders page |
| Manage invoices | Invoices page | Create/Edit/Delete via table and modal |
| View invoice + line items | Invoice Detail | Click an invoice number on the Invoices page |
| Manage line items | Invoice Detail | Add/Edit/Delete line items on the invoice page |
| Allocate costs | Invoice Detail | Click "Allocate" on a line item |
| View all allocations | Allocations page | Read-only overview with invoice filter |
| Track savings | Cost Savings page | Create/Edit/Delete savings opportunities |
| Manage USOC codes | USOC Codes page | Create/Edit/Delete USOC code entries |
| View USOC details | USOC Code Detail | Click a USOC code on the USOC Codes page |
| Manage disputes | Disputes page | Create/Edit/Delete billing disputes |
| View dispute details | Dispute Detail | Click a reference number on the Disputes page |
| Run rate audit | Rate Audit page | Automatic — shows compliance of all line items |
| Export to CSV | Disputes / Rate Audit | Click "Export CSV" button on either page |
| Search everything | Header search bar | Type 2+ characters — results appear instantly |
| Navigate back | Breadcrumb bar | Click any previous page in the breadcrumb trail |
| Manage users | Users page | View/Create/Delete user accounts |
| View user details | User Detail | Click a user name on the Users page |
| Create a user | User Add | Click "+ New User" on the Users page |
| View notifications | Header bell icon | Click the bell icon — shows DB-persisted and computed alerts |

---

---

## 19. Prompt Log & Living Documentation

### Prompt Log

Every design and feature prompt used to build TEMS is recorded in [PROMPT_LOG.md](PROMPT_LOG.md). This provides a chronological history of every major change — what was requested, when, and what was built.

**What gets logged:** Any prompt that designs a feature, adds functionality, changes the UI, modifies the database, or creates new pages/components.

**What does NOT get logged:** Troubleshooting questions, server start commands, debugging sessions, or general Q&A.

### Living Documentation

This `DOCUMENTATION.md` file is a **living document** — it is updated every time a new feature is added or the application changes. When a design prompt results in new pages, API endpoints, database tables, or UI features, the relevant sections of this documentation are updated to reflect those changes.

This ensures the documentation always matches the current state of the application.

---

*This documentation was generated for the TEMS project. For questions or contributions, refer to the project repository.*
