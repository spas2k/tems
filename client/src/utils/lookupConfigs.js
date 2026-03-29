/**
 * @file Lookup field/modal configuration factories.
 * @module lookupConfigs
 *
 * Exports factory functions that return configuration objects for
 * <LookupField> and <LookupModal> components. Each factory defines the
 * columns, search keys, display format, and placeholder for a lookup type.
 *
 * @exports LOOKUP_VENDORS - Vendor lookup config. Columns: ID, Name, Contact, Status.
 * @exports LOOKUP_CONTRACTS - Contract lookup config. Columns: ID, Name, Vendor, Status.
 * @exports LOOKUP_USERS - User lookup config. Columns: ID, Username, Email, Role.
 * @exports LOOKUP_ACCOUNTS - Account lookup config. Columns: ID, Account Number, Name.
 * @exports LOOKUP_LOCATIONS - Location lookup config. Columns: ID, Name, City, State.
 * @exports LOOKUP_LOCATION_TEXT - Text-only location lookup (name display).
 * @exports LOOKUP_CURRENCIES - Currency/ISO code lookup config.
 * @exports LOOKUP_INVOICES - Invoice lookup config. Columns: ID, Invoice Number, Vendor.
 * @exports LOOKUP_INVENTORY - Inventory lookup config. Columns: ID, Circuit ID, Type.
 * @exports LOOKUP_ORDERS - Order lookup config. Columns: ID, Order Number, Vendor.
 */
﻿export const LOOKUP_VENDORS = (data = []) => ({
  data,
  idKey: 'vendors_id',
  displayKey: 'name',
  modalTitle: 'Select Vendor',
  searchableKeys: ['name', 'vendor_number', 'vendor_type', 'status'],
  columns: [
    { key: 'name', label: 'VENDOR NAME' },
    { key: 'vendor_number', label: 'VENDOR #' },
    { key: 'status', label: 'STATUS' }
  ],
  placeholder: 'Select vendor...',
});

export const LOOKUP_CONTRACTS = (data = []) => ({
  data,
  idKey: 'contracts_id',
  displayKey: 'contract_number',
  modalTitle: 'Select Contract',
  searchableKeys: ['contract_number', 'name', 'status'],
  columns: [
    { key: 'contract_number', label: 'CONTRACT NUMBER' },
    { key: 'name', label: 'CONTRACT NAME' },
    { key: 'status', label: 'STATUS' }
  ],
  placeholder: 'Select contract...',
});

export const LOOKUP_USERS = (data = []) => ({
  data,
  idKey: 'users_id',
  displayKey: 'display_name',
  modalTitle: 'Select User',
  searchableKeys: ['display_name', 'email', 'status'],
  columns: [
    { key: 'display_name', label: 'USER NAME' },
    { key: 'email', label: 'EMAIL' },
    { key: 'status', label: 'STATUS' }
  ],
  placeholder: 'Select user...',
});

export const LOOKUP_ACCOUNTS = (data = []) => ({
  data,
  idKey: 'accounts_id',
  displayKey: 'account_number',
  modalTitle: 'Select Account',
  searchableKeys: ['account_number', 'name', 'status'],
  columns: [
    { key: 'account_number', label: 'ACCOUNT NUMBER' },
    { key: 'name', label: 'PROFILE NAME' },
    { key: 'status', label: 'STATUS' }
  ],
  placeholder: 'Select account...',
});

export const LOOKUP_LOCATIONS = (data = []) => ({
  data,
  idKey: 'locations_id',
  displayKey: 'location_name',
  modalTitle: 'Select Location',
  searchableKeys: ['location_name', 'address', 'city', 'state'],
  columns: [
    { key: 'location_name', label: 'LOCATION NAME' },
    { key: 'city', label: 'CITY' },
    { key: 'state', label: 'STATE' }
  ],
  placeholder: 'Select location...',
});

// Stores location_name (string) into a plain text field instead of the FK
export const LOOKUP_LOCATION_TEXT = (data = []) => ({
  data,
  idKey: 'location_name',
  displayKey: 'location_name',
  modalTitle: 'Select Location',
  searchableKeys: ['location_name', 'address', 'city', 'state'],
  columns: [
    { key: 'location_name', label: 'LOCATION NAME' },
    { key: 'city', label: 'CITY' },
    { key: 'state', label: 'STATE' }
  ],
  placeholder: 'Select location...',
});

export const LOOKUP_CURRENCIES = (data = []) => ({
  data,
  idKey: 'currency_id',
  displayKey: 'currency_code',
  modalTitle: 'Select Currency',
  searchableKeys: ['currency_code', 'currency_name'],
  columns: [
    { key: 'currency_code', label: 'CURRENCY CODE' },
    { key: 'currency_name', label: 'CURRENCY NAME' }
  ],
  placeholder: 'Select currency...',
});

export const LOOKUP_INVOICES = (data = []) => ({
  data,
  idKey: 'invoices_id',
  displayKey: 'invoice_number',
  modalTitle: 'Select Invoice',
  searchableKeys: ['invoice_number', 'status'],
  columns: [
    { key: 'invoice_number', label: 'INVOICE #' },
    { key: 'invoice_date',   label: 'INVOICE DATE' },
    { key: 'total_amount',   label: 'AMOUNT' },
    { key: 'status',         label: 'STATUS' },
  ],
  placeholder: 'Select invoice...',
});

export const LOOKUP_INVENTORY = (data = []) => ({
  data,
  idKey: 'inventory_id',
  displayKey: 'inventory_number',
  modalTitle: 'Select Inventory Item',
  searchableKeys: ['inventory_number', 'type', 'location', 'status'],
  columns: [
    { key: 'inventory_number', label: 'INVENTORY #' },
    { key: 'type',             label: 'TYPE' },
    { key: 'location',         label: 'LOCATION' },
    { key: 'status',           label: 'STATUS' },
  ],
  placeholder: 'Select inventory item...',
});

export const LOOKUP_ORDERS = (data = []) => ({
  data,
  idKey: 'orders_id',
  displayKey: 'order_number',
  modalTitle: 'Select Order',
  searchableKeys: ['order_number', 'description', 'status'],
  columns: [
    { key: 'order_number', label: 'ORDER #' },
    { key: 'description',  label: 'DESCRIPTION' },
    { key: 'status',       label: 'STATUS' },
  ],
  placeholder: 'Select order...',
});
