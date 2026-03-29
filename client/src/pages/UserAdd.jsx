/**
 * @file New user creation form.
 * @module UserAdd
 *
 * Uses FormPage with role selection and SSO provider/ID fields.
 */
import React from 'react';
import { Users } from 'lucide-react';
import { createUser, getRoles } from '../api';
import FormPage from '../components/FormPage';

const STATUS_OPTS = ['Active', 'Inactive', 'Suspended'];

const EMPTY = {
  display_name: '', email: '', roles_id: '', status: 'Active',
  avatar_url: '', sso_subject: '', sso_provider: '',
};

const SECTIONS = [
  {
    title: 'User Information',
    description: 'Core identity and access settings for this user',
    fields: (related) => [
      { key: 'display_name', label: 'Display Name *', half: true },
      { key: 'email', label: 'Email Address *', type: 'email', half: true },
      {
        key: 'roles_id', label: 'Role *', type: 'select', half: true,
        options: (related.roles || []).map(r => ({ value: String(r.roles_id), label: r.name })),
      },
      { key: 'status', label: 'Status', type: 'select', options: STATUS_OPTS, half: true },
      { key: 'avatar_url', label: 'Avatar URL', placeholder: 'https://…' },
    ],
  },
  {
    title: 'SSO Configuration',
    description: 'Single Sign-On fields — these are typically auto-populated when SSO is enabled. You may pre-fill them for users who will authenticate via an identity provider.',
    fields: [
      { key: 'sso_subject', label: 'SSO Subject ID', half: true, placeholder: 'e.g. 00u1a2b3c4d5e6f7g8h9' },
      { key: 'sso_provider', label: 'SSO Provider', half: true, placeholder: 'e.g. azure-ad, okta, auth0' },
    ],
  },
];

export default function UserAdd() {
  return (
    <FormPage
      title="New User"
      subtitle="Create a new user account"
      icon={Users}
      sections={SECTIONS}
      emptyForm={EMPTY}
      loadRelated={async () => {
        const r = await getRoles();
        return { roles: r.data };
      }}
      beforeSave={d => ({
        ...d,
        roles_id: Number(d.roles_id),
        sso_subject:  d.sso_subject || null,
        sso_provider: d.sso_provider || null,
        avatar_url:   d.avatar_url || null,
      })}
      onSubmit={d => createUser(d)}
      backPath="/users"
      redirectOnSave={res => `/users/${res.data.users_id}`}
    />
  );
}
