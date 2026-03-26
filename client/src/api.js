import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

// Dev mode: attach the impersonated user ID so the backend loads
// that user's role/permissions instead of the default admin.
api.interceptors.request.use(config => {
  const uid = localStorage.getItem('tems-demo-user-id');
  if (uid) config.headers['X-Dev-User-Id'] = uid;
  return config;
});

export const getDashboard    = () => api.get('/dashboard');
export const globalSearch    = q  => api.get('/search', { params: { q } });
export const getVendors         = () => api.get('/vendors');
export const getVendor          = id => api.get(`/vendors/${id}`);
export const getVendorInventory  = id => api.get(`/vendors/${id}/inventory`);
export const createVendor       = d  => api.post('/vendors', d);
export const updateVendor       = (id,d) => api.put(`/vendors/${id}`, d);
export const deleteVendor       = id => api.delete(`/vendors/${id}`);
export const getAccounts        = () => api.get('/accounts');
export const getAccount         = id => api.get(`/accounts/${id}`);
export const getAccountInventory = id => api.get(`/accounts/${id}/inventory`);
export const createAccount      = d  => api.post('/accounts', d);
export const updateAccount      = (id,d) => api.put(`/accounts/${id}`, d);
export const deleteAccount      = id => api.delete(`/accounts/${id}`);

export const getLocations    = ()        => api.get('/locations');
export const getLocation     = id        => api.get(`/locations/${id}`);
export const createLocation  = d         => api.post('/locations', d);
export const updateLocation  = (id, d)   => api.put(`/locations/${id}`, d);
export const deleteLocation  = id        => api.delete(`/locations/${id}`);

export const getFieldCatalog           = (params) => api.get('/field-catalog', { params });
export const createFieldCatalog        = d         => api.post('/field-catalog', d);
export const updateFieldCatalog        = (id, d)   => api.put(`/field-catalog/${id}`, d);
export const deleteFieldCatalog        = id        => api.delete(`/field-catalog/${id}`);

export const getVendorRemits   = (params)  => api.get('/vendor-remit', { params });
export const getVendorRemit    = id        => api.get(`/vendor-remit/${id}`);
export const createVendorRemit = d         => api.post('/vendor-remit', d);
export const updateVendorRemit = (id, d)   => api.put(`/vendor-remit/${id}`, d);
export const deleteVendorRemit = id        => api.delete(`/vendor-remit/${id}`);

export const getAnnouncements    = (params) => api.get('/announcements', { params });
export const createAnnouncement  = d        => api.post('/announcements', d);
export const updateAnnouncement  = (id, d)  => api.put(`/announcements/${id}`, d);
export const deleteAnnouncement  = id       => api.delete(`/announcements/${id}`);

export const getSpendCategories   = ()        => api.get('/spend-categories');
export const createSpendCategory  = d         => api.post('/spend-categories', d);
export const updateSpendCategory  = (id, d)   => api.put(`/spend-categories/${id}`, d);
export const deleteSpendCategory  = id        => api.delete(`/spend-categories/${id}`);

export const getContracts         = (params) => api.get('/contracts', { params });
export const getContract          = id => api.get(`/contracts/${id}`);
export const getContractInventory  = id => api.get(`/contracts/${id}/inventory`);
export const getContractOrders    = id => api.get(`/contracts/${id}/orders`);
export const createContract       = d  => api.post('/contracts', d);
export const updateContract       = (id,d) => api.put(`/contracts/${id}`, d);
export const deleteContract       = id => api.delete(`/contracts/${id}`);

export const getInventory        = (params) => api.get('/inventory', { params });
export const getInventoryItem         = id => api.get(`/inventory/${id}`);
export const getInventoryItemInvoices = id => api.get(`/inventory/${id}/invoices`);
export const createInventoryItem      = d  => api.post('/inventory', d);
export const updateInventoryItem      = (id,d) => api.put(`/inventory/${id}`, d);
export const deleteInventoryItem      = id => api.delete(`/inventory/${id}`);

export const getOrders        = (params) => api.get('/orders', { params });
export const getOrder         = id => api.get(`/orders/${id}`);
export const getOrderInventory = id => api.get(`/orders/${id}/inventory`);
export const createOrder      = d  => api.post('/orders', d);
export const updateOrder      = (id,d) => api.put(`/orders/${id}`, d);
export const deleteOrder      = id => api.delete(`/orders/${id}`);

export const getInvoices     = (params) => api.get('/invoices', { params });
export const getInvoice      = id => api.get(`/invoices/${id}`);
export const createInvoice   = d  => api.post('/invoices', d);
export const updateInvoice   = (id,d) => api.put(`/invoices/${id}`, d);
export const deleteInvoice   = id => api.delete(`/invoices/${id}`);

export const getLineItems    = (params) => api.get('/line-items', { params });
export const createLineItem  = d  => api.post('/line-items', d);
export const updateLineItem  = (id,d) => api.put(`/line-items/${id}`, d);
export const deleteLineItem  = id => api.delete(`/line-items/${id}`);

export const getAllocations   = (params) => api.get('/allocations', { params });
export const createAllocation = d => api.post('/allocations', d);
export const deleteAllocation = id => api.delete(`/allocations/${id}`);

export const getCostSavings   = (params) => api.get('/cost-savings', { params });
export const createCostSaving = d  => api.post('/cost-savings', d);
export const updateCostSaving = (id,d) => api.put(`/cost-savings/${id}`, d);
export const deleteCostSaving = id => api.delete(`/cost-savings/${id}`);

export const getUsocCodes     = (params) => api.get('/usoc-codes', { params });
export const getUsocCode      = id => api.get(`/usoc-codes/${id}`);
export const createUsocCode   = d  => api.post('/usoc-codes', d);
export const updateUsocCode   = (id,d) => api.put(`/usoc-codes/${id}`, d);
export const deleteUsocCode   = id => api.delete(`/usoc-codes/${id}`);

export const getContractRates  = (params) => api.get('/contract-rates', { params });
export const createContractRate = d  => api.post('/contract-rates', d);
export const updateContractRate = (id,d) => api.put(`/contract-rates/${id}`, d);
export const deleteContractRate = id => api.delete(`/contract-rates/${id}`);

export const getDisputes       = (params) => api.get('/disputes', { params });
export const getDispute        = id => api.get(`/disputes/${id}`);
export const createDispute     = d  => api.post('/disputes', d);
export const updateDispute     = (id,d) => api.put(`/disputes/${id}`, d);
export const deleteDispute     = id => api.delete(`/disputes/${id}`);

export const getRateValidation = () => api.get('/rate-validation');

// ── Auth / Users / Roles ───────────────────────────────────
export const getCurrentUser   = () => api.get('/users/me');
export const updateMyPreferences = (prefs) => api.put('/users/me/preferences', prefs);
export const getDemoUsers     = () => api.get('/users/demo-users');
export const getUsers         = () => api.get('/users');
export const getUser          = id => api.get(`/users/${id}`);
export const createUser       = d  => api.post('/users', d);
export const updateUser       = (id,d) => api.put(`/users/${id}`, d);
export const deleteUser       = id => api.delete(`/users/${id}`);
export const getUserInvoices  = id => api.get(`/users/${id}/invoices`);
export const getUserOrders    = id => api.get(`/users/${id}/orders`);
export const getUserActivity  = id => api.get(`/users/${id}/activity`);

export const getRoles         = () => api.get('/roles');
export const getRole          = id => api.get(`/roles/${id}`);
export const createRole       = d  => api.post('/roles', d);
export const updateRole       = (id,d) => api.put(`/roles/${id}`, d);
export const deleteRole       = id => api.delete(`/roles/${id}`);
export const getPermissions   = () => api.get('/roles/permissions/all');

export const getAuditLog      = (params) => api.get('/roles/audit-log', { params });
export const getAuditHistory  = (resource, id) => api.get(`/roles/audit-log/resource/${encodeURIComponent(resource)}/${encodeURIComponent(id)}`);

// ── Batch Upload ───────────────────────────────────────────
export const getBatchTables       = () => api.get('/batch-upload/tables');
export const downloadBatchTemplate = (table) => api.get(`/batch-upload/template/${table}`, { responseType: 'blob' });
export const uploadBatchFile      = (table, file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post(`/batch-upload/upload/${table}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ── Favorites ──────────────────────────────────────────
export const getFavorites    = ()        => api.get('/favorites');
export const createFavorite  = d         => api.post('/favorites', d);
export const renameFavorite  = (id, name) => api.put(`/favorites/${id}`, { name });
export const deleteFavorite  = id        => api.delete(`/favorites/${id}`);

// ── Notes / Activity ───────────────────────────────────
export const getNotes    = (entityType, entityId) => api.get('/notes', { params: { entity_type: entityType, entity_id: entityId } });
export const createNote  = d => api.post('/notes', d);
export const deleteNote  = id => api.delete(`/notes/${id}`);

// ── Invoice Reader ─────────────────────────────────────
export const getReaderFields    = () => api.get('/invoice-reader/fields');
export const parseInvoiceFile   = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/invoice-reader/parse', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
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
export const getReaderTemplates  = (params) => api.get('/invoice-reader/templates', { params });
export const createReaderTemplate = d => api.post('/invoice-reader/templates', d);
export const deleteReaderTemplate = id => api.delete(`/invoice-reader/templates/${id}`);
export const getReaderUploads    = (params) => api.get('/invoice-reader/uploads', { params });

// ── Invoice Reader Profiles ────────────────────────────────
export const getReaderProfiles   = (params) => api.get('/invoice-reader/profiles', { params });
export const getReaderProfile    = id => api.get(`/invoice-reader/profiles/${id}`);
export const createReaderProfile = d => api.post('/invoice-reader/profiles', d);
export const updateReaderProfile = (id, d) => api.put(`/invoice-reader/profiles/${id}`, d);
export const deleteReaderProfile = id => api.delete(`/invoice-reader/profiles/${id}`);
export const testProfileMatch    = (file) => {
  const fd = new FormData();
  fd.append('file', file);
  return api.post('/invoice-reader/profiles/test-match', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

// ── Invoice Reader Exceptions ──────────────────────────────
export const getReaderExceptions    = (params) => api.get('/invoice-reader/exceptions', { params });
export const getReaderExceptionStats = () => api.get('/invoice-reader/exceptions/stats');
export const getReaderException     = id => api.get(`/invoice-reader/exceptions/${id}`);
export const resolveReaderException = (id, d) => api.put(`/invoice-reader/exceptions/${id}/resolve`, d);
export const updateReaderException  = (id, d) => api.put(`/invoice-reader/exceptions/${id}`, d);

// ── Tickets ─────────────────────────────────────────────
export const getTickets          = (params)     => api.get('/tickets', { params });
export const getTicket           = id           => api.get(`/tickets/${id}`);
export const createTicket        = d            => api.post('/tickets', d);
export const updateTicket        = (id, d)      => api.put(`/tickets/${id}`, d);
export const deleteTicket        = id           => api.delete(`/tickets/${id}`);
export const addTicketComment    = (id, d)      => api.post(`/tickets/${id}/comments`, d);
export const deleteTicketComment = (tid, cid)   => api.delete(`/tickets/${tid}/comments/${cid}`);
export const getTicketMeta       = ()           => api.get('/tickets/meta');

// ── Report Builder ─────────────────────────────────────────
export const getReportCatalog  = ()       => api.get('/reports/catalog');
export const runReport         = config   => api.post('/reports/run', config);
export const getSavedReports   = ()       => api.get('/reports');
export const getSavedReport    = id       => api.get(`/reports/${id}`);
export const saveReport        = d        => api.post('/reports/save', d);
export const updateSavedReport = (id, d)  => api.put(`/reports/${id}`, d);
export const deleteSavedReport = id       => api.delete(`/reports/${id}`);

// ── Notifications ──────────────────────────────────────────────
export const getNotifications        = ()  => api.get('/notifications');
export const markNotificationRead    = id  => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch('/notifications/read-all');

// ── Form Instructions ──────────────────────────────────────────
export const getFormInstructions = () => api.get('/form-instructions');

// ── Workflows ──────────────────────────────────────────────
export const getWorkflowRuns       = ()          => api.get('/workflows');
export const getWorkflowRun        = id          => api.get(`/workflows/${id}`);
export const getWorkflowDefinitions = ()         => api.get('/workflows/definitions');
export const executeWorkflow       = d           => api.post('/workflows/execute', d);
export const runWorkflowDemo       = (key, d)    => api.post(`/workflows/demo/${key}`, d);
export const getFormInstructionByFormId = formId => api.get(`/form-instructions/by-form/${formId}`);
export const createFormInstruction = d => api.post('/form-instructions', d);
export const updateFormInstruction = (id, d) => api.put(`/form-instructions/${id}`, d);
export const deleteFormInstruction = id => api.delete(`/form-instructions/${id}`);

// ── Bulk Update (generic) ─────────────────────────────────
export const bulkUpdate = (resource, ids, updates) => api.patch(`/${resource}/bulk`, { ids, updates });
