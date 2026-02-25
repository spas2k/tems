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
