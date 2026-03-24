import React, { useMemo } from 'react';
import { LifeBuoy, Terminal } from 'lucide-react';
import { createTicket, getUsers } from '../api';
import { useConsoleErrors } from '../context/ConsoleErrorContext';
import FormPage from '../components/FormPage';

const CATEGORIES = [
  'Enhancement', 'System Issue',
  'Billing Error', 'Rate Dispute', 'Service Issue', 'Contract Problem',
  'Data Quality', 'Invoice Discrepancy', 'Provisioning', 'Access & Permissions',
  'Bug Report', 'Feature Request', 'Documentation', 'Other',
];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const EMPTY = {
  title: '', description: '', category: 'Other', priority: 'Medium',
  assigned_users_id: '', due_date: '', tags: '',
  steps_to_reproduce: '', expected_behavior: '',
  actual_behavior: '', console_errors: '', environment: '', browser_info: '',
};

export default function TicketAdd() {
  const { errors: consoleErrors, formatted, clearErrors } = useConsoleErrors();

  const SECTIONS = useMemo(() => [
    {
      title: 'Ticket Information',
      description: 'Describe the issue clearly and concisely',
      fields: (related) => [
        { key: 'title', label: 'Title *', placeholder: 'Brief summary of the issue' },
        { key: 'description', label: 'Description', type: 'textarea', rows: 5,
          placeholder: 'Describe the issue in detail — what\'s wrong, what you expected, any relevant context…' },
        { key: 'category', label: 'Category', type: 'select', options: CATEGORIES, half: true },
        { key: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, half: true },
      ],
    },
    {
      title: 'Assignment & Scheduling',
      description: 'Assign the ticket and set a due date',
      fields: (related) => [
        {
          key: 'assigned_users_id', label: 'Assigned To', type: 'select', half: true,
          options: (related.users || []).map(u => ({ value: String(u.users_id), label: u.display_name || u.email })),
          placeholder: 'Unassigned',
        },
        { key: 'due_date', label: 'Due Date', type: 'date', half: true },
        { key: 'tags', label: 'Tags', placeholder: 'bug, frontend, urgent  (comma-separated)' },
      ],
    },
    {
      title: 'Development Details',
      description: 'Optional — helpful for bug reports and development tracking',
      fields: [
        { key: 'steps_to_reproduce', label: 'Steps to Reproduce', type: 'textarea', rows: 3,
          placeholder: '1. Go to…\n2. Click on…\n3. See error' },
        { key: 'expected_behavior', label: 'Expected Behavior', type: 'textarea', rows: 2,
          placeholder: 'What should have happened?' },
        { key: 'actual_behavior', label: 'Actual Behavior', type: 'textarea', rows: 2,
          placeholder: 'What actually happened?' },
        { key: 'environment', label: 'Environment', type: 'text', placeholder: 'Production, Staging, Local...' },
        { key: 'browser_info', label: 'Browser Info', type: 'text', placeholder: 'Chrome 120 on Windows...' },
      ],
    },
    {
      title: 'Console Errors',
      description: consoleErrors.length > 0
        ? `${consoleErrors.length} console error(s) captured this session — click "Attach" to include them`
        : 'No console errors captured. Errors will be caught automatically when they occur.',
      fields: [
        {
          key: 'console_errors',
          render: (form, setField) => (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <label className="form-label" style={{ margin: 0 }}>Console Errors</label>
                {consoleErrors.length > 0 && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => {
                      setField('console_errors', formatted());
                    }}
                    style={{ fontSize: 12, display: 'flex', alignItems: 'center', gap: 4, color: '#ea580c' }}
                  >
                    <Terminal size={13} /> Attach {consoleErrors.length} captured error{consoleErrors.length !== 1 ? 's' : ''}
                  </button>
                )}
              </div>
              <textarea
                className="form-input"
                value={form.console_errors || ''}
                onChange={e => setField('console_errors', e.target.value)}
                rows={4}
                placeholder="Paste console errors here or click Attach to include captured errors…"
                style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
              />
            </div>
          ),
        },
      ],
    },
  ], [consoleErrors, formatted]);

  return (
    <FormPage
      title="New Ticket"
      subtitle="Create a new ticket for tracking"
      icon={LifeBuoy}
      sections={SECTIONS}
      emptyForm={EMPTY}
      loadRelated={async () => {
        const res = await getUsers();
        return { users: res.data };
      }}
      beforeSave={d => ({
        ...d,
        assigned_users_id: d.assigned_users_id ? Number(d.assigned_users_id) : null,
      })}
      onSubmit={d => createTicket(d)}
      backPath="/tickets"
      redirectOnSave={res => `/tickets/${res.data.tickets_id}`}
    />
  );
}
