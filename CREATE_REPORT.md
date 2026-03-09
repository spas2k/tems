# Create Report — Developer Reference

> Last updated: March 8, 2026

This document covers the multi-table report builder architecture. Use it as a guide when adding new database tables, new columns, or new foreign-key relationships to the reporting system.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Map](#file-map)
3. [How It Works (Data Flow)](#how-it-works-data-flow)
4. [Current Tables & Relationships](#current-tables--relationships)
5. [Step-by-Step: Adding a New Table](#step-by-step-adding-a-new-table)
6. [Step-by-Step: Adding a Column to an Existing Table](#step-by-step-adding-a-column-to-an-existing-table)
7. [Step-by-Step: Adding a New FK Relationship](#step-by-step-adding-a-new-fk-relationship)
8. [Field Definition Reference](#field-definition-reference)
9. [Edge Definition Reference](#edge-definition-reference)
10. [Frontend Icon Registry](#frontend-icon-registry)
11. [Legacy Compatibility](#legacy-compatibility)
12. [Templates](#templates)
13. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

The report builder uses a **graph-based multi-table join system**. Users pick a primary data source (table), then link related tables through foreign-key relationships. The backend validates the chain, builds LEFT JOINs in order, and returns results with `table__field` namespaced keys.

```
┌────────────┐         ┌────────────────┐         ┌─────────────────┐
│  Frontend   │  POST   │   Backend      │  Knex   │   PostgreSQL    │
│ CreateReport│────────▶│ POST /run      │────────▶│   Multi-table   │
│   .jsx      │◀────────│ runMultiTable()│◀────────│   LEFT JOINs    │
│             │  JSON   │                │  rows   │                 │
└────────────┘         └────────────────┘         └─────────────────┘
```

Three backend constants drive everything:

| Constant      | Purpose                                                     |
|---------------|-------------------------------------------------------------|
| **`TABLES`**  | Defines each reportable table: label, alias, fields, icon   |
| **`EDGES`**   | FK pairs: `[tableA, tableB, colInA, colInB]`                |
| **`ADJACENCY`** | Auto-built bidirectional map from EDGES (don't edit directly) |

The frontend never references database columns — it only knows table keys and field keys. The backend resolves everything to qualified SQL via `resolveCol()`.

---

## File Map

| File | Purpose |
|------|---------|
| `server/routes/reports.js` | Backend: `TABLES`, `EDGES`, `ADJACENCY`, `/catalog`, `/run`, saved-report CRUD |
| `client/src/pages/CreateReport.jsx` | Full report builder UI (sidebar, link picker, field selector, filters, results grid) |
| `client/src/pages/Reports.jsx` | Saved reports list page — has `TABLE_LABELS` and `TABLE_COLORS` dictionaries |
| `client/src/api.js` | 7 API functions (`getReportCatalog`, `runReport`, `getSavedReports`, etc.) |
| `server/migrations/20260308300000_saved_reports.js` | Creates `saved_reports` table |

---

## How It Works (Data Flow)

### 1. Catalog Load
- Frontend calls `GET /api/reports/catalog`
- Backend returns `{ tables: {…}, relationships: {…} }`
- `tables[key]` = `{ key, label, description, color, icon, fields: [...] }`
- `relationships[key]` = `[linkedTableKey, ...]` (derived from `ADJACENCY`)

### 2. User Builds Report
- Selects primary table (e.g., `invoices`)
- Links additional tables (e.g., `accounts` via `invoices`, then `line_items` via `invoices`)
- Picks fields from any selected table
- Adds filters, sorts, group-by, aggregations — all reference `{table, field}`

### 3. Report Execution
- Frontend sends `POST /api/reports/run` with:
  ```json
  {
    "tableKey": "invoices",
    "linkedTables": [
      { "tableKey": "accounts", "joinFrom": "invoices" },
      { "tableKey": "line_items", "joinFrom": "invoices" }
    ],
    "fields": [
      { "table": "invoices", "field": "invoice_number" },
      { "table": "accounts", "field": "name" },
      { "table": "line_items", "field": "amount" }
    ],
    "filters": [...],
    "sorts": [...],
    "groupBy": [],
    "aggregations": [],
    "limit": 500,
    "offset": 0,
    "distinct": false,
    "filterLogic": "AND"
  }
  ```
- Backend detects `linkedTables` array → routes to `runMultiTable()`
- Validates every table/field/relationship, builds JOINs, executes via Knex
- Returns `{ data: [...], total: N, fields: [...fieldMeta] }`

### 4. Result Keys
Result columns use `table__field` format:
- `invoices__invoice_number`
- `accounts__name`
- `line_items__amount`

For grouped queries: `func_table__field` (e.g., `sum_line_items__amount`).

---

## Current Tables & Relationships

### Tables (14)

| Key | Alias | Label | DB Table | Icon | Color |
|-----|-------|-------|----------|------|-------|
| `accounts` | `a` | Vendors / Accounts | `accounts` | `Building2` | `#2563eb` |
| `contracts` | `co` | Contracts | `contracts` | `FileText` | `#0d9488` |
| `orders` | `o` | Orders | `orders` | `ShoppingCart` | `#ea580c` |
| `circuits` | `ci` | Circuits | `circuits` | `Network` | `#7c3aed` |
| `invoices` | `i` | Invoices | `invoices` | `Receipt` | `#dc2626` |
| `line_items` | `li` | Line Items | `line_items` | `Layers` | `#d97706` |
| `allocations` | `al` | Allocations | `allocations` | `PieChart` | `#9333ea` |
| `disputes` | `d` | Disputes | `disputes` | `ShieldAlert` | `#be123c` |
| `cost_savings` | `cs` | Cost Savings | `cost_savings` | `DollarSign` | `#16a34a` |
| `usoc_codes` | `uc` | USOC Codes | `usoc_codes` | `Tag` | `#06b6d4` |
| `contract_rates` | `cr` | Contract Rates | `contract_rates` | `CircleDollarSign` | `#14b8a6` |
| `vendor_remit` | `vr` | Vendor Remittance | `vendor_remit` | `CreditCard` | `#8b5cf6` |
| `locations` | `loc` | Locations | `locations` | `MapPin` | `#f59e0b` |
| `tickets` | `tk` | Tickets | `tickets` | `Ticket` | `#ef4444` |

### Relationship Map (21 edges)

```
accounts ────┬── contracts ──── orders
             │        │           │
             │        ├── circuits ◄┘
             │        │
             │        └── contract_rates ── usoc_codes
             │
             ├── orders
             ├── circuits ──── line_items ──┬── allocations
             ├── invoices ─────────────────┤
             │       │                     ├── disputes
             │       ├── disputes          ├── cost_savings
             │       └── cost_savings      └── usoc_codes
             │
             ├── disputes
             ├── cost_savings
             └── vendor_remit

(locations and tickets are standalone — no FK edges currently)
```

### Edges Array (exact values)

```
accounts    ↔ contracts       via accounts_id
accounts    ↔ orders          via accounts_id
accounts    ↔ circuits        via accounts_id
accounts    ↔ invoices        via accounts_id
accounts    ↔ disputes        via accounts_id
accounts    ↔ cost_savings    via accounts_id
accounts    ↔ vendor_remit    via accounts_id
contracts   ↔ orders          via contracts_id
contracts   ↔ circuits        via contracts_id
contracts   ↔ contract_rates  via contracts_id
orders      ↔ circuits        via orders_id
invoices    ↔ line_items      via invoices_id
invoices    ↔ disputes        via invoices_id
invoices    ↔ cost_savings    via invoices_id
circuits    ↔ line_items      via circuits_id
circuits    ↔ cost_savings    via circuits_id
line_items  ↔ allocations     via line_items_id
line_items  ↔ disputes        via line_items_id
line_items  ↔ cost_savings    via line_items_id
line_items  ↔ usoc_codes      via usoc_codes_id
contract_rates ↔ usoc_codes   via usoc_codes_id
```

---

## Step-by-Step: Adding a New Table

Follow these steps in order when adding a brand-new table to the report builder.

### 1. Create the migration (if needed)

If the table doesn't exist yet, create a new migration file in `server/migrations/`.

### 2. Add to `TABLES` in `server/routes/reports.js`

Add an entry to the `TABLES` constant (located around line 250). Use a **unique alias** (2-4 chars).

```js
new_table: {
  label: 'My New Table',
  description: 'A short description for the UI',
  table: 'new_table',    // actual DB table name
  alias: 'nt',           // unique SQL alias (used in JOINs)
  color: '#10b981',      // hex color for UI badges
  icon: 'Box',           // lucide-react icon name (string)
  fields: [
    { key: 'name',   label: 'Name',   type: 'text',   col: 'name' },
    { key: 'amount', label: 'Amount', type: 'number', col: 'amount', format: 'currency', aggregable: true },
    { key: 'status', label: 'Status', type: 'select', col: 'status', options: ['Active','Inactive'] },
    { key: 'created_at', label: 'Created', type: 'date', col: 'created_at', format: 'date' },
  ],
},
```

**Rules:**
- `key` = the field identifier (must be unique within the table; typically matches the DB column name)
- `col` = the actual database column name (no alias prefix — the backend adds it)
- `alias` must be unique across ALL tables
- Only include columns you want users to be able to report on

### 3. Add FK edges to `EDGES` (if applicable)

If your new table has foreign keys to existing tables, add edges:

```js
['existing_table', 'new_table', 'existing_table_id', 'existing_table_id'],
```

Format: `[tableA, tableB, columnInTableA, columnInTableB]`

- The column names are the actual DB column names (no alias prefix)
- Both sides of the FK should reference the same logical ID column
- `ADJACENCY` is auto-built from `EDGES` — never edit it manually

### 4. Add to `TABLE_LABELS` and `TABLE_COLORS` in `client/src/pages/Reports.jsx`

```js
const TABLE_LABELS = {
  // ... existing entries
  new_table: 'My New Table',
};

const TABLE_COLORS = {
  // ... existing entries
  new_table: '#10b981',
};
```

### 5. Add the icon to `TABLE_ICONS` in `client/src/pages/CreateReport.jsx`

Located near the top of the file (around line 68):

```js
const TABLE_ICONS = {
  // ... existing entries
  Box,   // ← add the lucide icon component
};
```

Also add the import at the top of the file in the lucide-react import block:

```js
import { ..., Box } from 'lucide-react';
```

### 6. (Optional) Add templates

If useful, add a template entry to the `TEMPLATES` array in `CreateReport.jsx`:

```js
{
  name: 'My Template Name',
  description: 'What this report shows',
  config: {
    tableKey: 'new_table',
    reportName: 'My Template Name',
    linkedTables: [],
    fields: [
      { table: 'new_table', field: 'name' },
      { table: 'new_table', field: 'amount' },
    ],
    filters: [],
    filterLogic: 'AND',
    sorts: [{ id: 't1', table: 'new_table', field: 'created_at', direction: 'desc' }],
    groupBy: [],
    aggregations: [],
    limit: 1000,
    distinct: false,
    colOverrides: {},
  },
},
```

### Summary Checklist

| # | File | What to add |
|---|------|-------------|
| 1 | `server/routes/reports.js` → `TABLES` | Table definition with fields |
| 2 | `server/routes/reports.js` → `EDGES` | FK relationship(s) |
| 3 | `client/src/pages/Reports.jsx` → `TABLE_LABELS` | Label string |
| 4 | `client/src/pages/Reports.jsx` → `TABLE_COLORS` | Color hex |
| 5 | `client/src/pages/CreateReport.jsx` → lucide import | Icon component |
| 6 | `client/src/pages/CreateReport.jsx` → `TABLE_ICONS` | Icon mapping |
| 7 | `client/src/pages/CreateReport.jsx` → `TEMPLATES` | (Optional) template |

**No changes needed** in `api.js`, `App.jsx`, or router setup — those are generic.

---

## Step-by-Step: Adding a Column to an Existing Table

### 1. Run a migration to add the column (if needed)

### 2. Add the field to the table's `fields` array in `TABLES` (`server/routes/reports.js`)

```js
{ key: 'new_column', label: 'New Column', type: 'text', col: 'new_column' },
```

That's it. The frontend dynamically reads from the catalog. No frontend changes needed for new fields on existing tables.

---

## Step-by-Step: Adding a New FK Relationship

### 1. Run a migration to add the FK column (if needed)

### 2. Add the edge to `EDGES` in `server/routes/reports.js`

```js
['table_a', 'table_b', 'fk_column_in_a', 'fk_column_in_b'],
```

That's it. `ADJACENCY` rebuilds automatically, and the frontend reads relationships from the catalog.

---

## Field Definition Reference

Each field object in a `TABLES` entry supports these properties:

| Property     | Required | Type     | Description |
|-------------|----------|----------|-------------|
| `key`       | Yes      | string   | Unique identifier within the table. Used as the field reference in configs. |
| `label`     | Yes      | string   | Human-readable name shown in the UI. |
| `type`      | Yes      | string   | One of: `text`, `number`, `date`, `select`, `boolean`. Determines filter operators and UI controls. |
| `col`       | Yes      | string   | Actual database column name (**no alias prefix**). |
| `format`    | No       | string   | Display format: `currency` (adds $ formatting) or `date` (strips time). |
| `options`   | No       | string[] | For `select` type: list of allowed values shown in filter dropdowns. |
| `aggregable`| No       | boolean  | If `true`, field appears in aggregation options (SUM, AVG, MIN, MAX, COUNT). Only set for numeric fields. |

### Field Types and Their Filter Operators

| Type | Operators |
|------|-----------|
| `text` | contains, not_contains, starts_with, ends_with, equals, not_equals, in_set, not_in_set, is_empty, not_empty |
| `select` | equals, not_equals, in_set, not_in_set, is_empty, not_empty |
| `date` | on, not_on, before, after, between, this_week, this_month, this_quarter, this_year, is_empty, not_empty |
| `number` | equals, not_equals, gt, gte, lt, lte, between, is_empty, not_empty |
| `boolean` | equals, not_equals, in_set, not_in_set, is_empty, not_empty |

---

## Edge Definition Reference

Each edge in the `EDGES` array is a 4-element array:

```js
[tableKeyA, tableKeyB, columnInTableA, columnInTableB]
```

| Index | Description |
|-------|-------------|
| 0 | First table key (must match a key in `TABLES`) |
| 1 | Second table key (must match a key in `TABLES`) |
| 2 | Column name in table A that holds the FK (actual DB column, no alias) |
| 3 | Column name in table B that holds the FK (actual DB column, no alias) |

The system is **bidirectional** — an edge `['A', 'B', ...]` makes both A→B and B→A linkable. At query time, the backend builds `LEFT JOIN` using `aliasA.colA = aliasB.colB`.

**Common pattern:** Most FKs use the same column name on both sides (e.g., `accounts_id` in both the `accounts` and `contracts` tables). The exception is lookup FKs like `usoc_codes_id` in `line_items` referencing `usoc_codes_id` in `usoc_codes`.

---

## Frontend Icon Registry

The frontend maps icon name strings (from the catalog) to Lucide React components via `TABLE_ICONS` in `CreateReport.jsx`:

```js
const TABLE_ICONS = {
  Network, Receipt, Building2, Layers, FileText, ShoppingCart, ShieldAlert,
  DollarSign, PieChart, Database, Tag, CreditCard, MapPin, Ticket,
  CircleDollarSign: Coins,
};
```

When adding a new table with a new icon:
1. Import the icon from `lucide-react` at the top of `CreateReport.jsx`
2. Add it to `TABLE_ICONS`
3. Use the exact component name as the `icon` string in `TABLES`

Browse available icons at: https://lucide.dev/icons

---

## Legacy Compatibility

The system maintains backward compatibility with saved reports created before the multi-table rewrite.

### How It Works

**Backend:** The `POST /run` handler checks for `Array.isArray(req.body.linkedTables)`:
- If present → routes to `runMultiTable()` (new multi-table handler)
- If absent → falls through to the legacy single-table handler (uses old `CATALOG`)

**Frontend:** `convertLegacyConfig()` in `CreateReport.jsx` detects old format by checking `typeof fields[0] === 'string'` and converts:
- String field keys → `{table, field}` objects
- Cross-table pseudo-fields (e.g., `account_name`) → proper `{table: 'accounts', field: 'name'}` via `CROSS_TABLE_MAP`
- Infers `linkedTables` from which foreign tables are needed

### `CROSS_TABLE_MAP` (in CreateReport.jsx)

Maps old pseudo-field keys to their true table/field:

```js
const CROSS_TABLE_MAP = {
  account_name:     { table: 'accounts',  field: 'name' },
  contract_number:  { table: 'contracts', field: 'contract_number' },
  order_number:     { table: 'orders',    field: 'order_number' },
  invoice_number:   { table: 'invoices',  field: 'invoice_number' },
  invoice_date:     { table: 'invoices',  field: 'invoice_date' },
  circuit_number:   { table: 'circuits',  field: 'circuit_number' },
  circuit_location: { table: 'circuits',  field: 'location' },
};
```

### Old `CATALOG` Constant

The legacy `CATALOG` (lines 20–245 of `reports.js`) is still present and used by the legacy `/run` path. It can be removed once all saved reports have been re-saved in the new format. **Do not remove it** while old saved reports may still exist in the database.

---

## Templates

Templates live in the `TEMPLATES` array in `CreateReport.jsx`. Each template has a `name`, `description`, and full `config` object.

**Current templates (10):**
1. Active Circuit Summary
2. Invoice Aging Report
3. Billing Variance Analysis (multi-table: line_items → invoices → accounts + circuits)
4. Spend by Vendor (grouped + aggregated)
5. Open Disputes
6. Contract Expiry Watch
7. Cost Savings Opportunities
8. Allocation by Department (grouped)
9. Full Invoice Audit (multi-table: invoices → accounts + line_items → circuits)
10. Contract Rate Card (multi-table: contracts → accounts + contract_rates → usoc_codes)

To add a template, append to the `TEMPLATES` array following the config structure shown in [Adding a New Table, Step 6](#6-optional-add-templates).

---

## Troubleshooting

### "Invalid data source" error
The `tableKey` sent by the frontend doesn't match any key in `TABLES`. Verify the table was added to `TABLES` and the key matches exactly.

### "No relationship: X → Y" error
An edge is missing from `EDGES`. Add `['X', 'Y', 'fk_col_in_x', 'fk_col_in_y']` and restart the server.

### "Invalid field: table.field" error
The field key doesn't exist in the table's `fields` array. Check for typos in field keys or ensure the field was added to `TABLES`.

### "Table not selected: X" error
The user's query references a table that isn't in the selected set (primary + linked). The frontend should prevent this, but if it happens, check the `linkedTables` array.

### New table doesn't appear in the UI
Ensure:
- The table was added to `TABLES` in `reports.js`
- The server was restarted after the change
- The icon name string in `TABLES` matches a key in `TABLE_ICONS` (or it falls back to `Database` icon)

### New field doesn't appear for a table
Only the catalog change is needed — add the field to the table's `fields` array in `TABLES` and restart the server. The frontend reads fields dynamically from the catalog.

### Saved reports show wrong data after schema changes
If column names were renamed in the DB, update the `col` property in the corresponding field definition. If field keys changed, old saved reports may break — consider adding entries to `CROSS_TABLE_MAP` for backward compatibility.

### Aggregate fields not available
Only fields with `aggregable: true` appear in the aggregation section. Add this property to the field definition for any numeric field you want to be aggregable.
