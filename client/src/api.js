import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export const getDashboard    = () => api.get('/dashboard');
export const globalSearch    = q  => api.get('/search', { params: { q } });
export const getAccounts        = () => api.get('/accounts');
export const getAccount         = id => api.get(`/accounts/${id}`);
export const getAccountCircuits = id => api.get(`/accounts/${id}/circuits`);
export const createAccount      = d  => api.post('/accounts', d);
export const updateAccount      = (id,d) => api.put(`/accounts/${id}`, d);
export const deleteAccount      = id => api.delete(`/accounts/${id}`);

export const getContracts         = (params) => api.get('/contracts', { params });
export const getContract          = id => api.get(`/contracts/${id}`);
export const getContractCircuits  = id => api.get(`/contracts/${id}/circuits`);
export const getContractOrders    = id => api.get(`/contracts/${id}/orders`);
export const createContract       = d  => api.post('/contracts', d);
export const updateContract       = (id,d) => api.put(`/contracts/${id}`, d);
export const deleteContract       = id => api.delete(`/contracts/${id}`);

export const getCircuits        = (params) => api.get('/circuits', { params });
export const getCircuit         = id => api.get(`/circuits/${id}`);
export const getCircuitInvoices = id => api.get(`/circuits/${id}/invoices`);
export const createCircuit      = d  => api.post('/circuits', d);
export const updateCircuit      = (id,d) => api.put(`/circuits/${id}`, d);
export const deleteCircuit      = id => api.delete(`/circuits/${id}`);

export const getOrders        = (params) => api.get('/orders', { params });
export const getOrder         = id => api.get(`/orders/${id}`);
export const getOrderCircuits = id => api.get(`/orders/${id}/circuits`);
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
export const updateAllocation = (id,d) => api.put(`/allocations/${id}`, d);
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
export const getContractRate   = id => api.get(`/contract-rates/${id}`);
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
export const getUsers         = () => api.get('/users');
export const getUser          = id => api.get(`/users/${id}`);
export const createUser       = d  => api.post('/users', d);
export const updateUser       = (id,d) => api.put(`/users/${id}`, d);
export const deleteUser       = id => api.delete(`/users/${id}`);

export const getRoles         = () => api.get('/roles');
export const getRole          = id => api.get(`/roles/${id}`);
export const createRole       = d  => api.post('/roles', d);
export const updateRole       = (id,d) => api.put(`/roles/${id}`, d);
export const deleteRole       = id => api.delete(`/roles/${id}`);
export const getPermissions   = () => api.get('/roles/permissions/all');

export const getAuditLog      = (params) => api.get('/roles/audit-log', { params });

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
export const processInvoiceFile = (file, { template_id, accounts_id, mappings, sheet_name } = {}) => {
  const fd = new FormData();
  fd.append('file', file);
  if (template_id) fd.append('template_id', template_id);
  if (accounts_id) fd.append('accounts_id', accounts_id);
  if (mappings) fd.append('mappings', JSON.stringify(mappings));
  if (sheet_name) fd.append('sheet_name', sheet_name);
  return api.post('/invoice-reader/process', fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const getReaderTemplates  = (params) => api.get('/invoice-reader/templates', { params });
export const getReaderTemplate   = id => api.get(`/invoice-reader/templates/${id}`);
export const createReaderTemplate = d => api.post('/invoice-reader/templates', d);
export const updateReaderTemplate = (id, d) => api.put(`/invoice-reader/templates/${id}`, d);
export const deleteReaderTemplate = id => api.delete(`/invoice-reader/templates/${id}`);
export const getReaderUploads    = (params) => api.get('/invoice-reader/uploads', { params });
