/**
 * One-time script to add JSDoc comments to all client source files.
 * Run:  node scripts/addClientJsDoc.js
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

/* ------------------------------------------------------------------ */
/*  FILE METADATA                                                      */
/* ------------------------------------------------------------------ */
const FILE_DOCS = {
  // ── api.js ────────────────────────────────────────────────────────
  'api.js': {
    file: 'Centralized API client for all backend communication.',
    module: 'api',
    description: [
      'Creates an Axios instance with baseURL "/api" and attaches a request',
      'interceptor to include the X-Dev-User-Id header for demo impersonation.',
      'Exports named async functions for every REST endpoint in the TEMS backend.',
      'Each function returns an Axios response promise wrapping { data }.',
    ],
    functions: [
      // Dashboard / Search
      { name: 'getDashboard', sig: '() => Promise<AxiosResponse>', desc: 'Fetch operational dashboard KPIs, charts, and recent activity.' },
      { name: 'globalSearch', sig: '(q: string) => Promise<AxiosResponse>', desc: 'Full-text search across all entity types.', params: [['q', 'string', 'Search query string']] },
      // Vendors
      { name: 'getVendors', sig: '() => Promise<AxiosResponse>', desc: 'List all vendors.' },
      { name: 'getVendor', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get a single vendor by ID.', params: [['id', 'number', 'Vendor primary key']] },
      { name: 'getVendorInventory', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get inventory items linked to a vendor.', params: [['id', 'number', 'Vendor primary key']] },
      { name: 'createVendor', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a new vendor.', params: [['d', 'Object', 'Vendor fields (name, contact_name, contact_email, etc.)']] },
      { name: 'updateVendor', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update an existing vendor.', params: [['id', 'number', 'Vendor primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteVendor', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a vendor by ID.', params: [['id', 'number', 'Vendor primary key']] },
      // Accounts
      { name: 'getAccounts', sig: '() => Promise<AxiosResponse>', desc: 'List all billing accounts.' },
      { name: 'getAccount', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get a single account by ID.', params: [['id', 'number', 'Account primary key']] },
      { name: 'getAccountInventory', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get inventory items linked to an account.', params: [['id', 'number', 'Account primary key']] },
      { name: 'createAccount', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a new billing account.', params: [['d', 'Object', 'Account fields (account_number, vendors_id, etc.)']] },
      { name: 'updateAccount', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update an existing account.', params: [['id', 'number', 'Account primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteAccount', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete an account by ID.', params: [['id', 'number', 'Account primary key']] },
      // Locations
      { name: 'getLocations', sig: '() => Promise<AxiosResponse>', desc: 'List all locations.' },
      { name: 'getLocation', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get a single location by ID.', params: [['id', 'number', 'Location primary key']] },
      { name: 'createLocation', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a new location.', params: [['d', 'Object', 'Location fields (name, address, city, state, zip)']] },
      { name: 'updateLocation', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update an existing location.', params: [['id', 'number', 'Location primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteLocation', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a location by ID.', params: [['id', 'number', 'Location primary key']] },
      // Field Catalog
      { name: 'getFieldCatalog', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List field catalog entries with optional query params.', params: [['params', 'Object=', 'Optional filter query params (category, etc.)']] },
      { name: 'createFieldCatalog', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a field catalog entry.', params: [['d', 'Object', 'Field catalog entry data']] },
      { name: 'updateFieldCatalog', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update a field catalog entry.', params: [['id', 'number', 'Field catalog entry primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteFieldCatalog', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a field catalog entry.', params: [['id', 'number', 'Field catalog entry primary key']] },
      // Vendor Remit
      { name: 'getVendorRemits', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List vendor remittance records with optional filters.', params: [['params', 'Object=', 'Optional filter query params']] },
      { name: 'getVendorRemit', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get a single vendor remittance record.', params: [['id', 'number', 'Vendor remit primary key']] },
      { name: 'createVendorRemit', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a vendor remittance record.', params: [['d', 'Object', 'Vendor remit fields']] },
      { name: 'updateVendorRemit', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update a vendor remittance record.', params: [['id', 'number', 'Vendor remit primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteVendorRemit', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a vendor remittance record.', params: [['id', 'number', 'Vendor remit primary key']] },
      // Announcements
      { name: 'getAnnouncements', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List announcements with optional filters.', params: [['params', 'Object=', 'Optional filter query params']] },
      { name: 'createAnnouncement', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a new announcement.', params: [['d', 'Object', 'Announcement fields (title, body, type, active, etc.)']] },
      { name: 'updateAnnouncement', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update an announcement.', params: [['id', 'number', 'Announcement primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteAnnouncement', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete an announcement.', params: [['id', 'number', 'Announcement primary key']] },
      // Spend Categories
      { name: 'getSpendCategories', sig: '() => Promise<AxiosResponse>', desc: 'List all spend categories.' },
      { name: 'createSpendCategory', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a spend category.', params: [['d', 'Object', 'Spend category fields']] },
      { name: 'updateSpendCategory', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update a spend category.', params: [['id', 'number', 'Spend category primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteSpendCategory', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a spend category.', params: [['id', 'number', 'Spend category primary key']] },
      // Contracts
      { name: 'getContracts', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List contracts with optional filters.', params: [['params', 'Object=', 'Optional filter query params']] },
      { name: 'getContract', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get a single contract by ID.', params: [['id', 'number', 'Contract primary key']] },
      { name: 'getContractInventory', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get inventory items linked to a contract.', params: [['id', 'number', 'Contract primary key']] },
      { name: 'getContractOrders', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get orders linked to a contract.', params: [['id', 'number', 'Contract primary key']] },
      { name: 'createContract', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a new contract.', params: [['d', 'Object', 'Contract fields']] },
      { name: 'updateContract', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update an existing contract.', params: [['id', 'number', 'Contract primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteContract', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a contract by ID.', params: [['id', 'number', 'Contract primary key']] },
      // Inventory
      { name: 'getInventory', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List inventory items with optional filters.', params: [['params', 'Object=', 'Optional filter query params']] },
      { name: 'getInventoryItem', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get a single inventory item by ID.', params: [['id', 'number', 'Inventory primary key']] },
      { name: 'getInventoryItemInvoices', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get invoices associated with an inventory item.', params: [['id', 'number', 'Inventory primary key']] },
      { name: 'createInventoryItem', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a new inventory item.', params: [['d', 'Object', 'Inventory item fields']] },
      { name: 'updateInventoryItem', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update an inventory item.', params: [['id', 'number', 'Inventory primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteInventoryItem', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete an inventory item.', params: [['id', 'number', 'Inventory primary key']] },
      // Orders
      { name: 'getOrders', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List orders with optional filters.', params: [['params', 'Object=', 'Optional filter query params']] },
      { name: 'getOrder', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get a single order by ID.', params: [['id', 'number', 'Order primary key']] },
      { name: 'getOrderInventory', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get inventory items linked to an order.', params: [['id', 'number', 'Order primary key']] },
      { name: 'createOrder', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a new order.', params: [['d', 'Object', 'Order fields']] },
      { name: 'updateOrder', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update an order.', params: [['id', 'number', 'Order primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteOrder', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete an order.', params: [['id', 'number', 'Order primary key']] },
      // Invoices
      { name: 'getInvoices', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List invoices with optional filters.', params: [['params', 'Object=', 'Optional filter query params']] },
      { name: 'getInvoice', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get a single invoice by ID.', params: [['id', 'number', 'Invoice primary key']] },
      { name: 'createInvoice', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a new invoice.', params: [['d', 'Object', 'Invoice fields']] },
      { name: 'updateInvoice', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update an invoice.', params: [['id', 'number', 'Invoice primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteInvoice', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete an invoice.', params: [['id', 'number', 'Invoice primary key']] },
      // Line Items
      { name: 'getLineItems', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List line items with optional filters.', params: [['params', 'Object=', 'Optional filter query params (invoices_id, etc.)']] },
      { name: 'createLineItem', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a new line item.', params: [['d', 'Object', 'Line item fields']] },
      { name: 'updateLineItem', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update a line item.', params: [['id', 'number', 'Line item primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteLineItem', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a line item.', params: [['id', 'number', 'Line item primary key']] },
      // Allocations
      { name: 'getAllocations', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List allocations with optional filters.', params: [['params', 'Object=', 'Optional filter query params']] },
      { name: 'createAllocation', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a new cost allocation.', params: [['d', 'Object', 'Allocation fields']] },
      { name: 'deleteAllocation', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete an allocation.', params: [['id', 'number', 'Allocation primary key']] },
      // Cost Savings
      { name: 'getCostSavings', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List cost savings entries with optional filters.', params: [['params', 'Object=', 'Optional filter query params']] },
      { name: 'createCostSaving', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a cost saving entry.', params: [['d', 'Object', 'Cost saving fields']] },
      { name: 'updateCostSaving', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update a cost saving entry.', params: [['id', 'number', 'Cost saving primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteCostSaving', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a cost saving entry.', params: [['id', 'number', 'Cost saving primary key']] },
      // USOC Codes
      { name: 'getUsocCodes', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List USOC codes with optional filters.', params: [['params', 'Object=', 'Optional filter query params']] },
      { name: 'getUsocCode', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get a single USOC code by ID.', params: [['id', 'number', 'USOC code primary key']] },
      { name: 'createUsocCode', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a USOC code.', params: [['d', 'Object', 'USOC code fields']] },
      { name: 'updateUsocCode', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update a USOC code.', params: [['id', 'number', 'USOC code primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteUsocCode', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a USOC code.', params: [['id', 'number', 'USOC code primary key']] },
      // Contract Rates
      { name: 'getContractRates', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List contract rates with optional filters.', params: [['params', 'Object=', 'Optional filter query params (contracts_id, etc.)']] },
      { name: 'createContractRate', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a contract rate.', params: [['d', 'Object', 'Contract rate fields']] },
      { name: 'updateContractRate', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update a contract rate.', params: [['id', 'number', 'Contract rate primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteContractRate', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a contract rate.', params: [['id', 'number', 'Contract rate primary key']] },
      // Disputes
      { name: 'getDisputes', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List disputes with optional filters.', params: [['params', 'Object=', 'Optional filter query params']] },
      { name: 'getDispute', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get a single dispute by ID.', params: [['id', 'number', 'Dispute primary key']] },
      { name: 'createDispute', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a new dispute.', params: [['d', 'Object', 'Dispute fields']] },
      { name: 'updateDispute', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update a dispute.', params: [['id', 'number', 'Dispute primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteDispute', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a dispute.', params: [['id', 'number', 'Dispute primary key']] },
      // Rate Validation
      { name: 'getRateValidation', sig: '() => Promise<AxiosResponse>', desc: 'Run rate validation to compare contract rates against billed charges.' },
      // Auth / Users
      { name: 'getCurrentUser', sig: '() => Promise<AxiosResponse>', desc: 'Get the currently authenticated user profile.' },
      { name: 'updateMyPreferences', sig: '(prefs: Object) => Promise<AxiosResponse>', desc: 'Update the current user\'s preferences.', params: [['prefs', 'Object', 'Preference key-value pairs (theme, rows_per_page, etc.)']] },
      { name: 'getDemoUsers', sig: '() => Promise<AxiosResponse>', desc: 'List available demo users for impersonation.' },
      { name: 'getUsers', sig: '() => Promise<AxiosResponse>', desc: 'List all users.' },
      { name: 'getUser', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get a single user by ID.', params: [['id', 'number', 'User primary key']] },
      { name: 'createUser', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a new user.', params: [['d', 'Object', 'User fields (username, email, roles_id, etc.)']] },
      { name: 'updateUser', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update a user.', params: [['id', 'number', 'User primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'setUserStatus', sig: '(id: number, status: string) => Promise<AxiosResponse>', desc: 'Toggle a user\'s active/inactive status.', params: [['id', 'number', 'User primary key'], ['status', 'string', '"active" or "inactive"']] },
      { name: 'deleteUser', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a user.', params: [['id', 'number', 'User primary key']] },
      { name: 'getUserInvoices', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get invoices assigned to a user.', params: [['id', 'number', 'User primary key']] },
      { name: 'getUserOrders', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get orders assigned to a user.', params: [['id', 'number', 'User primary key']] },
      { name: 'getUserActivity', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get recent activity/audit log for a user.', params: [['id', 'number', 'User primary key']] },
      // Roles
      { name: 'getRoles', sig: '() => Promise<AxiosResponse>', desc: 'List all roles.' },
      { name: 'getRole', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get a single role by ID.', params: [['id', 'number', 'Role primary key']] },
      { name: 'getRoleUsers', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get users assigned to a role.', params: [['id', 'number', 'Role primary key']] },
      { name: 'createRole', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a new role.', params: [['d', 'Object', 'Role fields (name, description, permissions, etc.)']] },
      { name: 'updateRole', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update a role.', params: [['id', 'number', 'Role primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteRole', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a role.', params: [['id', 'number', 'Role primary key']] },
      { name: 'getPermissions', sig: '() => Promise<AxiosResponse>', desc: 'Get all available permissions (resource × action matrix).' },
      // Audit
      { name: 'getAuditLog', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List audit log entries with optional filters.', params: [['params', 'Object=', 'Optional filter query params (action, resource, etc.)']] },
      { name: 'getAuditHistory', sig: '(resource: string, id: number) => Promise<AxiosResponse>', desc: 'Get the audit trail for a specific entity.', params: [['resource', 'string', 'Entity type (e.g. "vendors")'], ['id', 'number', 'Entity primary key']] },
      // Batch Upload
      { name: 'getBatchTables', sig: '() => Promise<AxiosResponse>', desc: 'List tables available for batch upload.' },
      { name: 'downloadBatchTemplate', sig: '(table: string) => Promise<AxiosResponse>', desc: 'Download an Excel template for batch upload.', params: [['table', 'string', 'Table name to get the template for']] },
      { name: 'uploadBatchFile', sig: '(table: string, file: File) => Promise<AxiosResponse>', desc: 'Upload a file for batch import into a table.', params: [['table', 'string', 'Target table name'], ['file', 'File', 'Excel/CSV file to upload']] },
      // Favorites
      { name: 'getFavorites', sig: '() => Promise<AxiosResponse>', desc: 'List the current user\'s favorites.' },
      { name: 'createFavorite', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Add a favorite bookmark.', params: [['d', 'Object', 'Favorite fields (name, path, filters)']] },
      { name: 'renameFavorite', sig: '(id: number, name: string) => Promise<AxiosResponse>', desc: 'Rename a favorite.', params: [['id', 'number', 'Favorite primary key'], ['name', 'string', 'New display name']] },
      { name: 'deleteFavorite', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a favorite.', params: [['id', 'number', 'Favorite primary key']] },
      // Notes
      { name: 'getNotes', sig: '(entityType: string, entityId: number) => Promise<AxiosResponse>', desc: 'Get notes for a specific entity.', params: [['entityType', 'string', 'Entity type (e.g. "vendors")'], ['entityId', 'number', 'Entity primary key']] },
      { name: 'createNote', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Add a note to an entity.', params: [['d', 'Object', 'Note fields (entity_type, entity_id, body)']] },
      { name: 'deleteNote', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a note.', params: [['id', 'number', 'Note primary key']] },
      // Invoice Reader
      { name: 'getReaderFields', sig: '() => Promise<AxiosResponse>', desc: 'Get available target fields for invoice/line item mapping.' },
      { name: 'parseInvoiceFile', sig: '(file: File) => Promise<AxiosResponse>', desc: 'Upload and parse a file, returning format detection and preview.', params: [['file', 'File', 'Excel, EDI, or PDF file to parse']] },
      { name: 'processInvoiceFile', sig: '(file: File, opts?: Object) => Promise<AxiosResponse>', desc: 'Batch import invoices using a template/profile mapping.', params: [['file', 'File', 'File to process'], ['opts', 'Object=', '{ template_id, vendors_id, mappings, sheet_name, profile_id }']] },
      { name: 'getReaderTemplates', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List parsing templates.', params: [['params', 'Object=', 'Optional filter query params']] },
      { name: 'createReaderTemplate', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Save a new parsing template.', params: [['d', 'Object', 'Template fields (name, mappings, etc.)']] },
      { name: 'deleteReaderTemplate', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a parsing template.', params: [['id', 'number', 'Template primary key']] },
      { name: 'getReaderUploads', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List historical uploads.', params: [['params', 'Object=', 'Optional filter query params']] },
      // Reader Profiles
      { name: 'getReaderProfiles', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List invoice reader profiles.', params: [['params', 'Object=', 'Optional filter query params']] },
      { name: 'getReaderProfile', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get a single reader profile.', params: [['id', 'number', 'Profile primary key']] },
      { name: 'createReaderProfile', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a reader profile.', params: [['d', 'Object', 'Profile fields']] },
      { name: 'updateReaderProfile', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update a reader profile.', params: [['id', 'number', 'Profile primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteReaderProfile', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a reader profile.', params: [['id', 'number', 'Profile primary key']] },
      { name: 'testProfileMatch', sig: '(file: File) => Promise<AxiosResponse>', desc: 'Test which profile matches an uploaded file.', params: [['file', 'File', 'File to test']] },
      // Reader Exceptions
      { name: 'getReaderExceptions', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List invoice reader exceptions.', params: [['params', 'Object=', 'Optional filter query params']] },
      { name: 'getReaderExceptionStats', sig: '() => Promise<AxiosResponse>', desc: 'Get aggregate statistics for reader exceptions.' },
      { name: 'getReaderException', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get a single reader exception by ID.', params: [['id', 'number', 'Exception primary key']] },
      { name: 'resolveReaderException', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Resolve an exception with corrected data.', params: [['id', 'number', 'Exception primary key'], ['d', 'Object', 'Resolution data']] },
      { name: 'updateReaderException', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update/ignore an exception.', params: [['id', 'number', 'Exception primary key'], ['d', 'Object', 'Fields to update']] },
      // Tickets
      { name: 'getTickets', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List support tickets with optional filters.', params: [['params', 'Object=', 'Optional filter query params']] },
      { name: 'getTicket', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get a single ticket by ID.', params: [['id', 'number', 'Ticket primary key']] },
      { name: 'createTicket', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a new support ticket.', params: [['d', 'Object', 'Ticket fields (subject, description, category, priority, etc.)']] },
      { name: 'updateTicket', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update a ticket.', params: [['id', 'number', 'Ticket primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteTicket', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a ticket.', params: [['id', 'number', 'Ticket primary key']] },
      { name: 'addTicketComment', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Add a comment to a ticket.', params: [['id', 'number', 'Ticket primary key'], ['d', 'Object', '{ body }']] },
      { name: 'deleteTicketComment', sig: '(tid: number, cid: number) => Promise<AxiosResponse>', desc: 'Delete a ticket comment.', params: [['tid', 'number', 'Ticket primary key'], ['cid', 'number', 'Comment primary key']] },
      { name: 'getTicketMeta', sig: '() => Promise<AxiosResponse>', desc: 'Get ticket metadata (categories, priorities, statuses).' },
      // Reports
      { name: 'getReportCatalog', sig: '() => Promise<AxiosResponse>', desc: 'Get the report type catalog with available columns and filters.' },
      { name: 'runReport', sig: '(config: Object) => Promise<AxiosResponse>', desc: 'Execute a report with the given configuration.', params: [['config', 'Object', 'Report config (type, columns, filters, sort, etc.)']] },
      { name: 'getSavedReports', sig: '() => Promise<AxiosResponse>', desc: 'List saved report configurations.' },
      { name: 'getSavedReport', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get a single saved report by ID.', params: [['id', 'number', 'Saved report primary key']] },
      { name: 'saveReport', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Save a new report configuration.', params: [['d', 'Object', 'Report config to save']] },
      { name: 'updateSavedReport', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update a saved report.', params: [['id', 'number', 'Saved report primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteSavedReport', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a saved report.', params: [['id', 'number', 'Saved report primary key']] },
      // Notifications
      { name: 'getNotifications', sig: '() => Promise<AxiosResponse>', desc: 'Get the current user\'s notifications.' },
      { name: 'markNotificationRead', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Mark a single notification as read.', params: [['id', 'number', 'Notification primary key']] },
      { name: 'markAllNotificationsRead', sig: '() => Promise<AxiosResponse>', desc: 'Mark all notifications as read.' },
      // Form Instructions
      { name: 'getFormInstructions', sig: '() => Promise<AxiosResponse>', desc: 'List all form instruction entries.' },
      { name: 'getFormInstructionByFormId', sig: '(formId: string) => Promise<AxiosResponse>', desc: 'Get instruction for a specific form.', params: [['formId', 'string', 'Form identifier string']] },
      { name: 'createFormInstruction', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Create a form instruction.', params: [['d', 'Object', 'Form instruction fields']] },
      { name: 'updateFormInstruction', sig: '(id: number, d: Object) => Promise<AxiosResponse>', desc: 'Update a form instruction.', params: [['id', 'number', 'Form instruction primary key'], ['d', 'Object', 'Fields to update']] },
      { name: 'deleteFormInstruction', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Delete a form instruction.', params: [['id', 'number', 'Form instruction primary key']] },
      // Workflows
      { name: 'getWorkflowRuns', sig: '() => Promise<AxiosResponse>', desc: 'List workflow run instances.' },
      { name: 'getWorkflowRun', sig: '(id: number) => Promise<AxiosResponse>', desc: 'Get a single workflow run with steps.', params: [['id', 'number', 'Workflow run primary key']] },
      { name: 'getWorkflowDefinitions', sig: '() => Promise<AxiosResponse>', desc: 'List available workflow definitions.' },
      { name: 'executeWorkflow', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Execute a workflow.', params: [['d', 'Object', '{ workflow_key, context }']] },
      { name: 'runWorkflowDemo', sig: '(key: string, d: Object) => Promise<AxiosResponse>', desc: 'Run a workflow demo with sample data.', params: [['key', 'string', 'Workflow definition key'], ['d', 'Object', 'Demo context data']] },
      // Bulk Update
      { name: 'bulkUpdate', sig: '(resource: string, ids: number[], updates: Object) => Promise<AxiosResponse>', desc: 'Bulk-update multiple records in a resource table.', params: [['resource', 'string', 'Route resource name (e.g. "vendors")'], ['ids', 'number[]', 'Array of primary keys to update'], ['updates', 'Object', 'Field-value pairs to apply']] },
      // Email Config
      { name: 'getEmailConfig', sig: '() => Promise<AxiosResponse>', desc: 'Get the current email/SMTP configuration.' },
      { name: 'updateEmailConfig', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Update email configuration settings.', params: [['d', 'Object', 'SMTP config fields']] },
      { name: 'sendTestEmail', sig: '(d: Object) => Promise<AxiosResponse>', desc: 'Send a test email.', params: [['d', 'Object', '{ to }']] },
      { name: 'getEmailLog', sig: '(params?: Object) => Promise<AxiosResponse>', desc: 'List email send log entries.', params: [['params', 'Object=', 'Optional filter query params']] },
      // Admin Dashboard
      { name: 'getAdminDashboard', sig: '() => Promise<AxiosResponse>', desc: 'Get admin dashboard data (system health, table counts, etc.).' },
      { name: 'getAdminDbStats', sig: '() => Promise<AxiosResponse>', desc: 'Get detailed database statistics (table sizes, row counts).' },
      { name: 'adminPurge', sig: '(data: Object) => Promise<AxiosResponse>', desc: 'Purge old data from the system.', params: [['data', 'Object', 'Purge configuration ({ table, before_date })']] },
      { name: 'adminRetryEmails', sig: '() => Promise<AxiosResponse>', desc: 'Retry all failed email sends.' },
      { name: 'adminPurgePreview', sig: '(entity: string, id: number) => Promise<AxiosResponse>', desc: 'Preview what would be deleted if an entity is purged.', params: [['entity', 'string', 'Entity type (e.g. "vendors")'], ['id', 'number', 'Entity primary key']] },
      { name: 'adminPurgeEntity', sig: '(entity: string, id: number) => Promise<AxiosResponse>', desc: 'Permanently delete an entity and all cascading dependents.', params: [['entity', 'string', 'Entity type'], ['id', 'number', 'Entity primary key']] },
    ],
  },

  // ── PageTitleContext.js ────────────────────────────────────────────
  'PageTitleContext.js': {
    file: 'React context for dynamic page title management.',
    module: 'PageTitleContext',
    description: [
      'Provides a shared setPageTitle function so detail pages can update the',
      'header breadcrumb title from anywhere in the component tree.',
    ],
  },

  // ── main.jsx ──────────────────────────────────────────────────────
  'main.jsx': {
    file: 'Application entry point. Mounts the React root.',
    module: 'main',
    description: [
      'Wraps <App /> in React.StrictMode and ConsoleErrorProvider.',
      'Also registers a global click handler for date-input toggle behavior.',
    ],
  },

  // ── App.jsx ───────────────────────────────────────────────────────
  'App.jsx': {
    file: 'Root application shell with routing, navigation, and global UI.',
    module: 'App',
    description: [
      'Defines the full application layout: sidebar navigation, header bar (with',
      'global search, notifications, recent items, favorites), breadcrumbs,',
      'AnnouncementBanner, and all <Route> definitions. Contains sub-components:',
      'GlobalSearch, RecentItems, NotificationCenter, AppShell, and ErrorBoundary.',
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  CONTEXT FILES                                                      */
/* ------------------------------------------------------------------ */
const CONTEXT_DOCS = {
  'context/AuthContext.jsx': {
    file: 'Authentication context provider and useAuth hook.',
    module: 'AuthContext',
    description: [
      'Loads the current user and demo user list on mount. Exposes auth state,',
      'role/permission checks (hasPermission, hasRole, canWrite, isAdmin),',
      'user preference updates, and demo-user impersonation switching.',
    ],
    exports: [
      { name: 'AuthProvider', type: 'component', props: '{ children }', desc: 'Wraps the app in auth context, fetching user on mount.' },
      { name: 'useAuth', type: 'hook', desc: 'Returns { user, loading, demoUsers, isImpersonating, refreshUser, updatePreferences, hasPermission, hasRole, canWrite, isAdmin, switchDemoUser, endImpersonation }.' },
    ],
  },
  'context/ConfirmContext.jsx': {
    file: 'Promise-based confirmation dialog context.',
    module: 'ConfirmContext',
    description: [
      'Provides a confirm(message, opts) function that renders a modal overlay',
      'and returns a Promise<boolean>. Supports { title, danger, confirmLabel }.',
    ],
    exports: [
      { name: 'ConfirmProvider', type: 'component', props: '{ children }', desc: 'Renders the confirmation modal and provides confirm() to descendants.' },
      { name: 'useConfirm', type: 'hook', desc: 'Returns the confirm(message, opts) function.' },
    ],
  },
  'context/ConsoleErrorContext.jsx': {
    file: 'Console error capture context for debugging support.',
    module: 'ConsoleErrorContext',
    description: [
      'Intercepts console.error, window.onerror, and unhandled rejection events.',
      'Collects up to 50 error entries and exposes them for the ticket system.',
    ],
    exports: [
      { name: 'ConsoleErrorProvider', type: 'component', props: '{ children }', desc: 'Installs error interceptors and collects errors into state.' },
      { name: 'useConsoleErrors', type: 'hook', desc: 'Returns { errors, clearErrors, formatted }.' },
    ],
  },
  'context/FavoritesContext.jsx': {
    file: 'Favorites management context for bookmark functionality.',
    module: 'FavoritesContext',
    description: [
      'Loads user favorites from the API on mount. Provides CRUD operations with',
      'dedup-aware addFavorite that replaces existing entries sharing the same key.',
    ],
    exports: [
      { name: 'FavoritesProvider', type: 'component', props: '{ children }', desc: 'Fetches favorites on mount and provides CRUD operations.' },
      { name: 'useFavorites', type: 'hook', desc: 'Returns { favorites, addFavorite, removeFavorite, renameFavorite, isFavorited }.' },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  HOOKS                                                              */
/* ------------------------------------------------------------------ */
const HOOK_DOCS = {
  'hooks/useCrudTable.jsx': {
    file: 'Universal CRUD list-page hook for data tables.',
    module: 'useCrudTable',
    description: [
      'Handles API data loading, related lookups, client-side multi-operator',
      'filtering, sorting, pagination, CRUD modal state, bulk update, toast',
      'notifications, saved filters (localStorage), and assembles a tableProps',
      'object ready for <DataTable>.',
    ],
    params: [
      ['config', 'Object', 'Configuration object'],
      ['config.api', 'Object', '{ list, create?, update?, delete? } — API functions'],
      ['config.idKey', 'string', 'Primary key field name (default "id")'],
      ['config.emptyForm', 'Object', 'Template for new record form state'],
      ['config.filterConfig', 'Array', 'Filter field definitions for the DataTable filter row'],
      ['config.related', 'Array', 'Array of { key, api } for loading related lookup data'],
      ['config.defaultValues', 'Object', 'Default field values for new records'],
      ['config.beforeSave', 'Function', 'Transform function called on form data before API submit'],
      ['config.resourceName', 'string', 'Permission resource name for canWrite checks'],
    ],
    returns: [
      'data', 'related', 'loading', 'processedData', 'paginatedData',
      'filters', 'setFilter', 'clearFilters', 'hasActiveFilters',
      'showFilters', 'setShowFilters', 'sort', 'toggleSort', 'arrow',
      'page', 'setPage', 'pageSize', 'setPageSize',
      'modal', 'setModal', 'editing', 'form', 'setField',
      'openNew', 'openEdit', 'handleSave', 'handleDelete', 'handleBulkUpdate',
      'toast', 'showToast', 'renderToast', 'load', 'tableProps',
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  UTILS                                                              */
/* ------------------------------------------------------------------ */
const UTIL_DOCS = {
  'utils/lookupConfigs.js': {
    file: 'Lookup field/modal configuration factories.',
    module: 'lookupConfigs',
    description: [
      'Exports factory functions that return configuration objects for',
      '<LookupField> and <LookupModal> components. Each factory defines the',
      'columns, search keys, display format, and placeholder for a lookup type.',
    ],
    exports: [
      { name: 'LOOKUP_VENDORS', desc: 'Vendor lookup config. Columns: ID, Name, Contact, Status.' },
      { name: 'LOOKUP_CONTRACTS', desc: 'Contract lookup config. Columns: ID, Name, Vendor, Status.' },
      { name: 'LOOKUP_USERS', desc: 'User lookup config. Columns: ID, Username, Email, Role.' },
      { name: 'LOOKUP_ACCOUNTS', desc: 'Account lookup config. Columns: ID, Account Number, Name.' },
      { name: 'LOOKUP_LOCATIONS', desc: 'Location lookup config. Columns: ID, Name, City, State.' },
      { name: 'LOOKUP_LOCATION_TEXT', desc: 'Text-only location lookup (name display).' },
      { name: 'LOOKUP_CURRENCIES', desc: 'Currency/ISO code lookup config.' },
      { name: 'LOOKUP_INVOICES', desc: 'Invoice lookup config. Columns: ID, Invoice Number, Vendor.' },
      { name: 'LOOKUP_INVENTORY', desc: 'Inventory lookup config. Columns: ID, Circuit ID, Type.' },
      { name: 'LOOKUP_ORDERS', desc: 'Order lookup config. Columns: ID, Order Number, Vendor.' },
    ],
  },
  'utils/roleColors.js': {
    file: 'Role color scheme definitions and lookup helpers.',
    module: 'roleColors',
    description: [
      'Maps role names/objects to hex color schemes with background and text',
      'contrast variants. Used by badges, chips, and the role detail page.',
    ],
    exports: [
      { name: 'COLOR_SCHEMES', desc: 'Array of { bg, text, light } color scheme objects.' },
      { name: 'getRoleColor', desc: 'getRoleColor(roleOrName, idx) — Returns the primary hex color for a role.' },
      { name: 'getRoleScheme', desc: 'getRoleScheme(roleOrName, idx) — Returns the full { bg, text, light } scheme.' },
      { name: 'getSchemeForRole', desc: 'getSchemeForRole(roleOrName) — Alias returning color scheme by name match.' },
    ],
  },
};

/* ------------------------------------------------------------------ */
/*  COMPONENTS                                                         */
/* ------------------------------------------------------------------ */
const COMPONENT_DOCS = {
  'components/DataTable.jsx': {
    file: 'Reusable data grid component with filtering, sorting, pagination, and export.',
    module: 'DataTable',
    description: [
      'Renders a full-featured data table with column toggling, multi-operator',
      'filter row, sort indicators, pagination, row selection, bulk actions,',
      'Excel/CSV export, and saved-filter bookmarks via the Favorites context.',
    ],
  },
  'components/Modal.jsx': {
    file: 'Simple overlay modal with header, body slot, and action buttons.',
    module: 'Modal',
    props: [
      ['open', 'boolean', 'Whether the modal is visible'],
      ['title', 'string', 'Modal header title'],
      ['onClose', 'Function', 'Callback when the modal is dismissed'],
      ['onSave', 'Function', 'Callback when the Save button is clicked'],
      ['saveLabel', 'string', 'Label for the save button (default "Save")'],
      ['children', 'ReactNode', 'Modal body content'],
      ['width', 'number', 'Modal width in pixels (default 560)'],
    ],
  },
  'components/FormPage.jsx': {
    file: 'Full-page config-driven form layout for creating new records.',
    module: 'FormPage',
    props: [
      ['title', 'string', 'Page heading text'],
      ['subtitle', 'string', 'Sub-heading text below the title'],
      ['icon', 'ReactElement', 'Lucide icon element for the header'],
      ['sections', 'Array', 'Array of { title, fields[] } section definitions'],
      ['emptyForm', 'Object', 'Initial empty form state template'],
      ['loadRelated', 'Function', 'Async function to load related lookup data'],
      ['defaultValues', 'Object', 'Default field values'],
      ['beforeSave', 'Function', 'Transform function applied to form data before submit'],
      ['onSubmit', 'Function', 'Async function called with form data on save'],
      ['backPath', 'string', 'URL path for the Cancel/Back navigation'],
      ['redirectOnSave', 'string', 'URL path to redirect to after successful save'],
    ],
  },
  'components/CrudModal.jsx': {
    file: 'Config-driven modal form for create/edit operations.',
    module: 'CrudModal',
    props: [
      ['open', 'boolean', 'Whether the modal is visible'],
      ['title', 'string', 'Modal header title'],
      ['onClose', 'Function', 'Callback when the modal is dismissed'],
      ['onSave', 'Function', 'Callback when Save is clicked'],
      ['form', 'Object', 'Current form state object'],
      ['setField', 'Function', 'setField(fieldName, value) state setter'],
      ['fields', 'Array', 'Array of field config objects ({ key, label, type, options, ... })'],
      ['width', 'number', 'Modal width in pixels'],
      ['children', 'ReactNode', 'Additional content below auto-rendered fields'],
    ],
  },
  'components/DetailHeader.jsx': {
    file: 'Sticky detail-page header with scroll detection.',
    module: 'DetailHeader',
    props: [
      ['children', 'ReactNode', 'Header content (title, actions, etc.)'],
    ],
    description: ['Detects scroll position via IntersectionObserver and adds a .stuck class when the header is pinned to the top of its scroll container.'],
  },
  'components/NoteTimeline.jsx': {
    file: 'Timeline-style note and activity feed for any entity.',
    module: 'NoteTimeline',
    props: [
      ['entityType', 'string', 'Entity type key (e.g. "vendors", "invoices")'],
      ['entityId', 'number', 'Entity primary key'],
      ['author', 'string', 'Default author name for new notes (default "User")'],
    ],
    description: ['Fetches notes from the API, supports adding new notes and deleting existing ones with confirmation. Displays type-coded entries (note, status_change, system).'],
  },
  'components/LookupField.jsx': {
    file: 'Read-only input that opens a LookupModal for record selection.',
    module: 'LookupField',
    props: [
      ['label', 'string', 'Field label text'],
      ['value', 'number|string|null', 'Currently selected record ID'],
      ['onChange', 'Function', 'Callback with selected record ID'],
      ['onClear', 'Function', 'Callback to clear the selection'],
      ['placeholder', 'string', 'Placeholder text (default "Select...")'],
      ['disabled', 'boolean', 'Whether the field is read-only'],
      ['modalTitle', 'string', 'Title for the lookup modal'],
      ['data', 'Array', 'Array of records to search/select from'],
      ['columns', 'Array', 'Column definitions for the lookup table'],
      ['searchableKeys', 'Array', 'Object keys to include in search matching'],
      ['displayValue', 'string', 'Display text for the currently selected value'],
    ],
  },
  'components/Pagination.jsx': {
    file: 'Pagination bar with page size selector and navigation buttons.',
    module: 'Pagination',
    props: [
      ['currentPage', 'number', 'Current active page (1-based)'],
      ['totalItems', 'number', 'Total number of items across all pages'],
      ['pageSize', 'number', 'Number of items per page'],
      ['onPageChange', 'Function', 'Callback with new page number'],
      ['onPageSizeChange', 'Function', 'Callback with new page size'],
    ],
  },
  'components/BulkUpdatePanel.jsx': {
    file: 'Inline bulk-update form for selected DataTable rows.',
    module: 'BulkUpdatePanel',
    props: [
      ['fields', 'Array', 'Array of editable field definitions'],
      ['selectedCount', 'number', 'Number of currently selected rows'],
      ['onApply', 'Function', 'Callback with { fieldName: newValue } for touched fields'],
      ['onClose', 'Function', 'Callback to dismiss the panel'],
    ],
  },
  'components/ChangeHistory.jsx': {
    file: 'Audit trail viewer for entity-level change history.',
    module: 'ChangeHistory',
    description: ['Fetches and displays CREATE/UPDATE/DELETE audit records for a given entity, with field-level before/after diffs and relative timestamps.'],
  },
  'components/AnnouncementBanner.jsx': {
    file: 'Dismissible system announcement banners.',
    module: 'AnnouncementBanner',
    description: ['Fetches active announcements on mount and renders colored banners (info/warning/danger/success). Dismissed IDs are persisted in localStorage.'],
  },
  'components/CreateTicketModal.jsx': {
    file: 'Modal form for creating a support ticket with optional entity linking.',
    module: 'CreateTicketModal',
    props: [
      ['open', 'boolean', 'Whether the modal is visible'],
      ['onClose', 'Function', 'Callback when the modal is dismissed'],
      ['onCreated', 'Function', 'Callback after successful ticket creation'],
      ['sourceEntityType', 'string|null', 'Optional linked entity type'],
      ['sourceEntityId', 'number|null', 'Optional linked entity ID'],
      ['sourceLabel', 'string|null', 'Optional display label for the linked entity'],
      ['defaultCategory', 'string', 'Default ticket category (default "Other")'],
    ],
  },
  'components/FavoritesPanel.jsx': {
    file: 'Header dropdown panel for managing saved favorites.',
    module: 'FavoritesPanel',
    description: ['Shows saved favorites with inline rename and delete. Navigates to the favorited path with its saved filter state on click.'],
  },
  'components/FormInstructionBanner.jsx': {
    file: 'Blue info banner displaying form-specific instructions.',
    module: 'FormInstructionBanner',
    props: [
      ['formId', 'string', 'The form identifier to load instructions for'],
    ],
    description: ['Loads instruction text from the API for the given formId. Respects the user\'s show_form_instructions preference.'],
  },
  'components/LookupModal.jsx': {
    file: 'Searchable selection modal for picking related records.',
    module: 'LookupModal',
    props: [
      ['open', 'boolean', 'Whether the modal is visible'],
      ['onClose', 'Function', 'Callback when the modal is dismissed'],
      ['onSelect', 'Function', 'Callback with the selected record'],
      ['title', 'string', 'Modal header title'],
      ['data', 'Array', 'Array of records to display'],
      ['columns', 'Array', 'Column definitions for the table'],
      ['searchableKeys', 'Array', 'Object keys to include in search filtering'],
    ],
  },
  'components/ScrollToTop.jsx': {
    file: 'Floating scroll-to-top button.',
    module: 'ScrollToTop',
    description: ['Appears after scrolling 200px in .app-content. Smooth-scrolls back to top on click.'],
  },
  'components/UserSwitcher.jsx': {
    file: 'Header dropdown for demo user impersonation switching.',
    module: 'UserSwitcher',
    description: ['Shows the current user avatar/role in the header. Dropdown lists searchable demo users for impersonation. Includes link to Preferences page.'],
  },
  'components/WorkflowFlowchart.jsx': {
    file: 'SVG-based workflow flowchart renderer.',
    module: 'WorkflowFlowchart',
    props: [
      ['steps', 'Array', 'Array of workflow step objects (name, type, status, col, row)'],
      ['edges', 'Array', 'Array of { from, to, label } edge definitions'],
      ['selectedStep', 'number|null', 'Currently highlighted step index'],
      ['onSelectStep', 'Function', 'Callback when a step node is clicked'],
    ],
    description: ['Lays out nodes in a 2D grid from steps/edges, rendering decision diamonds, status-colored nodes, and connecting paths with labels.'],
  },
};

/* ------------------------------------------------------------------ */
/*  PAGES                                                              */
/* ------------------------------------------------------------------ */
const PAGE_DOCS = {
  // CRUD List pages
  'pages/Vendors.jsx':         { file: 'Vendor list page with CRUD modal, filtering, sorting, and export.', module: 'Vendors', desc: 'CRUD list page for managing telecom vendors. Uses useCrudTable for data loading, DataTable for display.' },
  'pages/Accounts.jsx':        { file: 'Billing account list page with CRUD modal and vendor lookup.', module: 'Accounts', desc: 'CRUD list page for billing accounts with vendor relation.' },
  'pages/Locations.jsx':       { file: 'Location list page with CRUD modal, filtering, and export.', module: 'Locations', desc: 'CRUD list page for site/location management.' },
  'pages/Contracts.jsx':       { file: 'Contract list page with CRUD modal and vendor lookup.', module: 'Contracts', desc: 'CRUD list page for vendor contracts.' },
  'pages/Inventory.jsx':       { file: 'Inventory list page with CRUD modal and account/contract/order lookups.', module: 'Inventory', desc: 'CRUD list page for circuit/service inventory items.' },
  'pages/Orders.jsx':          { file: 'Service order list page with CRUD modal and vendor/contract/inventory lookups.', module: 'Orders', desc: 'CRUD list page for service orders.' },
  'pages/Invoices.jsx':        { file: 'Invoice list page with CRUD modal and account lookup.', module: 'Invoices', desc: 'CRUD list page for invoices.' },
  'pages/Disputes.jsx':        { file: 'Dispute list page with CRUD modal and vendor/invoice lookups.', module: 'Disputes', desc: 'CRUD list page for invoice disputes.' },
  'pages/Tickets.jsx':         { file: 'Support ticket list page (read-only — creation via TicketAdd).', module: 'Tickets', desc: 'List page for support tickets with status filtering and detail navigation.' },
  'pages/Users.jsx':           { file: 'User list page with role lookup and status toggling.', module: 'Users', desc: 'CRUD list page for user management with active/inactive status control.' },
  'pages/Roles.jsx':           { file: 'Role list page with permission/user count badges.', module: 'Roles', desc: 'CRUD list page for role management.' },
  'pages/UsocCodes.jsx':       { file: 'USOC code list page with CRUD modal.', module: 'UsocCodes', desc: 'CRUD list page for USOC (telecom service) code management.' },
  'pages/CostSavings.jsx':     { file: 'Cost savings list page with vendor/inventory lookups.', module: 'CostSavings', desc: 'CRUD list page for tracking cost savings opportunities.' },
  'pages/Announcements.jsx':   { file: 'Announcement management list page.', module: 'Announcements', desc: 'CRUD list page for system-wide announcements.' },
  'pages/SpendCategories.jsx': { file: 'Spend category taxonomy list page.', module: 'SpendCategories', desc: 'CRUD list page for spend categories with parent hierarchy.' },
  'pages/FieldCatalog.jsx':    { file: 'Field catalog aggregated category list with drill-down.', module: 'FieldCatalog', desc: 'Shows field catalog categories with entry counts; navigates to FieldCatalogDetail.' },
  'pages/FieldCatalogDetail.jsx': { file: 'Field catalog entries for a specific category.', module: 'FieldCatalogDetail', desc: 'CRUD list page for field entries within a single category.' },
  'pages/VendorRemit.jsx':     { file: 'Vendor remittance list page with vendor lookup.', module: 'VendorRemit', desc: 'CRUD list page for vendor remittance/payment records.' },
  'pages/FormInstructions.jsx': { file: 'Form instruction management list page.', module: 'FormInstructions', desc: 'CRUD list page for form-level help instruction entries.' },
  'pages/AuditLog.jsx':        { file: 'Read-only audit log viewer with action/resource filtering.', module: 'AuditLog', desc: 'Displays system audit log entries using useCrudTable (read-only mode).' },
  'pages/UserManagement.jsx':  { file: 'User administration page with role assignment modal.', module: 'UserManagement', desc: 'CRUD list page for user admin, including role selection and user creation.' },

  // Detail pages
  'pages/VendorDetail.jsx':      { file: 'Vendor detail page with related entities and inline editing.', module: 'VendorDetail', desc: 'Shows vendor info, related inventory, contracts, orders, invoices, disputes, and remits. Supports inline field editing, notes, and change history.' },
  'pages/AccountDetail.jsx':     { file: 'Account detail page with inventory sub-tab.', module: 'AccountDetail', desc: 'Shows billing account info with vendor lookup, related inventory, notes, and change history.' },
  'pages/LocationDetail.jsx':    { file: 'Location detail page with editable form fields.', module: 'LocationDetail', desc: 'Shows location info (name, address, city, state, zip) with inline editing, notes, and change history.' },
  'pages/ContractDetail.jsx':    { file: 'Contract detail page with rates management and related entities.', module: 'ContractDetail', desc: 'Shows contract info, rate table (CRUD), linked inventory, orders, vendor lookup, notes, and change history.' },
  'pages/InventoryDetail.jsx':   { file: 'Inventory item detail page with related invoices.', module: 'InventoryDetail', desc: 'Shows inventory item info with account/contract/order lookups, related invoices, notes, and change history.' },
  'pages/OrderDetail.jsx':       { file: 'Service order detail page with inventory changes.', module: 'OrderDetail', desc: 'Shows order info with vendor/contract/inventory lookups, order inventory, notes, and change history.' },
  'pages/InvoiceDetail.jsx':     { file: 'Invoice detail page with line items, allocations, and workflows.', module: 'InvoiceDetail', desc: 'Shows invoice info, line item table (CRUD), allocation management, user assignment, notes, change history, and ticket creation.' },
  'pages/DisputeDetail.jsx':     { file: 'Dispute detail page with vendor/invoice lookup.', module: 'DisputeDetail', desc: 'Shows dispute info with vendor and invoice lookups, notes, and change history.' },
  'pages/TicketDetail.jsx':      { file: 'Ticket detail page with comments and status management.', module: 'TicketDetail', desc: 'Shows ticket info, comment thread, status/priority/assignee management, entity linking, and change history.' },
  'pages/UserDetail.jsx':        { file: 'User detail page with SSO config, activity, and assignments.', module: 'UserDetail', desc: 'Shows user info, role assignment, SSO fields, assigned invoices/orders, recent activity, and change history.' },
  'pages/RoleDetail.jsx':        { file: 'Role detail page with permissions matrix and assigned users.', module: 'RoleDetail', desc: 'Shows role info, full permissions grid (23 resources × 4 actions), assigned user list, and change history.' },
  'pages/UsocCodeDetail.jsx':    { file: 'USOC code detail page with linked contract rates.', module: 'UsocCodeDetail', desc: 'Shows USOC code info with related contract rates table and change history.' },
  'pages/VendorRemitDetail.jsx': { file: 'Vendor remittance detail page with vendor lookup.', module: 'VendorRemitDetail', desc: 'Shows remittance record info with vendor lookup, notes, and change history.' },
  'pages/WorkflowDetail.jsx':    { file: 'Workflow run detail page with flowchart visualization.', module: 'WorkflowDetail', desc: 'Shows workflow run info, step-by-step timeline, and SVG flowchart via WorkflowFlowchart component.' },

  // Add/Create pages
  'pages/VendorAdd.jsx':      { file: 'New vendor creation form.', module: 'VendorAdd', desc: 'Uses FormPage to render a config-driven form for creating a new vendor record.' },
  'pages/AccountAdd.jsx':     { file: 'New billing account creation form.', module: 'AccountAdd', desc: 'Uses FormPage with vendor and parent-account lookups for creating a new account.' },
  'pages/LocationAdd.jsx':    { file: 'New location creation form.', module: 'LocationAdd', desc: 'Uses FormPage to render fields for name, address, city, state, and zip.' },
  'pages/ContractAdd.jsx':    { file: 'New contract creation form.', module: 'ContractAdd', desc: 'Uses FormPage with vendor and parent-contract lookups for creating a new contract.' },
  'pages/InventoryAdd.jsx':   { file: 'New inventory item creation form.', module: 'InventoryAdd', desc: 'Uses FormPage with account, contract, order, and location lookups.' },
  'pages/OrderAdd.jsx':       { file: 'New service order creation form.', module: 'OrderAdd', desc: 'Uses FormPage with vendor, contract, and inventory lookups.' },
  'pages/InvoiceAdd.jsx':     { file: 'New invoice creation form.', module: 'InvoiceAdd', desc: 'Uses FormPage with account lookup for creating a new invoice.' },
  'pages/DisputeAdd.jsx':     { file: 'New dispute creation form.', module: 'DisputeAdd', desc: 'Uses FormPage with vendor and invoice selection.' },
  'pages/TicketAdd.jsx':      { file: 'New support ticket creation form.', module: 'TicketAdd', desc: 'Uses FormPage with user assignment lookup and auto-populated console error fields.' },
  'pages/UserAdd.jsx':        { file: 'New user creation form.', module: 'UserAdd', desc: 'Uses FormPage with role selection and SSO provider/ID fields.' },
  'pages/RoleForm.jsx':       { file: 'New role creation form with color scheme picker.', module: 'RoleForm', desc: 'Manual form (not FormPage) for creating a new role with name, description, and color scheme selection.' },
  'pages/UsocCodeAdd.jsx':    { file: 'New USOC code creation form.', module: 'UsocCodeAdd', desc: 'Uses FormPage for USOC code, description, and category fields.' },
  'pages/CostSavingAdd.jsx':  { file: 'New cost saving entry creation form.', module: 'CostSavingAdd', desc: 'Uses FormPage with vendor and inventory lookups.' },
  'pages/VendorRemitAdd.jsx': { file: 'New vendor remittance creation form.', module: 'VendorRemitAdd', desc: 'Manual form with vendor fetch for creating a new remittance record.' },

  // Dashboard / Analytics pages
  'pages/Dashboard.jsx':           { file: 'Main operational dashboard with KPI cards and charts.', module: 'Dashboard', desc: 'Fetches dashboard data and renders KPI cards (total spend, invoices, disputes, savings), monthly trend area chart, top vendors bar chart, spend-by-type pie chart, expiring contracts, and recent activity tables.' },
  'pages/AdminDashboard.jsx':      { file: 'Admin dashboard with system health, DB stats, and maintenance tools.', module: 'AdminDashboard', desc: 'Admin-only page showing system info (Node.js version, memory, uptime), table row counts, DB size, data purge tools, and email retry action. Accessible only to Admin role.' },
  'pages/AdminPurge.jsx':          { file: 'Admin entity purge tool with cascade preview.', module: 'AdminPurge', desc: 'Allows administrators to preview and permanently delete entities (vendors, invoices, inventory) with full cascade dependency display. Supports pasting IDs from Excel.' },
  'pages/RateAudit.jsx':           { file: 'Contract-vs-billed rate compliance audit.', module: 'RateAudit', desc: 'Displays rate validation results comparing contracted rates against actually billed charges, with variance calculation.' },

  // Specialty / Tool pages
  'pages/Allocations.jsx':        { file: 'Cost allocation list page (read-only).', module: 'Allocations', desc: 'Read-only list of cost allocations filterable by invoice, showing GL code, department, and amount details.' },
  'pages/RolePermissions.jsx':    { file: 'Full permission matrix editor for all roles.', module: 'RolePermissions', desc: 'Interactive grid showing all roles × 23 resources × 4 actions. Allows toggling permissions with save confirmation.' },
  'pages/BatchUpload.jsx':        { file: 'Bulk data import wizard.', module: 'BatchUpload', desc: 'Multi-step import: select table, download template, upload file (drag/drop), review results with success/error reporting.' },
  'pages/EmailConfig.jsx':        { file: 'SMTP configuration and email management page.', module: 'EmailConfig', desc: 'Admin page for SMTP settings, notification toggles, test email sending, and email send log viewer.' },
  'pages/InvoiceReader.jsx':      { file: 'Multi-step invoice file import wizard.', module: 'InvoiceReader', desc: 'Upload → parse → map columns → process flow for importing invoices from Excel, EDI, or PDF files. Manages templates and profiles.' },
  'pages/ReaderExceptions.jsx':   { file: 'Invoice reader exception management.', module: 'ReaderExceptions', desc: 'Lists parsing/import failures with resolve and ignore actions. Shows exception stats (pending, resolved, ignored counts).' },
  'pages/ReaderProfiles.jsx':     { file: 'Invoice reader profile management.', module: 'ReaderProfiles', desc: 'CRUD for auto-detection profiles with vendor matching, template binding, and file-match testing.' },
  'pages/Reports.jsx':            { file: 'Saved report gallery with run/delete actions.', module: 'Reports', desc: 'Lists saved report configurations with preview, run, and delete capabilities. Links to CreateReport for new reports.' },
  'pages/CreateReport.jsx':       { file: 'Interactive report builder with save/load support.', module: 'CreateReport', desc: 'Full report builder: select type, pick columns, add filters, choose sort, preview results, export to Excel/CSV, and save/load configurations.' },
  'pages/Preferences.jsx':        { file: 'User preferences page.', module: 'Preferences', desc: 'Settings for theme (light/dark/auto), default rows per page, and form instruction visibility.' },
  'pages/Workflows.jsx':          { file: 'Workflow definitions and recent runs list.', module: 'Workflows', desc: 'Shows available workflow definitions with demo trigger buttons and recent workflow run history with status.' },

  // Placeholder pages  
  'pages/GLCodes.jsx':           { file: 'Placeholder page for GL code management (coming soon).', module: 'GLCodes', desc: 'Renders a "Coming Soon" placeholder.' },
  'pages/InvoiceApprovers.jsx':  { file: 'Placeholder page for invoice approval workflows (coming soon).', module: 'InvoiceApprovers', desc: 'Renders a "Coming Soon" placeholder.' },
  'pages/Milestones.jsx':        { file: 'Placeholder page for order milestone tracking (coming soon).', module: 'Milestones', desc: 'Renders a "Coming Soon" placeholder.' },
  'pages/Projects.jsx':          { file: 'Placeholder page for project management (coming soon).', module: 'Projects', desc: 'Renders a "Coming Soon" placeholder.' },
  'pages/CreateGraph.jsx':       { file: 'Placeholder page for custom graph builder (coming soon).', module: 'CreateGraph', desc: 'Renders a "Coming Soon" placeholder.' },
};


/* ================================================================== */
/*  PROCESSING FUNCTIONS                                               */
/* ================================================================== */

/**
 * Build a JSDoc block from metadata.
 */
function buildFileHeader(meta) {
  const lines = ['/**'];
  lines.push(` * @file ${meta.file}`);
  if (meta.module) lines.push(` * @module ${meta.module}`);
  if (meta.description) {
    lines.push(' *');
    for (const l of meta.description) lines.push(` * ${l}`);
  }
  lines.push(' */');
  return lines.join('\n');
}

function buildFunctionDoc(fn) {
  const lines = ['/**'];
  lines.push(` * ${fn.desc}`);
  if (fn.params) {
    for (const [name, type, desc] of fn.params) {
      lines.push(` * @param {${type}} ${name} - ${desc}`);
    }
  }
  lines.push(` * @returns {${fn.sig.split('=>')[1]?.trim() || 'Promise<AxiosResponse>'}}`);
  lines.push(' */');
  return lines.join('\n');
}

function buildContextDoc(exp) {
  const lines = ['/**'];
  if (exp.type === 'component') {
    lines.push(` * @component ${exp.name}`);
    if (exp.props) lines.push(` * @param {Object} props - ${exp.props}`);
  } else if (exp.type === 'hook') {
    lines.push(` * @function ${exp.name}`);
  }
  lines.push(` * ${exp.desc}`);
  lines.push(' */');
  return lines.join('\n');
}

function buildComponentDoc(meta) {
  const lines = ['/**'];
  lines.push(` * @file ${meta.file}`);
  if (meta.module) lines.push(` * @module ${meta.module}`);
  if (meta.description) {
    lines.push(' *');
    for (const d of meta.description) lines.push(` * ${d}`);
  }
  if (meta.props) {
    lines.push(' *');
    for (const [name, type, desc] of meta.props) {
      lines.push(` * @param {${type}} props.${name} - ${desc}`);
    }
  }
  lines.push(' */');
  return lines.join('\n');
}

function buildPageDoc(meta) {
  const lines = ['/**'];
  lines.push(` * @file ${meta.file}`);
  if (meta.module) lines.push(` * @module ${meta.module}`);
  if (meta.desc) {
    lines.push(' *');
    lines.push(` * ${meta.desc}`);
  }
  lines.push(' */');
  return lines.join('\n');
}

function buildHookDoc(meta) {
  const lines = ['/**'];
  lines.push(` * @file ${meta.file}`);
  if (meta.module) lines.push(` * @module ${meta.module}`);
  if (meta.description) {
    lines.push(' *');
    for (const d of meta.description) lines.push(` * ${d}`);
  }
  if (meta.params) {
    lines.push(' *');
    for (const [name, type, desc] of meta.params) {
      lines.push(` * @param {${type}} ${name} - ${desc}`);
    }
  }
  if (meta.returns) {
    lines.push(' *');
    lines.push(` * @returns {Object} { ${meta.returns.join(', ')} }`);
  }
  lines.push(' */');
  return lines.join('\n');
}

function buildUtilDoc(meta) {
  const lines = ['/**'];
  lines.push(` * @file ${meta.file}`);
  if (meta.module) lines.push(` * @module ${meta.module}`);
  if (meta.description) {
    lines.push(' *');
    for (const d of meta.description) lines.push(` * ${d}`);
  }
  if (meta.exports) {
    lines.push(' *');
    for (const e of meta.exports) {
      lines.push(` * @exports ${e.name} - ${e.desc}`);
    }
  }
  lines.push(' */');
  return lines.join('\n');
}

/* ------------------------------------------------------------------ */
/*  api.js — special handling for per-function JSDoc                   */
/* ------------------------------------------------------------------ */
function processApiFile() {
  const fp = path.join(SRC, 'api.js');
  let src = fs.readFileSync(fp, 'utf8');

  if (src.startsWith('/**\n * @file')) {
    console.log('  api.js — already documented, skipping');
    return;
  }

  const meta = FILE_DOCS['api.js'];
  const header = buildFileHeader(meta);
  src = header + '\n' + src;

  // Add per-function JSDoc
  let count = 0;
  for (const fn of meta.functions) {
    const pattern = `export const ${fn.name}`;
    const idx = src.indexOf(pattern);
    if (idx === -1) continue;

    // Check if there's already a JSDoc above
    const before = src.substring(0, idx);
    if (before.trimEnd().endsWith('*/')) continue;

    const doc = buildFunctionDoc(fn);
    src = src.substring(0, idx) + doc + '\n' + src.substring(idx);
    count++;
  }

  fs.writeFileSync(fp, src, 'utf8');
  console.log(`  api.js — ${count} function docs added`);
}

/* ------------------------------------------------------------------ */
/*  Generic file processor — prepend @file header                      */
/* ------------------------------------------------------------------ */
function processFile(relPath, docBuilder, meta) {
  const fp = path.join(SRC, relPath);
  if (!fs.existsSync(fp)) {
    console.log(`  ${relPath} — NOT FOUND, skipping`);
    return;
  }

  let src = fs.readFileSync(fp, 'utf8');

  if (src.startsWith('/**\n * @file')) {
    console.log(`  ${relPath} — already documented, skipping`);
    return;
  }

  const doc = docBuilder(meta);
  src = doc + '\n' + src;
  fs.writeFileSync(fp, src, 'utf8');
  console.log(`  ${relPath} — header added`);
}

/* ------------------------------------------------------------------ */
/*  Context files — file header + per-export JSDoc                    */
/* ------------------------------------------------------------------ */
function processContextFile(relPath, meta) {
  const fp = path.join(SRC, relPath);
  if (!fs.existsSync(fp)) {
    console.log(`  ${relPath} — NOT FOUND, skipping`);
    return;
  }

  let src = fs.readFileSync(fp, 'utf8');

  if (src.startsWith('/**\n * @file')) {
    console.log(`  ${relPath} — already documented, skipping`);
    return;
  }

  const header = buildFileHeader(meta);
  src = header + '\n' + src;

  // Add per-export JSDoc
  let count = 0;
  if (meta.exports) {
    for (const exp of meta.exports) {
      const patterns = [
        `export function ${exp.name}`,
        `export const ${exp.name}`,
      ];
      for (const pat of patterns) {
        const idx = src.indexOf(pat);
        if (idx === -1) continue;
        const before = src.substring(0, idx);
        if (before.trimEnd().endsWith('*/')) continue;
        const doc = buildContextDoc(exp);
        src = src.substring(0, idx) + doc + '\n' + src.substring(idx);
        count++;
        break;
      }
    }
  }

  fs.writeFileSync(fp, src, 'utf8');
  console.log(`  ${relPath} — header + ${count} export docs added`);
}


/* ================================================================== */
/*  MAIN                                                               */
/* ================================================================== */
function main() {
  console.log('=== Client JSDoc Pass ===\n');

  // 1. api.js
  console.log('Processing api.js...');
  processApiFile();

  // 2. Contexts
  console.log('\nProcessing context files...');
  for (const [rel, meta] of Object.entries(CONTEXT_DOCS)) {
    processContextFile(rel, meta);
  }

  // 3. Hooks
  console.log('\nProcessing hook files...');
  for (const [rel, meta] of Object.entries(HOOK_DOCS)) {
    processFile(rel, buildHookDoc, meta);
  }

  // 4. Utils
  console.log('\nProcessing utility files...');
  for (const [rel, meta] of Object.entries(UTIL_DOCS)) {
    processFile(rel, buildUtilDoc, meta);
  }

  // 5. Components
  console.log('\nProcessing component files...');
  for (const [rel, meta] of Object.entries(COMPONENT_DOCS)) {
    processFile(rel, buildComponentDoc, meta);
  }

  // 6. Pages
  console.log('\nProcessing page files...');
  for (const [rel, meta] of Object.entries(PAGE_DOCS)) {
    processFile(rel, buildPageDoc, meta);
  }

  // 7. Top-level files (App.jsx, main.jsx, PageTitleContext.js)
  console.log('\nProcessing top-level files...');
  for (const name of ['App.jsx', 'main.jsx', 'PageTitleContext.js']) {
    const meta = FILE_DOCS[name];
    if (meta) processFile(name, buildFileHeader, meta);
  }

  console.log('\n=== Done ===');
}

main();
