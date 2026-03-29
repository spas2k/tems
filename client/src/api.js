/**
 * @file Centralized API client for all backend communication.
 * @module api
 *
 * Creates an Axios instance with baseURL "/api" and attaches a request
 * interceptor to include the X-Dev-User-Id header for demo impersonation.
 * Exports named async functions for every REST endpoint in the TEMS backend.
 * Each function returns an Axios response promise wrapping { data }.
 */
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Dev mode: attach the impersonated user ID so the backend loads
// that user's role/permissions instead of the default admin.
api.interceptors.request.use(config => {
  const uid = localStorage.getItem('tems-demo-user-id');
  if (uid) config.headers['X-Dev-User-Id'] = uid;
  return config;
});

// After any mutating request succeeds, trigger a notification refresh
// so the bell picks up server-created notifications immediately.
api.interceptors.response.use(response => {
  const method = response.config.method;
  if (method === 'post' || method === 'put' || method === 'patch' || method === 'delete') {
    window.dispatchEvent(new Event('tems-notification-refresh'));
  }
  return response;
});

/**
 * Fetch operational dashboard KPIs, charts, and recent activity.
 * @returns {Promise<AxiosResponse>}
 */
export const getDashboard    = () => api.get('/dashboard');
/**
 * Full-text search across all entity types.
 * @param {string} q - Search query string
 * @returns {Promise<AxiosResponse>}
 */
export const globalSearch    = q  => api.get('/search', { params: { q } });
/**
 * List all vendors.
 * @returns {Promise<AxiosResponse>}
 */
export const getVendors         = () => api.get('/vendors');
export const getVendor          = id => api.get(`/vendors/${id}`);
/**
 * Get inventory items linked to a vendor.
 * @param {number} id - Vendor primary key
 * @returns {Promise<AxiosResponse>}
 */
export const getVendorInventory  = id => api.get(`/vendors/${id}/inventory`);
/**
 * Create a new vendor.
 * @param {Object} d - Vendor fields (name, contact_name, contact_email, etc.)
 * @returns {Promise<AxiosResponse>}
 */
export const createVendor       = d  => api.post('/vendors', d);
/**
 * Update an existing vendor.
 * @param {number} id - Vendor primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateVendor       = (id,d) => api.put(`/vendors/${id}`, d);
/**
 * Delete a vendor by ID.
 * @param {number} id - Vendor primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteVendor       = id => api.delete(`/vendors/${id}`);
/**
 * List all billing accounts.
 * @returns {Promise<AxiosResponse>}
 */
export const getAccounts        = () => api.get('/accounts');
export const getAccount         = id => api.get(`/accounts/${id}`);
/**
 * Get inventory items linked to an account.
 * @param {number} id - Account primary key
 * @returns {Promise<AxiosResponse>}
 */
export const getAccountInventory = id => api.get(`/accounts/${id}/inventory`);
/**
 * Create a new billing account.
 * @param {Object} d - Account fields (account_number, vendors_id, etc.)
 * @returns {Promise<AxiosResponse>}
 */
export const createAccount      = d  => api.post('/accounts', d);
/**
 * Update an existing account.
 * @param {number} id - Account primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateAccount      = (id,d) => api.put(`/accounts/${id}`, d);
/**
 * Delete an account by ID.
 * @param {number} id - Account primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteAccount      = id => api.delete(`/accounts/${id}`);

/**
 * List all locations.
 * @returns {Promise<AxiosResponse>}
 */
export const getLocations    = ()        => api.get('/locations');
export const getLocation     = id        => api.get(`/locations/${id}`);

export const getCurrencies   = ()        => api.get('/currencies');
export const getCurrency     = id        => api.get(`/currencies/${id}`);
export const createCurrency  = d         => api.post('/currencies', d);
export const updateCurrency  = (id, d)   => api.put(`/currencies/${id}`, d);
export const deleteCurrency  = id        => api.delete(`/currencies/${id}`);
/**
 * Create a new location.
 * @param {Object} d - Location fields (name, address, city, state, zip)
 * @returns {Promise<AxiosResponse>}
 */
export const createLocation  = d         => api.post('/locations', d);
/**
 * Update an existing location.
 * @param {number} id - Location primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateLocation  = (id, d)   => api.put(`/locations/${id}`, d);
/**
 * Delete a location by ID.
 * @param {number} id - Location primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteLocation  = id        => api.delete(`/locations/${id}`);

/**
 * List field catalog entries with optional query params.
 * @param {Object=} params - Optional filter query params (category, etc.)
 * @returns {Promise<AxiosResponse>}
 */
export const getFieldCatalog           = (params) => api.get('/field-catalog', { params });
/**
 * Create a field catalog entry.
 * @param {Object} d - Field catalog entry data
 * @returns {Promise<AxiosResponse>}
 */
export const createFieldCatalog        = d         => api.post('/field-catalog', d);
/**
 * Update a field catalog entry.
 * @param {number} id - Field catalog entry primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateFieldCatalog        = (id, d)   => api.put(`/field-catalog/${id}`, d);
/**
 * Delete a field catalog entry.
 * @param {number} id - Field catalog entry primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteFieldCatalog        = id        => api.delete(`/field-catalog/${id}`);

/**
 * List vendor remittance records with optional filters.
 * @param {Object=} params - Optional filter query params
 * @returns {Promise<AxiosResponse>}
 */
export const getVendorRemits   = (params)  => api.get('/vendor-remit', { params });
export const getVendorRemit    = id        => api.get(`/vendor-remit/${id}`);
/**
 * Create a vendor remittance record.
 * @param {Object} d - Vendor remit fields
 * @returns {Promise<AxiosResponse>}
 */
export const createVendorRemit = d         => api.post('/vendor-remit', d);
/**
 * Update a vendor remittance record.
 * @param {number} id - Vendor remit primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateVendorRemit = (id, d)   => api.put(`/vendor-remit/${id}`, d);
/**
 * Delete a vendor remittance record.
 * @param {number} id - Vendor remit primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteVendorRemit = id        => api.delete(`/vendor-remit/${id}`);

/**
 * List announcements with optional filters.
 * @param {Object=} params - Optional filter query params
 * @returns {Promise<AxiosResponse>}
 */
export const getAnnouncements    = (params) => api.get('/announcements', { params });
/**
 * Create a new announcement.
 * @param {Object} d - Announcement fields (title, body, type, active, etc.)
 * @returns {Promise<AxiosResponse>}
 */
export const createAnnouncement  = d        => api.post('/announcements', d);
/**
 * Update an announcement.
 * @param {number} id - Announcement primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateAnnouncement  = (id, d)  => api.put(`/announcements/${id}`, d);
/**
 * Delete an announcement.
 * @param {number} id - Announcement primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteAnnouncement  = id       => api.delete(`/announcements/${id}`);

/**
 * List all spend categories.
 * @returns {Promise<AxiosResponse>}
 */
export const getSpendCategories   = ()        => api.get('/spend-categories');
export const getSpendCategory    = id        => api.get(`/spend-categories/${id}`);
/**
 * Create a spend category.
 * @param {Object} d - Spend category fields
 * @returns {Promise<AxiosResponse>}
 */
export const createSpendCategory  = d         => api.post('/spend-categories', d);
/**
 * Update a spend category.
 * @param {number} id - Spend category primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateSpendCategory  = (id, d)   => api.put(`/spend-categories/${id}`, d);
/**
 * Delete a spend category.
 * @param {number} id - Spend category primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteSpendCategory  = id        => api.delete(`/spend-categories/${id}`);

/**
 * List contracts with optional filters.
 * @param {Object=} params - Optional filter query params
 * @returns {Promise<AxiosResponse>}
 */
export const getContracts         = (params) => api.get('/contracts', { params });
export const getContract          = id => api.get(`/contracts/${id}`);
/**
 * Get inventory items linked to a contract.
 * @param {number} id - Contract primary key
 * @returns {Promise<AxiosResponse>}
 */
export const getContractInventory  = id => api.get(`/contracts/${id}/inventory`);
/**
 * Get orders linked to a contract.
 * @param {number} id - Contract primary key
 * @returns {Promise<AxiosResponse>}
 */
export const getContractOrders    = id => api.get(`/contracts/${id}/orders`);
/**
 * Create a new contract.
 * @param {Object} d - Contract fields
 * @returns {Promise<AxiosResponse>}
 */
export const createContract       = d  => api.post('/contracts', d);
/**
 * Update an existing contract.
 * @param {number} id - Contract primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateContract       = (id,d) => api.put(`/contracts/${id}`, d);
/**
 * Delete a contract by ID.
 * @param {number} id - Contract primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteContract       = id => api.delete(`/contracts/${id}`);

/**
 * List inventory items with optional filters.
 * @param {Object=} params - Optional filter query params
 * @returns {Promise<AxiosResponse>}
 */
export const getInventory        = (params) => api.get('/inventory', { params });
/**
 * Get a single inventory item by ID.
 * @param {number} id - Inventory primary key
 * @returns {Promise<AxiosResponse>}
 */
export const getInventoryItem         = id => api.get(`/inventory/${id}`);
/**
 * Get invoices associated with an inventory item.
 * @param {number} id - Inventory primary key
 * @returns {Promise<AxiosResponse>}
 */
export const getInventoryItemInvoices = id => api.get(`/inventory/${id}/invoices`);
/**
 * Create a new inventory item.
 * @param {Object} d - Inventory item fields
 * @returns {Promise<AxiosResponse>}
 */
export const createInventoryItem      = d  => api.post('/inventory', d);
/**
 * Update an inventory item.
 * @param {number} id - Inventory primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateInventoryItem      = (id,d) => api.put(`/inventory/${id}`, d);
/**
 * Delete an inventory item.
 * @param {number} id - Inventory primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteInventoryItem      = id => api.delete(`/inventory/${id}`);

/**
 * List orders with optional filters.
 * @param {Object=} params - Optional filter query params
 * @returns {Promise<AxiosResponse>}
 */
export const getOrders        = (params) => api.get('/orders', { params });
export const getOrder         = id => api.get(`/orders/${id}`);
/**
 * Get inventory items linked to an order.
 * @param {number} id - Order primary key
 * @returns {Promise<AxiosResponse>}
 */
export const getOrderInventory = id => api.get(`/orders/${id}/inventory`);
/**
 * Create a new order.
 * @param {Object} d - Order fields
 * @returns {Promise<AxiosResponse>}
 */
export const createOrder      = d  => api.post('/orders', d);
/**
 * Update an order.
 * @param {number} id - Order primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateOrder      = (id,d) => api.put(`/orders/${id}`, d);
/**
 * Delete an order.
 * @param {number} id - Order primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteOrder      = id => api.delete(`/orders/${id}`);

/**
 * List invoices with optional filters.
 * @param {Object=} params - Optional filter query params
 * @returns {Promise<AxiosResponse>}
 */
export const getInvoices     = (params) => api.get('/invoices', { params });
export const getInvoice      = id => api.get(`/invoices/${id}`);
/**
 * Create a new invoice.
 * @param {Object} d - Invoice fields
 * @returns {Promise<AxiosResponse>}
 */
export const createInvoice   = d  => api.post('/invoices', d);
/**
 * Update an invoice.
 * @param {number} id - Invoice primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateInvoice   = (id,d) => api.put(`/invoices/${id}`, d);
/**
 * Recalculate invoice total from line item amounts.
 * @param {number} id - Invoice primary key
 * @returns {Promise<AxiosResponse>}
 */
export const recalculateInvoice = id => api.post(`/invoices/${id}/recalculate`);
/**
 * Delete an invoice.
 * @param {number} id - Invoice primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteInvoice   = id => api.delete(`/invoices/${id}`);

/**
 * List line items with optional filters.
 * @param {Object=} params - Optional filter query params (invoices_id, etc.)
 * @returns {Promise<AxiosResponse>}
 */
export const getLineItems    = (params) => api.get('/line-items', { params });
/**
 * Create a new line item.
 * @param {Object} d - Line item fields
 * @returns {Promise<AxiosResponse>}
 */
export const createLineItem  = d  => api.post('/line-items', d);
/**
 * Update a line item.
 * @param {number} id - Line item primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateLineItem  = (id,d) => api.put(`/line-items/${id}`, d);
/**
 * Delete a line item.
 * @param {number} id - Line item primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteLineItem  = id => api.delete(`/line-items/${id}`);

/**
 * List allocations with optional filters.
 * @param {Object=} params - Optional filter query params
 * @returns {Promise<AxiosResponse>}
 */
export const getAllocations   = (params) => api.get('/allocations', { params });
/**
 * Create a new cost allocation.
 * @param {Object} d - Allocation fields
 * @returns {Promise<AxiosResponse>}
 */
export const createAllocation = d => api.post('/allocations', d);
/**
 * Delete an allocation.
 * @param {number} id - Allocation primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteAllocation = id => api.delete(`/allocations/${id}`);

// ── Allocation Rules ──
export const getAllocationRules          = (params) => api.get('/allocation-rules', { params });
export const saveAccountAllocationRules  = (accountId, d) => api.put(`/allocation-rules/account/${accountId}`, d);

// ── Bank Cost Centers ──
export const getBankCostCenters = () => api.get('/bank-cost-centers');

/**
 * List cost savings entries with optional filters.
 * @param {Object=} params - Optional filter query params
 * @returns {Promise<AxiosResponse>}
 */
export const getCostSavings   = (params) => api.get('/cost-savings', { params });
/**
 * Create a cost saving entry.
 * @param {Object} d - Cost saving fields
 * @returns {Promise<AxiosResponse>}
 */
export const createCostSaving = d  => api.post('/cost-savings', d);
/**
 * Update a cost saving entry.
 * @param {number} id - Cost saving primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateCostSaving = (id,d) => api.put(`/cost-savings/${id}`, d);
/**
 * Delete a cost saving entry.
 * @param {number} id - Cost saving primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteCostSaving = id => api.delete(`/cost-savings/${id}`);

/**
 * List USOC codes with optional filters.
 * @param {Object=} params - Optional filter query params
 * @returns {Promise<AxiosResponse>}
 */
export const getUsocCodes     = (params) => api.get('/usoc-codes', { params });
export const getUsocCode      = id => api.get(`/usoc-codes/${id}`);
/**
 * Create a USOC code.
 * @param {Object} d - USOC code fields
 * @returns {Promise<AxiosResponse>}
 */
export const createUsocCode   = d  => api.post('/usoc-codes', d);
/**
 * Update a USOC code.
 * @param {number} id - USOC code primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateUsocCode   = (id,d) => api.put(`/usoc-codes/${id}`, d);
/**
 * Delete a USOC code.
 * @param {number} id - USOC code primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteUsocCode   = id => api.delete(`/usoc-codes/${id}`);

/**
 * List contract rates with optional filters.
 * @param {Object=} params - Optional filter query params (contracts_id, etc.)
 * @returns {Promise<AxiosResponse>}
 */
export const getContractRates  = (params) => api.get('/contract-rates', { params });
/**
 * Create a contract rate.
 * @param {Object} d - Contract rate fields
 * @returns {Promise<AxiosResponse>}
 */
export const createContractRate = d  => api.post('/contract-rates', d);
/**
 * Update a contract rate.
 * @param {number} id - Contract rate primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateContractRate = (id,d) => api.put(`/contract-rates/${id}`, d);
/**
 * Delete a contract rate.
 * @param {number} id - Contract rate primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteContractRate = id => api.delete(`/contract-rates/${id}`);

/**
 * List disputes with optional filters.
 * @param {Object=} params - Optional filter query params
 * @returns {Promise<AxiosResponse>}
 */
export const getDisputes       = (params) => api.get('/disputes', { params });
export const getDispute        = id => api.get(`/disputes/${id}`);
/**
 * Create a new dispute.
 * @param {Object} d - Dispute fields
 * @returns {Promise<AxiosResponse>}
 */
export const createDispute     = d  => api.post('/disputes', d);
/**
 * Update a dispute.
 * @param {number} id - Dispute primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateDispute     = (id,d) => api.put(`/disputes/${id}`, d);
/**
 * Delete a dispute.
 * @param {number} id - Dispute primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteDispute     = id => api.delete(`/disputes/${id}`);

/**
 * Run rate validation to compare contract rates against billed charges.
 * @returns {Promise<AxiosResponse>}
 */
export const getRateValidation = () => api.get('/rate-validation');

// ── Auth / Users / Roles ───────────────────────────────────
/**
 * Get the currently authenticated user profile.
 * @returns {Promise<AxiosResponse>}
 */
export const getCurrentUser   = () => api.get('/users/me');
/**
 * Update the current user's preferences.
 * @param {Object} prefs - Preference key-value pairs (theme, rows_per_page, etc.)
 * @returns {Promise<AxiosResponse>}
 */
export const updateMyPreferences = (prefs) => api.put('/users/me/preferences', prefs);
/**
 * List available demo users for impersonation.
 * @returns {Promise<AxiosResponse>}
 */
export const getDemoUsers     = () => api.get('/users/demo-users');
/**
 * List all users.
 * @returns {Promise<AxiosResponse>}
 */
export const getUsers         = () => api.get('/users');
export const getUser          = id => api.get(`/users/${id}`);
/**
 * Create a new user.
 * @param {Object} d - User fields (username, email, roles_id, etc.)
 * @returns {Promise<AxiosResponse>}
 */
export const createUser       = d  => api.post('/users', d);
/**
 * Update a user.
 * @param {number} id - User primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateUser       = (id,d) => api.put(`/users/${id}`, d);
/**
 * Toggle a user's active/inactive status.
 * @param {number} id - User primary key
 * @param {string} status - "active" or "inactive"
 * @returns {Promise<AxiosResponse>}
 */
export const setUserStatus    = (id, status) => api.patch(`/users/${id}/status`, { status });
/**
 * Delete a user.
 * @param {number} id - User primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteUser       = id => api.delete(`/users/${id}`);
/**
 * Get invoices assigned to a user.
 * @param {number} id - User primary key
 * @returns {Promise<AxiosResponse>}
 */
export const getUserInvoices  = id => api.get(`/users/${id}/invoices`);
/**
 * Get orders assigned to a user.
 * @param {number} id - User primary key
 * @returns {Promise<AxiosResponse>}
 */
export const getUserOrders    = id => api.get(`/users/${id}/orders`);
/**
 * Get recent activity/audit log for a user.
 * @param {number} id - User primary key
 * @returns {Promise<AxiosResponse>}
 */
export const getUserActivity  = id => api.get(`/users/${id}/activity`);

/**
 * List all roles.
 * @returns {Promise<AxiosResponse>}
 */
export const getRoles         = () => api.get('/roles');
export const getRole          = id => api.get(`/roles/${id}`);
/**
 * Get users assigned to a role.
 * @param {number} id - Role primary key
 * @returns {Promise<AxiosResponse>}
 */
export const getRoleUsers     = id => api.get(`/roles/${id}/users`);
/**
 * Create a new role.
 * @param {Object} d - Role fields (name, description, permissions, etc.)
 * @returns {Promise<AxiosResponse>}
 */
export const createRole       = d  => api.post('/roles', d);
/**
 * Update a role.
 * @param {number} id - Role primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateRole       = (id,d) => api.put(`/roles/${id}`, d);
/**
 * Delete a role.
 * @param {number} id - Role primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteRole       = id => api.delete(`/roles/${id}`);
/**
 * Get all available permissions (resource × action matrix).
 * @returns {Promise<AxiosResponse>}
 */
export const getPermissions   = () => api.get('/roles/permissions/all');

/**
 * List audit log entries with optional filters.
 * @param {Object=} params - Optional filter query params (action, resource, etc.)
 * @returns {Promise<AxiosResponse>}
 */
export const getAuditLog      = (params) => api.get('/roles/audit-log', { params });
/**
 * Get the audit trail for a specific entity.
 * @param {string} resource - Entity type (e.g. "vendors")
 * @param {number} id - Entity primary key
 * @returns {Promise<AxiosResponse>}
 */
export const getAuditHistory  = (resource, id) => api.get(`/roles/audit-log/resource/${encodeURIComponent(resource)}/${encodeURIComponent(id)}`);

// ── Batch Upload ───────────────────────────────────────────
/**
 * List tables available for batch upload.
 * @returns {Promise<AxiosResponse>}
 */
export const getBatchTables       = () => api.get('/batch-upload/tables');
/**
 * Download an Excel template for batch upload.
 * @param {string} table - Table name to get the template for
 * @returns {Promise<AxiosResponse>}
 */
export const downloadBatchTemplate = (table) => api.get(`/batch-upload/template/${table}`, { responseType: 'blob' });
/**
 * Upload a file for batch import into a table.
 * @param {string} table - Target table name
 * @param {File} file - Excel/CSV file to upload
 * @returns {Promise<AxiosResponse>}
 */
export const uploadBatchFile      = (table, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`/batch-upload/upload/${table}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ── Favorites ──────────────────────────────────────────
/**
 * List the current user's favorites.
 * @returns {Promise<AxiosResponse>}
 */
export const getFavorites    = ()        => api.get('/favorites');
/**
 * Add a favorite bookmark.
 * @param {Object} d - Favorite fields (name, path, filters)
 * @returns {Promise<AxiosResponse>}
 */
export const createFavorite  = d         => api.post('/favorites', d);
/**
 * Rename a favorite.
 * @param {number} id - Favorite primary key
 * @param {string} name - New display name
 * @returns {Promise<AxiosResponse>}
 */
export const renameFavorite  = (id, name) => api.put(`/favorites/${id}`, { name });
/**
 * Delete a favorite.
 * @param {number} id - Favorite primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteFavorite  = id        => api.delete(`/favorites/${id}`);

// ── Notes / Activity ───────────────────────────────────
/**
 * Get notes for a specific entity.
 * @param {string} entityType - Entity type (e.g. "vendors")
 * @param {number} entityId - Entity primary key
 * @returns {Promise<AxiosResponse>}
 */
export const getNotes    = (entityType, entityId) => api.get('/notes', { params: { entity_type: entityType, entity_id: entityId } });
/**
 * Add a note to an entity.
 * @param {Object} d - Note fields (entity_type, entity_id, body)
 * @returns {Promise<AxiosResponse>}
 */
export const createNote  = d => api.post('/notes', d);
/**
 * Delete a note.
 * @param {number} id - Note primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteNote  = id => api.delete(`/notes/${id}`);

// ── Invoice Reader ─────────────────────────────────────
/**
 * Get available target fields for invoice/line item mapping.
 * @returns {Promise<AxiosResponse>}
 */
export const getReaderFields    = () => api.get('/invoice-reader/fields');
/**
 * Upload and parse a file, returning format detection and preview.
 * @param {File} file - Excel, EDI, or PDF file to parse
 * @returns {Promise<AxiosResponse>}
 */
export const parseInvoiceFile   = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/invoice-reader/parse', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
/**
 * Batch import invoices using a template/profile mapping.
 * @param {File} file - File to process
 * @param {Object=} opts - { template_id, vendors_id, mappings, sheet_name, profile_id }
 * @returns {Promise<AxiosResponse>}
 */
export const processInvoiceFile = (file, { template_id, vendors_id, mappings, sheet_name, profile_id } = {}) => {
  const fd = new FormData();
  fd.append('file', file);
  if (template_id) fd.append('template_id', template_id);
  if (vendors_id) fd.append('vendors_id', vendors_id);
  if (mappings) fd.append('mappings', JSON.stringify(mappings));
  if (sheet_name) fd.append('sheet_name', sheet_name);
  if (profile_id) fd.append('profile_id', profile_id);
  return api.post('/invoice-reader/process', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
/**
 * List parsing templates.
 * @param {Object=} params - Optional filter query params
 * @returns {Promise<AxiosResponse>}
 */
export const getReaderTemplates  = (params) => api.get('/invoice-reader/templates', { params });
/**
 * Save a new parsing template.
 * @param {Object} d - Template fields (name, mappings, etc.)
 * @returns {Promise<AxiosResponse>}
 */
export const createReaderTemplate = d => api.post('/invoice-reader/templates', d);
/**
 * Delete a parsing template.
 * @param {number} id - Template primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteReaderTemplate = id => api.delete(`/invoice-reader/templates/${id}`);
/**
 * List historical uploads.
 * @param {Object=} params - Optional filter query params
 * @returns {Promise<AxiosResponse>}
 */
export const getReaderUploads    = (params) => api.get('/invoice-reader/uploads', { params });

// ── Invoice Reader Profiles ────────────────────────────────
/**
 * List invoice reader profiles.
 * @param {Object=} params - Optional filter query params
 * @returns {Promise<AxiosResponse>}
 */
export const getReaderProfiles   = (params) => api.get('/invoice-reader/profiles', { params });
export const getReaderProfile    = id => api.get(`/invoice-reader/profiles/${id}`);
/**
 * Create a reader profile.
 * @param {Object} d - Profile fields
 * @returns {Promise<AxiosResponse>}
 */
export const createReaderProfile = d => api.post('/invoice-reader/profiles', d);
/**
 * Update a reader profile.
 * @param {number} id - Profile primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateReaderProfile = (id, d) => api.put(`/invoice-reader/profiles/${id}`, d);
/**
 * Delete a reader profile.
 * @param {number} id - Profile primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteReaderProfile = id => api.delete(`/invoice-reader/profiles/${id}`);
/**
 * Test which profile matches an uploaded file.
 * @param {File} file - File to test
 * @returns {Promise<AxiosResponse>}
 */
export const testProfileMatch    = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/invoice-reader/profiles/test-match', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ── Invoice Reader Exceptions ──────────────────────────────
/**
 * List invoice reader exceptions.
 * @param {Object=} params - Optional filter query params
 * @returns {Promise<AxiosResponse>}
 */
export const getReaderExceptions    = (params) => api.get('/invoice-reader/exceptions', { params });
/**
 * Get aggregate statistics for reader exceptions.
 * @returns {Promise<AxiosResponse>}
 */
export const getReaderExceptionStats = () => api.get('/invoice-reader/exceptions/stats');
export const getReaderException     = id => api.get(`/invoice-reader/exceptions/${id}`);
/**
 * Resolve an exception with corrected data.
 * @param {number} id - Exception primary key
 * @param {Object} d - Resolution data
 * @returns {Promise<AxiosResponse>}
 */
export const resolveReaderException = (id, d) => api.put(`/invoice-reader/exceptions/${id}/resolve`, d);
/**
 * Update/ignore an exception.
 * @param {number} id - Exception primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateReaderException  = (id, d) => api.put(`/invoice-reader/exceptions/${id}`, d);

// ── Tickets ─────────────────────────────────────────────
/**
 * List support tickets with optional filters.
 * @param {Object=} params - Optional filter query params
 * @returns {Promise<AxiosResponse>}
 */
export const getTickets          = (params)     => api.get('/tickets', { params });
export const getTicket           = id           => api.get(`/tickets/${id}`);
/**
 * Create a new support ticket.
 * @param {Object} d - Ticket fields (subject, description, category, priority, etc.)
 * @returns {Promise<AxiosResponse>}
 */
export const createTicket        = d            => api.post('/tickets', d);
/**
 * Update a ticket.
 * @param {number} id - Ticket primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateTicket        = (id, d)      => api.put(`/tickets/${id}`, d);
/**
 * Delete a ticket.
 * @param {number} id - Ticket primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteTicket        = id           => api.delete(`/tickets/${id}`);
/**
 * Add a comment to a ticket.
 * @param {number} id - Ticket primary key
 * @param {Object} d - { body }
 * @returns {Promise<AxiosResponse>}
 */
export const addTicketComment    = (id, d)      => api.post(`/tickets/${id}/comments`, d);
/**
 * Delete a ticket comment.
 * @param {number} tid - Ticket primary key
 * @param {number} cid - Comment primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteTicketComment = (tid, cid)   => api.delete(`/tickets/${tid}/comments/${cid}`);
/**
 * Get ticket metadata (categories, priorities, statuses).
 * @returns {Promise<AxiosResponse>}
 */
export const getTicketMeta       = ()           => api.get('/tickets/meta');

// ── Report Builder ─────────────────────────────────────────
/**
 * Get the report type catalog with available columns and filters.
 * @returns {Promise<AxiosResponse>}
 */
export const getReportCatalog  = ()       => api.get('/reports/catalog');
/**
 * Execute a report with the given configuration.
 * @param {Object} config - Report config (type, columns, filters, sort, etc.)
 * @returns {Promise<AxiosResponse>}
 */
export const runReport         = config   => api.post('/reports/run', config);


/**
 * List saved report configurations.
 * @returns {Promise<AxiosResponse>}
 */
export const getSavedReports   = ()       => api.get('/reports');
export const getSavedReport    = id       => api.get(`/reports/${id}`);
/**
 * Save a new report configuration.
 * @param {Object} d - Report config to save
 * @returns {Promise<AxiosResponse>}
 */
export const saveReport        = d        => api.post('/reports/save', d);
/**
 * Update a saved report.
 * @param {number} id - Saved report primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateSavedReport = (id, d)  => api.put(`/reports/${id}`, d);
/**
 * Delete a saved report.
 * @param {number} id - Saved report primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteSavedReport = id       => api.delete(`/reports/${id}`);

// ── Graph Builder ──────────────────────────────────────────
export const getSavedGraphs    = ()       => api.get('/graphs');
export const getSavedGraph     = id       => api.get(`/graphs/${id}`);
export const saveGraph         = d        => api.post('/graphs/save', d);
export const updateSavedGraph  = (id, d)  => api.put(`/graphs/${id}`, d);
export const deleteSavedGraph  = id       => api.delete(`/graphs/${id}`);

// ── Report Export Jobs ─────────────────────────────────────────
export const createReportJob   = d        => api.post('/report-jobs', d);
export const getReportJobs     = ()       => api.get('/report-jobs');
export const getReportJob      = id       => api.get(`/report-jobs/${id}`);
export const downloadReportJob = id       => `${api.defaults.baseURL}/report-jobs/${id}/download`;
export const deleteReportJob   = id       => api.delete(`/report-jobs/${id}`);

// ── Notifications ──────────────────────────────────────────────
/**
 * Get the current user's notifications.
 * @returns {Promise<AxiosResponse>}
 */
export const getNotifications        = ()  => api.get('/notifications');
/**
 * Mark a single notification as read.
 * @param {number} id - Notification primary key
 * @returns {Promise<AxiosResponse>}
 */
export const markNotificationRead    = id  => api.patch(`/notifications/${id}/read`);
/**
 * Mark all notifications as read.
 * @returns {Promise<AxiosResponse>}
 */
export const markAllNotificationsRead = () => api.patch('/notifications/read-all');

// ── Notification Settings ──────────────────────────────────────
export const getNotificationSettings        = ()     => api.get('/notification-settings');
export const getNotificationSetting         = id     => api.get(`/notification-settings/${id}`);
export const createNotificationSetting      = d      => api.post('/notification-settings', d);
export const updateNotificationSetting      = (id,d) => api.put(`/notification-settings/${id}`, d);
export const deleteNotificationSetting      = id     => api.delete(`/notification-settings/${id}`);

// ── Form Instructions ──────────────────────────────────────────
/**
 * List all form instruction entries.
 * @returns {Promise<AxiosResponse>}
 */
export const getFormInstructions = () => api.get('/form-instructions');

// ── Workflows ──────────────────────────────────────────────
/**
 * List workflow run instances.
 * @returns {Promise<AxiosResponse>}
 */
export const getWorkflowRuns       = ()          => api.get('/workflows');
export const getWorkflowRun        = id          => api.get(`/workflows/${id}`);
/**
 * List available workflow definitions.
 * @returns {Promise<AxiosResponse>}
 */
export const getWorkflowDefinitions = ()         => api.get('/workflows/definitions');
/**
 * Execute a workflow.
 * @param {Object} d - { workflow_key, context }
 * @returns {Promise<AxiosResponse>}
 */
export const executeWorkflow       = d           => api.post('/workflows/execute', d);
/**
 * Run a workflow demo with sample data.
 * @param {string} key - Workflow definition key
 * @param {Object} d - Demo context data
 * @returns {Promise<AxiosResponse>}
 */
export const runWorkflowDemo       = (key, d)    => api.post(`/workflows/demo/${key}`, d);
/**
 * Get instruction for a specific form.
 * @param {string} formId - Form identifier string
 * @returns {Promise<AxiosResponse>}
 */
export const getFormInstructionByFormId = formId => api.get(`/form-instructions/by-form/${formId}`);
/**
 * Create a form instruction.
 * @param {Object} d - Form instruction fields
 * @returns {Promise<AxiosResponse>}
 */
export const createFormInstruction = d => api.post('/form-instructions', d);
/**
 * Update a form instruction.
 * @param {number} id - Form instruction primary key
 * @param {Object} d - Fields to update
 * @returns {Promise<AxiosResponse>}
 */
export const updateFormInstruction = (id, d) => api.put(`/form-instructions/${id}`, d);
/**
 * Delete a form instruction.
 * @param {number} id - Form instruction primary key
 * @returns {Promise<AxiosResponse>}
 */
export const deleteFormInstruction = id => api.delete(`/form-instructions/${id}`);

// ── Bulk Update (generic) ─────────────────────────────────
/**
 * Bulk-update multiple records in a resource table.
 * @param {string} resource - Route resource name (e.g. "vendors")
 * @param {number[]} ids - Array of primary keys to update
 * @param {Object} updates - Field-value pairs to apply
 * @returns {Promise<AxiosResponse>}
 */
export const bulkUpdate = (resource, ids, updates) => api.patch(`/${resource}/bulk`, { ids, updates });

// ── Email Config (Admin) ──────────────────────────────────
/**
 * Get the current email/SMTP configuration.
 * @returns {Promise<AxiosResponse>}
 */
export const getEmailConfig    = ()       => api.get('/email-config');
/**
 * Update email configuration settings.
 * @param {Object} d - SMTP config fields
 * @returns {Promise<AxiosResponse>}
 */
export const updateEmailConfig = d        => api.put('/email-config', d);
/**
 * Send a test email.
 * @param {Object} d - { to }
 * @returns {Promise<AxiosResponse>}
 */
export const sendTestEmail     = d        => api.post('/email-config/test', d);
/**
 * List email send log entries.
 * @param {Object=} params - Optional filter query params
 * @returns {Promise<AxiosResponse>}
 */
export const getEmailLog       = (params) => api.get('/email-config/log', { params });

// Admin Dashboard
/**
 * Get admin dashboard data (system health, table counts, etc.).
 * @returns {Promise<AxiosResponse>}
 */
export const getAdminDashboard = ()           => api.get('/admin-dashboard');
/**
 * Get detailed database statistics (table sizes, row counts).
 * @returns {Promise<AxiosResponse>}
 */
export const getAdminDbStats   = ()           => api.get('/admin-dashboard/db-stats');
/**
 * Purge old data from the system.
 * @param {Object} data - Purge configuration ({ table, before_date })
 * @returns {Promise<AxiosResponse>}
 */
export const adminPurge        = (data)       => api.post('/admin-dashboard/purge', data);
/**
 * Retry all failed email sends.
 * @returns {Promise<AxiosResponse>}
 */
export const adminRetryEmails  = ()           => api.post('/admin-dashboard/retry-emails');
/**
 * Preview what would be deleted if an entity is purged.
 * @param {string} entity - Entity type (e.g. "vendors")
 * @param {string|number} id - Entity primary key or natural key (invoice_number, inventory_number, name)
 * @returns {Promise<AxiosResponse>}
 */
export const adminPurgePreview = (entity, id) => api.get(`/admin-dashboard/purge-preview/${encodeURIComponent(entity)}/${encodeURIComponent(id)}`);
/**
 * Permanently delete an entity and all cascading dependents.
 * @param {string} entity - Entity type
 * @param {string|number} id - Entity primary key or natural key
 * @returns {Promise<AxiosResponse>}
 */
export const adminPurgeEntity  = (entity, id) => api.delete(`/admin-dashboard/purge-entity/${encodeURIComponent(entity)}/${encodeURIComponent(id)}`);

// ── Invoice Approvers ───────────────────────────────────
export const getApprovalLevels       = ()         => api.get('/invoice-approvers/levels');
export const updateApprovalLevel     = (id, d)    => api.put(`/invoice-approvers/levels/${id}`, d);
export const getInvoiceApprovers     = ()         => api.get('/invoice-approvers');
export const getInvoiceApproversByUser = (userId) => api.get(`/invoice-approvers/user/${userId}`);
export const saveInvoiceApprovers    = (userId, levels) => api.put(`/invoice-approvers/user/${userId}`, { levels });
export const deleteInvoiceApprovers  = (userId)   => api.delete(`/invoice-approvers/user/${userId}`);

// ── System Settings ────────────────────────────────────────────
export const getSystemSetting        = (key)      => api.get(`/system-settings/${encodeURIComponent(key)}`);
export const saveSystemSetting       = (key, value) => api.put(`/system-settings/${encodeURIComponent(key)}`, { value });
export const deleteSystemSetting     = (key)      => api.delete(`/system-settings/${encodeURIComponent(key)}`);
