/**
 * @file New location creation form.
 * @module LocationAdd
 *
 * Uses FormPage to render fields for name, address, city, state, and zip.
 */
import React from 'react';
import { MapPin } from 'lucide-react';
import { createLocation } from '../api';
import FormPage from '../components/FormPage';

const SITE_TYPES = ['Data Center', 'Office', 'Remote', 'Warehouse', 'Colocation', 'Other'];

const EMPTY = {
  name: '', site_code: '', site_type: 'Office', address: '', city: '', state: '',
  zip: '', country: 'USA', contact_name: '', contact_phone: '', contact_email: '',
  status: 'Active', notes: '',
};

const SECTIONS = [
  {
    title: 'Location Details',
    description: 'Basic site information',
    fields: [
      { key: 'name', label: 'Site Name *' },
      { key: 'site_code', label: 'Site Code', half: true },
      { key: 'site_type', label: 'Site Type', type: 'select', options: SITE_TYPES, half: true },
      { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
    ],
  },
  {
    title: 'Address',
    description: 'Physical location address',
    fields: [
      { key: 'address', label: 'Street Address' },
      { key: 'city', label: 'City', half: true },
      { key: 'state', label: 'State', half: true },
      { key: 'zip', label: 'ZIP Code', half: true },
      { key: 'country', label: 'Country', half: true },
    ],
  },
  {
    title: 'Contact',
    description: 'On-site contact information',
    fields: [
      { key: 'contact_name', label: 'Contact Name', half: true },
      { key: 'contact_phone', label: 'Phone', half: true },
      { key: 'contact_email', label: 'Email', type: 'email' },
    ],
  },
  {
    title: 'Notes',
    fields: [
      { key: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Additional notes about this location…' },
    ],
  },
];

export default function LocationAdd() {
  return (
    <FormPage
      title="New Location"
      subtitle="Add a new site location to the system"
      icon={MapPin}
      sections={SECTIONS}
      emptyForm={EMPTY}
      onSubmit={d => createLocation(d)}
      backPath="/locations"
      redirectOnSave={res => `/locations/${res.data.locations_id}`}
    />
  );
}
