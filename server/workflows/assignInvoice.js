/**
 * Workflow: Assign Invoice to User
 *
 * Steps:
 *   1. Start – Initiate assignment process
 *   2. Validate target user exists
 *   3. Check target user role (DECISION — diamond)
 *        → Yes (role OK):  step 4 – Assign invoice
 *        → No  (viewer):   step 7 – Log rejection
 *   4. Assign invoice to target user
 *   5. Create notification for target user
 *   6. End – Assignment complete   ←── step 7 also merges here
 *   7. Log rejection notice
 *
 * Expected context:
 *   { invoices_id: number, target_users_id: number }
 */

module.exports = {
  key: 'assign_invoice',
  name: 'Assign Invoice to User',
  description: 'Reassigns an invoice to another user after validating their role, then notifies them. If the user has a Viewer role the request is rejected.',

  steps: [
    {
      step: 1,
      type: 'start',
      label: 'Start',
      instruction: 'Initiate the invoice assignment workflow.',
    },
    {
      step: 2,
      type: 'process',
      label: 'Validate Target User',
      instruction: 'Verify that the target user exists in the system.',
      action: async (ctx, db) => {
        const user = await db('users').where('users_id', ctx.target_users_id).first();
        if (!user) throw new Error(`User ${ctx.target_users_id} not found.`);
        ctx._targetUser = user;
        return `User "${user.display_name || user.email}" found.`;
      },
    },

    // ── DECISION node with branches ────────────────────────
    {
      step: 3,
      type: 'decision',
      label: 'Role Permitted?',
      instruction: 'Check whether the target user\'s role is allowed to receive invoice assignments. Viewers are not permitted.',
      branches: {
        yes: { label: 'Yes – Permitted', targetStep: 4 },
        no:  { label: 'No – Viewer',     targetStep: 7 },
      },
      action: async (ctx, db) => {
        const role = await db('roles').where('roles_id', ctx._targetUser.roles_id).first();
        if (!role) throw new Error('User has no assigned role.');
        ctx._roleName = role.name;
        // Return boolean: true = yes branch, false = no branch
        return role.name.toLowerCase() !== 'viewer';
      },
    },

    // ── YES branch (steps 4 → 5 → 6) ──────────────────────
    {
      step: 4,
      type: 'process',
      label: 'Assign Invoice',
      instruction: 'Update the invoice record to set the new assigned user.',
      action: async (ctx, db) => {
        const invoice = await db('invoices').where('invoices_id', ctx.invoices_id).first();
        if (!invoice) throw new Error(`Invoice ${ctx.invoices_id} not found.`);
        await db('invoices')
          .where('invoices_id', ctx.invoices_id)
          .update({ assigned_to: ctx.target_users_id, updated_at: db.fn.now() });
        return `Invoice #${invoice.invoice_number} assigned to user ${ctx.target_users_id}.`;
      },
    },
    {
      step: 5,
      type: 'process',
      label: 'Create Notification',
      instruction: 'Send a notification to the target user informing them of the new invoice assignment.',
      action: async (ctx, db) => {
        await db('notifications').insert({
          users_id: ctx.target_users_id,
          title: 'Invoice Assigned to You',
          message: `Invoice #${ctx.invoices_id} has been assigned to you for review.`,
          type: 'info',
          is_read: false,
        });
        return 'Notification created for target user.';
      },
    },
    {
      step: 6,
      type: 'end',
      label: 'Complete',
      instruction: 'Invoice assignment workflow finished.',
    },

    // ── NO branch (step 7, then merges into step 6) ────────
    {
      step: 7,
      type: 'process',
      label: 'Log Rejection',
      instruction: 'Record that the assignment was rejected because the target user has a Viewer role.',
      nextStep: 6, // merge back into the "Complete" end node
      action: async (ctx) => {
        ctx._rejected = true;
        return `Assignment rejected — user has "${ctx._roleName}" role.`;
      },
    },
  ],
};
