/**
 * Script: Add JSDoc comments to all route files.
 * Run once: node scripts/addJsDoc.js
 * 
 * Reads each route file, identifies route handlers and helper functions,
 * and prepends JSDoc blocks. Writes modified content back.
 */
const fs = require('fs');
const path = require('path');

const ROUTES_DIR = path.join(__dirname, '..', 'routes');

// ── Route file metadata for JSDoc generation ──────────────────────────────
const ROUTE_DOCS = {
  'vendors.js': {
    file: `Vendors API Routes — /api/vendors\n * CRUD operations for telecom vendor management.\n * Vendors are the top-level entity in the TEMS hierarchy.`,
    table: 'vendors', pk: 'vendors_id', label: 'Vendor',
    routes: [
      { method: 'GET', path: '/', desc: 'List all vendors ordered by name.', returns: 'Array of vendor objects' },
      { method: 'GET', path: '/:id', desc: 'Get a single vendor by ID.', returns: 'Vendor object or 404' },
      { method: 'POST', path: '/', desc: 'Create a new vendor.', body: 'name, vendor_number, vendor_type, contact_name, contact_email, contact_phone, status', returns: '201 with created vendor object', roles: 'Admin, Manager' },
      { method: 'PUT', path: '/:id', desc: 'Update an existing vendor.', body: 'name, vendor_number, vendor_type, contact_name, contact_email, contact_phone, status', returns: 'Updated vendor object', roles: 'Admin, Manager' },
      { method: 'GET', path: '/:id/inventory', desc: 'List all inventory items belonging to this vendor (via accounts).', returns: 'Array of inventory objects with contract_number join' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a vendor. Blocked by cascadeGuard if dependent records exist.', returns: '{ success: true } or 409 Conflict', roles: 'Admin' },
      { method: 'PATCH', path: '/bulk', desc: 'Bulk update multiple vendor records.', body: '{ ids: number[], updates: object }', returns: '{ updated: number }', roles: 'Admin, Manager' },
    ],
  },
  'accounts.js': {
    file: `Accounts API Routes — /api/accounts\n * CRUD for vendor billing accounts.\n * Accounts link vendors to contracts, inventory, invoices, and cost savings.`,
    table: 'accounts', pk: 'accounts_id', label: 'Account',
    routes: [
      { method: 'GET', path: '/', desc: 'List all accounts with vendor name join.', returns: 'Array of account objects with vendor_name' },
      { method: 'GET', path: '/:id', desc: 'Get a single account by ID with vendor join.', returns: 'Account object or 404' },
      { method: 'POST', path: '/', desc: 'Create a new account.', body: 'vendors_id, name, account_number, subaccount_number, status, ...', returns: '201 with created account object', roles: 'Admin, Manager' },
      { method: 'PUT', path: '/:id', desc: 'Update an existing account.', body: 'Same as POST fields', returns: 'Updated account object', roles: 'Admin, Manager' },
      { method: 'GET', path: '/:id/inventory', desc: 'List inventory items for this account.', returns: 'Array of inventory items with contract_number' },
      { method: 'DELETE', path: '/:id', desc: 'Delete an account. Blocked by cascadeGuard if dependent records exist.', returns: '{ success: true } or 409', roles: 'Admin' },
      { method: 'PATCH', path: '/bulk', desc: 'Bulk update multiple account records.', body: '{ ids, updates }', returns: '{ updated: number }', roles: 'Admin, Manager' },
    ],
  },
  'contracts.js': {
    file: `Contracts API Routes — /api/contracts\n * CRUD for vendor contracts.\n * Contracts define terms, rates, and durations for telecom services.`,
    table: 'contracts', pk: 'contracts_id', label: 'Contract',
    routes: [
      { method: 'GET', path: '/', desc: 'List all contracts with vendor name join, ordered by contract_number.', returns: 'Array of contract objects with vendor_name' },
      { method: 'GET', path: '/:id', desc: 'Get a single contract by ID with vendor join.', returns: 'Contract object or 404' },
      { method: 'POST', path: '/', desc: 'Create a new contract.', body: 'vendors_id, contract_name, contract_number, type, subtype, start_date, expiration_date, status, ...', returns: '201 with created contract', roles: 'Admin, Manager' },
      { method: 'PUT', path: '/:id', desc: 'Update an existing contract.', body: 'Same as POST fields', returns: 'Updated contract object', roles: 'Admin, Manager' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a contract. Blocked by cascadeGuard if dependent records exist.', returns: '{ success: true } or 409', roles: 'Admin' },
      { method: 'PATCH', path: '/bulk', desc: 'Bulk update multiple contracts.', body: '{ ids, updates }', returns: '{ updated: number }', roles: 'Admin, Manager' },
    ],
  },
  'inventory.js': {
    file: `Inventory API Routes — /api/inventory\n * CRUD for telecom circuit/service inventory items.\n * Each inventory item belongs to an account and optionally a contract/order.`,
    table: 'inventory', pk: 'inventory_id', label: 'Inventory Item',
    routes: [
      { method: 'GET', path: '/', desc: 'List all inventory items with account, contract, and vendor joins.', returns: 'Array of inventory objects with joined names' },
      { method: 'GET', path: '/:id', desc: 'Get a single inventory item by ID with joins.', returns: 'Inventory object or 404' },
      { method: 'POST', path: '/', desc: 'Create a new inventory item.', body: 'accounts_id, contracts_id, orders_id, inventory_number, type, bandwidth, location, contracted_rate, status, install_date, disconnect_date', returns: '201 with created inventory item', roles: 'Admin, Manager' },
      { method: 'PUT', path: '/:id', desc: 'Update an existing inventory item.', body: 'Same as POST fields', returns: 'Updated inventory object', roles: 'Admin, Manager' },
      { method: 'DELETE', path: '/:id', desc: 'Delete an inventory item. Blocked by cascadeGuard if line items exist.', returns: '{ success: true } or 409', roles: 'Admin' },
      { method: 'PATCH', path: '/bulk', desc: 'Bulk update multiple inventory items.', body: '{ ids, updates }', returns: '{ updated: number }', roles: 'Admin, Manager' },
    ],
  },
  'invoices.js': {
    file: `Invoices API Routes — /api/invoices\n * CRUD for telecom invoices.\n * Invoices link to accounts and contain line items for billing details.`,
    table: 'invoices', pk: 'invoices_id', label: 'Invoice',
    routes: [
      { method: 'GET', path: '/', desc: 'List all invoices with account, vendor, and assigned user joins.', returns: 'Array of invoice objects with joined names' },
      { method: 'GET', path: '/:id', desc: 'Get a single invoice by ID with account and vendor joins.', returns: 'Invoice object or 404' },
      { method: 'POST', path: '/', desc: 'Create a new invoice.', body: 'accounts_id, invoice_number, invoice_date, due_date, period_start, period_end, total_amount, status, assigned_users_id', returns: '201 with created invoice', roles: 'Admin, Manager' },
      { method: 'PUT', path: '/:id', desc: 'Update an existing invoice. Sends notification if assigned_users_id changes.', body: 'Same as POST fields + billing_account', returns: 'Updated invoice object', roles: 'Admin, Manager' },
      { method: 'DELETE', path: '/:id', desc: 'Delete an invoice. Blocked by cascadeGuard if line items or disputes exist.', returns: '{ success: true } or 409', roles: 'Admin' },
      { method: 'PATCH', path: '/bulk', desc: 'Bulk update multiple invoices.', body: '{ ids, updates }', returns: '{ updated: number }', roles: 'Admin, Manager' },
    ],
  },
  'lineItems.js': {
    file: `Line Items API Routes — /api/line-items\n * CRUD for invoice line items (individual billing charges).\n * Line items belong to invoices and optionally reference inventory and USOC codes.`,
    table: 'line_items', pk: 'line_items_id', label: 'Line Item',
    routes: [
      { method: 'GET', path: '/', desc: 'List line items with optional ?invoices_id filter. Joins inventory and USOC codes.', returns: 'Array of line item objects' },
      { method: 'GET', path: '/:id', desc: 'Get a single line item by ID with joins.', returns: 'Line item object or 404' },
      { method: 'POST', path: '/', desc: 'Create a new line item. Also auto-calculates variance from contracted_rate.', body: 'invoices_id, inventory_id, usoc_codes_id, description, charge_type, amount, mrc_amount, nrc_amount, contracted_rate, period_start, period_end', returns: '201 with created line item', roles: 'Admin, Manager' },
      { method: 'PUT', path: '/:id', desc: 'Update an existing line item. Recalculates variance and audit_status.', body: 'Same as POST fields', returns: 'Updated line item object', roles: 'Admin, Manager' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a line item. Blocked by cascadeGuard if allocations or disputes exist.', returns: '{ success: true } or 409', roles: 'Admin' },
      { method: 'PATCH', path: '/bulk', desc: 'Bulk update multiple line items.', body: '{ ids, updates }', returns: '{ updated: number }', roles: 'Admin, Manager' },
    ],
  },
  'orders.js': {
    file: `Orders API Routes — /api/orders\n * CRUD for telecom service orders.\n * Orders track provisioning requests linked to vendors, contracts, and inventory.`,
    table: 'orders', pk: 'orders_id', label: 'Order',
    routes: [
      { method: 'GET', path: '/', desc: 'List all orders with vendor, contract, and assigned user joins.', returns: 'Array of order objects' },
      { method: 'GET', path: '/:id', desc: 'Get a single order by ID with joins.', returns: 'Order object or 404' },
      { method: 'POST', path: '/', desc: 'Create a new service order.', body: 'vendors_id, contracts_id, inventory_id, order_number, description, contracted_rate, order_date, due_date, status, notes, assigned_users_id', returns: '201 with created order', roles: 'Admin, Manager' },
      { method: 'PUT', path: '/:id', desc: 'Update an existing order.', body: 'Same as POST fields', returns: 'Updated order object', roles: 'Admin, Manager' },
      { method: 'DELETE', path: '/:id', desc: 'Delete an order. Blocked by cascadeGuard if inventory is linked.', returns: '{ success: true } or 409', roles: 'Admin' },
      { method: 'PATCH', path: '/bulk', desc: 'Bulk update multiple orders.', body: '{ ids, updates }', returns: '{ updated: number }', roles: 'Admin, Manager' },
    ],
  },
  'allocations.js': {
    file: `Allocations API Routes — /api/allocations\n * CRUD for cost allocations (splitting line item charges across cost centers/departments).`,
    table: 'allocations', pk: 'allocations_id', label: 'Allocation',
    routes: [
      { method: 'GET', path: '/', desc: 'List all allocations with optional ?line_items_id filter. Joins line item data.', returns: 'Array of allocation objects' },
      { method: 'GET', path: '/:id', desc: 'Get a single allocation by ID.', returns: 'Allocation object or 404' },
      { method: 'POST', path: '/', desc: 'Create a new cost allocation.', body: 'line_items_id, cost_center, department, percentage, allocated_amount, notes', returns: '201 with created allocation', roles: 'Admin, Manager' },
      { method: 'PUT', path: '/:id', desc: 'Update an existing allocation.', body: 'Same as POST fields', returns: 'Updated allocation object', roles: 'Admin, Manager' },
      { method: 'DELETE', path: '/:id', desc: 'Delete an allocation.', returns: '{ success: true }', roles: 'Admin' },
      { method: 'PATCH', path: '/bulk', desc: 'Bulk update multiple allocations.', body: '{ ids, updates }', returns: '{ updated: number }', roles: 'Admin, Manager' },
    ],
  },
  'costSavings.js': {
    file: `Cost Savings API Routes — /api/cost-savings\n * CRUD for telecom cost savings opportunities and realizations.\n * Tracks identified/implemented/rejected savings by vendor, inventory, and invoice.`,
    table: 'cost_savings', pk: 'cost_savings_id', label: 'Cost Saving',
    routes: [
      { method: 'GET', path: '/', desc: 'List all cost savings with vendor join, ordered by identified_date desc.', returns: 'Array of cost savings objects with vendor_name' },
      { method: 'GET', path: '/:id', desc: 'Get a single cost savings record by ID with vendor join.', returns: 'Cost savings object or 404' },
      { method: 'POST', path: '/', desc: 'Create a new cost savings record.', body: 'vendors_id, inventory_id, line_items_id, invoices_id, category, description, identified_date, status, projected_savings, realized_savings', returns: '201 with created record', roles: 'Admin, Manager' },
      { method: 'PUT', path: '/:id', desc: 'Update an existing cost savings record.', body: 'Same as POST fields', returns: 'Updated record', roles: 'Admin, Manager' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a cost savings record.', returns: '{ success: true }', roles: 'Admin' },
      { method: 'PATCH', path: '/bulk', desc: 'Bulk update multiple cost savings records.', body: '{ ids, updates }', returns: '{ updated: number }', roles: 'Admin, Manager' },
    ],
  },
  'usocCodes.js': {
    file: `USOC Codes API Routes — /api/usoc-codes\n * CRUD for Universal Service Order Codes.\n * USOC codes classify telecom service types and their default charges.`,
    table: 'usoc_codes', pk: 'usoc_codes_id', label: 'USOC Code',
    routes: [
      { method: 'GET', path: '/', desc: 'List all USOC codes ordered by usoc_code.', returns: 'Array of USOC code objects' },
      { method: 'GET', path: '/:id', desc: 'Get a single USOC code by ID.', returns: 'USOC code object or 404' },
      { method: 'POST', path: '/', desc: 'Create a new USOC code.', body: 'usoc_code, description, category, sub_category, default_mrc, default_nrc, unit, status', returns: '201 with created USOC code', roles: 'Admin, Manager' },
      { method: 'PUT', path: '/:id', desc: 'Update an existing USOC code.', body: 'Same as POST fields', returns: 'Updated USOC code object', roles: 'Admin, Manager' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a USOC code. Blocked by cascadeGuard if contract rates or line items reference it.', returns: '{ success: true } or 409', roles: 'Admin' },
      { method: 'PATCH', path: '/bulk', desc: 'Bulk update multiple USOC codes.', body: '{ ids, updates }', returns: '{ updated: number }', roles: 'Admin, Manager' },
    ],
  },
  'contractRates.js': {
    file: `Contract Rates API Routes — /api/contract-rates\n * CRUD for rate schedules tied to contracts and USOC codes.\n * Used for rate validation (comparing billed amounts to contracted rates).`,
    table: 'contract_rates', pk: 'contract_rates_id', label: 'Contract Rate',
    routes: [
      { method: 'GET', path: '/', desc: 'List contract rates with optional ?contracts_id filter. Joins USOC codes and contracts.', returns: 'Array of rate objects with usoc_code, contract_number' },
      { method: 'GET', path: '/:id', desc: 'Get a single contract rate by ID.', returns: 'Contract rate object or 404' },
      { method: 'POST', path: '/', desc: 'Create a new contract rate.', body: 'contracts_id, usoc_codes_id, mrc, nrc, effective_date, expiration_date, notes', returns: '201 with created rate', roles: 'Admin, Manager' },
      { method: 'PUT', path: '/:id', desc: 'Update an existing contract rate.', body: 'Same as POST fields', returns: 'Updated rate object', roles: 'Admin, Manager' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a contract rate.', returns: '{ success: true }', roles: 'Admin' },
      { method: 'PATCH', path: '/bulk', desc: 'Bulk update multiple contract rates.', body: '{ ids, updates }', returns: '{ updated: number }', roles: 'Admin, Manager' },
    ],
  },
  'disputes.js': {
    file: `Disputes API Routes — /api/disputes\n * CRUD for billing disputes (overcharges, duplicates, wrong rates, etc.).\n * Disputes link to invoices, vendors, and optionally line items.`,
    table: 'disputes', pk: 'disputes_id', label: 'Dispute',
    routes: [
      { method: 'GET', path: '/', desc: 'List all disputes with vendor and invoice joins, ordered by filed_date desc.', returns: 'Array of dispute objects with vendor_name, invoice_number' },
      { method: 'GET', path: '/:id', desc: 'Get a single dispute by ID with joins.', returns: 'Dispute object or 404' },
      { method: 'POST', path: '/', desc: 'Create a new dispute.', body: 'line_items_id, invoices_id, vendors_id, dispute_type, amount, status, filed_date, resolved_date, resolution_notes, credit_amount, reference_number', returns: '201 with created dispute', roles: 'Admin, Manager' },
      { method: 'PUT', path: '/:id', desc: 'Update an existing dispute.', body: 'Same as POST fields', returns: 'Updated dispute object', roles: 'Admin, Manager' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a dispute.', returns: '{ success: true }', roles: 'Admin' },
      { method: 'PATCH', path: '/bulk', desc: 'Bulk update multiple disputes.', body: '{ ids, updates }', returns: '{ updated: number }', roles: 'Admin, Manager' },
    ],
  },
  'locations.js': {
    file: `Locations API Routes — /api/locations\n * CRUD for physical site locations.\n * Locations are referenced by inventory items for installation addresses.`,
    table: 'locations', pk: 'locations_id', label: 'Location',
    routes: [
      { method: 'GET', path: '/', desc: 'List all locations ordered by name.', returns: 'Array of location objects' },
      { method: 'GET', path: '/:id', desc: 'Get a single location by ID.', returns: 'Location object or 404' },
      { method: 'POST', path: '/', desc: 'Create a new location.', body: 'name, address_line1, address_line2, city, state, zip, country, location_type, status', returns: '201 with created location', roles: 'Admin, Manager' },
      { method: 'PUT', path: '/:id', desc: 'Update an existing location.', body: 'Same as POST fields', returns: 'Updated location object', roles: 'Admin, Manager' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a location.', returns: '{ success: true }', roles: 'Admin' },
      { method: 'PATCH', path: '/bulk', desc: 'Bulk update multiple locations.', body: '{ ids, updates }', returns: '{ updated: number }', roles: 'Admin, Manager' },
    ],
  },
  'notes.js': {
    file: `Notes API Routes — /api/notes\n * CRUD for entity-linked notes/comments.\n * Notes are polymorphic — they belong to any entity via entity_type + entity_id.`,
    table: 'notes', pk: 'notes_id', label: 'Note',
    routes: [
      { method: 'GET', path: '/', desc: 'List notes filtered by ?entity_type and ?entity_id query params. Joins user display_name.', returns: 'Array of note objects with user_display_name, ordered by created_at desc' },
      { method: 'POST', path: '/', desc: 'Create a new note. Automatically sets users_id from authenticated user.', body: 'entity_type, entity_id, body', returns: '201 with created note + user join' },
      { method: 'PUT', path: '/:id', desc: 'Update a note (body text only). Only the note author or Admin can edit.', body: 'body', returns: 'Updated note object' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a note. Only the note author or Admin can delete.', returns: '{ success: true }' },
    ],
  },
  'favorites.js': {
    file: `Favorites API Routes — /api/favorites\n * CRUD for user-bookmarked entities.\n * Favorites are scoped to the authenticated user (users_id).`,
    table: 'favorites', pk: 'favorites_id', label: 'Favorite',
    routes: [
      { method: 'GET', path: '/', desc: 'List all favorites for the current user, ordered by position, then created_at desc.', returns: 'Array of favorite objects' },
      { method: 'POST', path: '/', desc: 'Add a new favorite bookmark.', body: 'entity_type, entity_id, label, path', returns: '201 with created favorite' },
      { method: 'PUT', path: '/:id', desc: 'Update a favorite (label, position, path).', body: 'label, position, path', returns: 'Updated favorite object' },
      { method: 'DELETE', path: '/:id', desc: 'Remove a favorite bookmark.', returns: '{ success: true }' },
    ],
  },
  'search.js': {
    file: `Global Search API — /api/search\n * Full-text search across 6 entity tables (accounts, contracts, inventory, orders, invoices, usoc_codes).\n * Searches run in parallel with ILIKE pattern matching.`,
    table: null, pk: null, label: null,
    routes: [
      { method: 'GET', path: '/', desc: 'Search across all major entities using ?q= query param (min 2 chars). Returns grouped results from accounts, contracts, inventory, orders, invoices, and usoc_codes searched in parallel.', returns: '{ accounts: [], contracts: [], inventory: [], orders: [], invoices: [], usoc_codes: [] } (max 8 per group)' },
    ],
  },
  'tickets.js': {
    file: `Tickets API Routes — /api/tickets\n * CRUD for issue tracking tickets.\n * Tickets support priority, status, categories, and user assignment.`,
    table: 'tickets', pk: 'tickets_id', label: 'Ticket',
    routes: [
      { method: 'GET', path: '/', desc: 'List all tickets with assigned user and creator joins, ordered by created_at desc.', returns: 'Array of ticket objects with assigned_to and created_by_name' },
      { method: 'GET', path: '/:id', desc: 'Get a single ticket by ID with user joins.', returns: 'Ticket object or 404' },
      { method: 'POST', path: '/', desc: 'Create a new ticket. Auto-generates ticket_number (TICK-XXXXX).', body: 'title, description, priority, status, category, assigned_users_id', returns: '201 with created ticket', roles: 'Admin, Manager' },
      { method: 'PUT', path: '/:id', desc: 'Update an existing ticket. Sends notification if assigned_users_id changes.', body: 'Same as POST fields', returns: 'Updated ticket object', roles: 'Admin, Manager' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a ticket.', returns: '{ success: true }', roles: 'Admin' },
      { method: 'PATCH', path: '/bulk', desc: 'Bulk update multiple tickets.', body: '{ ids, updates }', returns: '{ updated: number }', roles: 'Admin, Manager' },
    ],
  },
  'users.js': {
    file: `Users API Routes — /api/users\n * User account management (CRUD + role assignment).\n * Resets auth cache on changes to keep permissions in sync.`,
    table: 'users', pk: 'users_id', label: 'User',
    routes: [
      { method: 'GET', path: '/', desc: 'List all users with role name join, ordered by display_name.', returns: 'Array of user objects with role_name' },
      { method: 'GET', path: '/:id', desc: 'Get a single user by ID with role join.', returns: 'User object or 404' },
      { method: 'POST', path: '/', desc: 'Create a new user. Sends welcome notification. Resets auth cache.', body: 'email, display_name, roles_id, status, sso_subject', returns: '201 with created user', roles: 'Admin' },
      { method: 'PUT', path: '/:id', desc: 'Update a user. Notifies on role/status changes. Resets auth cache.', body: 'Same as POST fields', returns: 'Updated user', roles: 'Admin' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a user. Resets auth cache.', returns: '{ success: true }', roles: 'Admin' },
    ],
  },
  'roles.js': {
    file: `Roles API Routes — /api/roles\n * Role management and permission assignment.\n * Admin-only. Resets auth cache on permission changes.`,
    table: 'roles', pk: 'roles_id', label: 'Role',
    routes: [
      { method: 'GET', path: '/', desc: 'List all roles with user count and permission count.', returns: 'Array of role objects with userCount, permissionCount' },
      { method: 'GET', path: '/resources', desc: 'List all unique permission resources.', returns: 'Array of resource name strings' },
      { method: 'GET', path: '/:id', desc: 'Get a single role with its full permissions list.', returns: 'Role object with permissions array' },
      { method: 'POST', path: '/', desc: 'Create a new role with permissions.', body: 'name, description, color, permissions: [{ resource, action }]', returns: '201 with created role + permissions', roles: 'Admin' },
      { method: 'PUT', path: '/:id', desc: 'Update a role and its permissions. Resets auth cache.', body: 'Same as POST', returns: 'Updated role + permissions', roles: 'Admin' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a role. Blocked if users are assigned to it.', returns: '{ success: true } or 409', roles: 'Admin' },
    ],
  },
  'notifications.js': {
    file: `Notifications API Routes — /api/notifications\n * In-app notification management for the authenticated user.\n * Notifications are created by the notification service and consumed here.`,
    table: 'notifications', pk: 'notifications_id', label: 'Notification',
    routes: [
      { method: 'GET', path: '/', desc: 'List notifications for the current user (last 50), most recent first.', returns: 'Array of notification objects' },
      { method: 'PUT', path: '/:id/read', desc: 'Mark a single notification as read.', returns: '{ success: true }' },
      { method: 'PUT', path: '/mark-all-read', desc: 'Mark all of the current user\'s notifications as read.', returns: '{ success: true }' },
    ],
  },
  'reports.js': {
    file: `Reports API Routes — /api/reports\n * Custom report generation and saved report management.\n * Supports dynamic entity queries, aggregation, and chart data.`,
    table: 'reports', pk: 'reports_id', label: 'Report',
    routes: [
      { method: 'GET', path: '/', desc: 'List all saved reports ordered by name.', returns: 'Array of report objects' },
      { method: 'GET', path: '/:id', desc: 'Get a saved report by ID.', returns: 'Report object or 404' },
      { method: 'POST', path: '/', desc: 'Save a new report configuration.', body: 'name, description, entity, columns, filters, group_by, sort_by, chart_type', returns: '201 with created report', roles: 'Admin, Manager, Analyst' },
      { method: 'PUT', path: '/:id', desc: 'Update a saved report.', body: 'Same as POST', returns: 'Updated report', roles: 'Admin, Manager, Analyst' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a saved report.', returns: '{ success: true }', roles: 'Admin' },
      { method: 'POST', path: '/execute', desc: 'Execute a report query dynamically. Builds a Knex query from entity, columns, filters, group_by, sort_by params.', body: '{ entity, columns, filters, group_by, sort_by, limit }', returns: '{ rows: [], totalCount: number }', roles: 'Admin, Manager, Analyst' },
    ],
  },
  'vendorRemit.js': {
    file: `Vendor Remit API Routes — /api/vendor-remit\n * CRUD for vendor payment/remittance information.\n * Stores bank details, payment methods, and remit-to addresses.`,
    table: 'vendor_remit', pk: 'vendor_remit_id', label: 'Vendor Remit',
    routes: [
      { method: 'GET', path: '/', desc: 'List all vendor remit records with vendor name join.', returns: 'Array of vendor remit objects' },
      { method: 'GET', path: '/:id', desc: 'Get a single vendor remit record by ID.', returns: 'Vendor remit object or 404' },
      { method: 'POST', path: '/', desc: 'Create a new vendor remit record.', body: 'vendors_id, payment_method, bank_name, routing_number, bank_account_number, remit_address, ...', returns: '201 with created record', roles: 'Admin, Manager' },
      { method: 'PUT', path: '/:id', desc: 'Update a vendor remit record.', body: 'Same as POST', returns: 'Updated record', roles: 'Admin, Manager' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a vendor remit record.', returns: '{ success: true }', roles: 'Admin' },
    ],
  },
  'announcements.js': {
    file: `Announcements API Routes — /api/announcements\n * CRUD for system-wide announcement banners.\n * Active announcements are shown to all users in the UI header.`,
    table: 'announcements', pk: 'announcements_id', label: 'Announcement',
    routes: [
      { method: 'GET', path: '/', desc: 'List all announcements, most recent first.', returns: 'Array of announcement objects' },
      { method: 'GET', path: '/active', desc: 'Get currently active announcements (active=true, within start/end dates).', returns: 'Array of active announcements' },
      { method: 'POST', path: '/', desc: 'Create a new announcement.', body: 'title, message, type, active, starts_at, ends_at', returns: '201 with created announcement', roles: 'Admin' },
      { method: 'PUT', path: '/:id', desc: 'Update an announcement.', body: 'Same as POST', returns: 'Updated announcement', roles: 'Admin' },
      { method: 'DELETE', path: '/:id', desc: 'Delete an announcement.', returns: '{ success: true }', roles: 'Admin' },
    ],
  },
  'fieldCatalog.js': {
    file: `Field Catalog API Routes — /api/field-catalog\n * CRUD for user-defined dropdown options (picklists).\n * Options are grouped by category and used across entity forms.`,
    table: 'field_catalog', pk: 'field_catalog_id', label: 'Field Option',
    routes: [
      { method: 'GET', path: '/', desc: 'List all field catalog entries, or filter by ?category. Grouped by category.', returns: 'Array of field catalog objects' },
      { method: 'POST', path: '/', desc: 'Create a new field catalog entry.', body: 'category, value, label, sort_order, active', returns: '201 with created entry', roles: 'Admin' },
      { method: 'PUT', path: '/:id', desc: 'Update a field catalog entry.', body: 'Same as POST', returns: 'Updated entry', roles: 'Admin' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a field catalog entry.', returns: '{ success: true }', roles: 'Admin' },
    ],
  },
  'formInstructions.js': {
    file: `Form Instructions API Routes — /api/form-instructions\n * CRUD for form helper blurbs shown above entity forms.\n * Configured per entity/form to guide users.`,
    table: 'form_instructions', pk: 'id', label: 'Form Instruction',
    routes: [
      { method: 'GET', path: '/', desc: 'List all form instructions, optionally filtered by ?entity.', returns: 'Array of form instruction objects' },
      { method: 'POST', path: '/', desc: 'Create or upsert a form instruction.', body: 'entity, form, title, body', returns: '201 with created instruction', roles: 'Admin' },
      { method: 'PUT', path: '/:id', desc: 'Update a form instruction.', body: 'Same as POST', returns: 'Updated instruction', roles: 'Admin' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a form instruction.', returns: '{ success: true }', roles: 'Admin' },
    ],
  },
  'spendCategories.js': {
    file: `Spend Categories API Routes — /api/spend-categories\n * CRUD for hierarchical spending classification.\n * Supports parent-child relationships for category trees.`,
    table: 'spend_categories', pk: 'spend_categories_id', label: 'Spend Category',
    routes: [
      { method: 'GET', path: '/', desc: 'List all spend categories with parent category join.', returns: 'Array of spend category objects with parent_name' },
      { method: 'POST', path: '/', desc: 'Create a new spend category.', body: 'name, description, parent_id', returns: '201 with created category', roles: 'Admin' },
      { method: 'PUT', path: '/:id', desc: 'Update a spend category.', body: 'Same as POST', returns: 'Updated category', roles: 'Admin' },
      { method: 'DELETE', path: '/:id', desc: 'Delete a spend category.', returns: '{ success: true }', roles: 'Admin' },
    ],
  },
  'batchUpload.js': {
    file: `Batch Upload API Routes — /api/batch-upload\n * Handles Excel template parsing and bulk data import.\n * Supports vendors, accounts, contracts, inventory, orders, invoices, line_items.`,
    table: null, pk: null, label: null,
    routes: [
      { method: 'POST', path: '/', desc: 'Upload and process an Excel file for bulk import. Parses the spreadsheet, validates data, and inserts rows into the target table. Reports success/error counts.', body: 'multipart/form-data: file (Excel), entity (string)', returns: '{ inserted: number, errors: [], skipped: number }', roles: 'Admin' },
    ],
  },
  'workflows.js': {
    file: `Workflows API Routes — /api/workflows\n * Workflow execution history, manual triggering, and step inspection.\n * Uses the workflow engine to execute registered workflow definitions.`,
    table: 'workflow_runs', pk: 'workflow_runs_id', label: 'Workflow',
    routes: [
      { method: 'GET', path: '/', desc: 'List all workflow runs with step counts and triggered-by user, ordered by started_at desc.', returns: 'Array of workflow run objects' },
      { method: 'GET', path: '/definitions', desc: 'List all registered workflow definitions.', returns: 'Array of { key, name, description, stepCount }' },
      { method: 'GET', path: '/:id', desc: 'Get a single workflow run by ID with all steps ordered by step number.', returns: 'Workflow run object + steps array' },
      { method: 'POST', path: '/trigger', desc: 'Trigger execution of a named workflow. Runs the workflow engine with provided context.', body: '{ workflow_key, context }', returns: 'Workflow run result from engine', roles: 'Admin, Manager' },
    ],
  },
  'invoiceReader.js': {
    file: `Invoice Reader API Routes — /api/invoice-reader\n * PDF invoice upload, OCR parsing, and automated line-item extraction.\n * Supports upload, profile-based parsing, and manual review workflows.`,
    table: 'invoice_reader_uploads', pk: 'upload_id', label: 'Upload',
    routes: [],
  },
  'emailConfig.js': {
    file: `Email Config API Routes — /api/email-config\n * SMTP configuration management and test email sending.\n * Admin-only. Config is stored in the email_config DB table.`,
    table: 'email_config', pk: 'email_config_id', label: 'Email Config',
    routes: [
      { method: 'GET', path: '/', desc: 'Get the current email configuration. Masks SMTP password.', returns: 'Email config object with smtp_pass masked' },
      { method: 'PUT', path: '/', desc: 'Update email configuration. Flushes transporter cache.', body: 'smtp_host, smtp_port, smtp_secure, smtp_user, smtp_pass, from_name, from_address, reply_to, enabled, notify_* toggles', returns: 'Updated config', roles: 'Admin' },
      { method: 'POST', path: '/test', desc: 'Send a test email to the specified address.', body: '{ to }', returns: 'Email log record', roles: 'Admin' },
    ],
  },
  'adminDashboard.js': {
    file: `Admin Dashboard API Routes — /api/admin-dashboard\n * System health, maintenance tools, and cascade entity purge.\n * All endpoints require Admin role.`,
    table: null, pk: null, label: null,
    routes: [
      { method: 'GET', path: '/', desc: 'Aggregated admin dashboard: 23 parallel table counts, system stats (Node.js, OS, v8 heap), recent activity.', returns: 'Full admin dashboard payload' },
      { method: 'GET', path: '/db-stats', desc: 'PostgreSQL table sizes, row counts, dead rows, connection pool stats, migration history.', returns: '{ tableStats, pool, migrations }' },
      { method: 'POST', path: '/purge', desc: 'Time-based data purge for audit_log, email_log, notifications, workflow_runs. Minimum 7-day retention.', body: '{ target, olderThanDays }', returns: '{ deleted: number, target, olderThanDays }' },
      { method: 'POST', path: '/retry-emails', desc: 'Re-send up to 20 failed emails with retry_count < 5.', returns: '{ retried: number, succeeded: number, failed: number, results: [] }' },
      { method: 'GET', path: '/purge-preview/:entity/:id', desc: 'Preview cascading dependencies for a vendor/invoice/inventory item before deletion.', returns: '{ id, entity, name, label, dependencies: [], totalDependentRecords }' },
      { method: 'DELETE', path: '/purge-entity/:entity/:id', desc: 'Execute cascade delete of an entity and all dependent records in a transaction.', returns: '{ success, entity, id, name, label, dependentsDeleted, details }' },
    ],
  },
};

// ── Generate JSDoc block for a single route ────────────────────
function routeJsDoc(r, prefix) {
  const lines = ['/**'];
  lines.push(` * ${r.method} ${prefix}${r.path}`);
  lines.push(` * ${r.desc}`);
  if (r.roles) lines.push(` * @auth Requires role: ${r.roles}`);
  if (r.body) lines.push(` * @body ${r.body}`);
  lines.push(` * @returns ${r.returns}`);
  lines.push(' */');
  return lines.join('\n');
}

// ── Process a single route file ────────────────────────────────
function processFile(filename, meta) {
  const filePath = path.join(ROUTES_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`  SKIP (not found): ${filename}`);
    return;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // Skip if already has our JSDoc header
  if (content.startsWith('/**\n * @file')) {
    console.log(`  SKIP (already documented): ${filename}`);
    return;
  }

  // 1. Prepend file-level JSDoc
  const fileDoc = [
    '/**',
    ` * @file ${filename} — ${meta.file}`,
    ' *',
    ` * @module routes/${filename.replace('.js', '')}`,
    ' */',
    '',
  ].join('\n');

  // 2. Add route-level JSDoc before each router.METHOD line
  const prefix = '';  // routes are relative to their mount point
  for (const r of (meta.routes || [])) {
    // Build a regex to find the router handler declaration
    const method = r.method.toLowerCase();
    // Escape the path for regex
    const escapedPath = r.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Match: router.get('/', ...) or router.get('/:id', ...)
    const pattern = new RegExp(
      `(^|\\n)(router\\.${method}\\('${escapedPath}')`
    );
    const match = content.match(pattern);
    if (match) {
      const doc = routeJsDoc(r, prefix);
      content = content.replace(pattern, `$1${doc}\n$2`);
    }
  }

  // Write back
  const output = fileDoc + content;
  fs.writeFileSync(filePath, output, 'utf8');
  console.log(`  DONE: ${filename} (${(meta.routes || []).length} routes documented)`);
}

// ── Main ───────────────────────────────────────────────────────
console.log('Adding JSDoc comments to route files...\n');
for (const [filename, meta] of Object.entries(ROUTE_DOCS)) {
  processFile(filename, meta);
}
console.log('\nDone!');
