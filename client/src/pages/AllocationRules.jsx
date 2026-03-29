import React, { useEffect, useState, useCallback } from 'react';
import { PieChart, Trash2, Save, Scale } from 'lucide-react';
import { getAccounts, getAllocationRules, saveAccountAllocationRules, getBankCostCenters } from '../api';
import LookupField from '../components/LookupField';

export default function AllocationRules() {
  /* ── data ────────────────────────────────────────────── */
  const [accounts, setAccounts]       = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [rules, setRules]             = useState([]);       // current account's splits
  const [allRules, setAllRules]       = useState([]);       // all rules across accounts
  const [selectedAccount, setSelected] = useState(null);
  const [saving, setSaving]           = useState(false);
  const [dirty, setDirty]             = useState(false);
  const [toast, setToast]             = useState(null);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 2500);
  };

  /* ── load reference data ─────────────────────────────── */
  useEffect(() => {
    Promise.all([getAccounts(), getBankCostCenters(), getAllocationRules()])
      .then(([aRes, ccRes, rRes]) => {
        setAccounts(aRes.data);
        setCostCenters(ccRes.data);
        setAllRules(rRes.data);
      });
  }, []);

  /* ── pick an account ─────────────────────────────────── */
  const selectAccount = useCallback((acct) => {
    setSelected(acct);
    setDirty(false);
    const accountRules = allRules
      .filter(r => r.accounts_id === acct.accounts_id)
      .map(r => ({
        bank_cost_centers_id: r.bank_cost_centers_id,
        percentage: Number(r.percentage),
        cost_center_name: r.cost_center_name,
        cost_center_code: r.cost_center_code,
      }));
    setRules(accountRules.length ? accountRules : []);
  }, [allRules]);

  /* ── add a cost center ───────────────────────────────── */
  const addCostCenter = (ccId) => {
    const cc = costCenters.find(c => c.bank_cost_centers_id === Number(ccId));
    if (!cc) return;
    if (rules.find(r => r.bank_cost_centers_id === cc.bank_cost_centers_id)) return;

    const newRules = [...rules, {
      bank_cost_centers_id: cc.bank_cost_centers_id,
      cost_center_name: cc.name,
      cost_center_code: cc.code,
      percentage: 0,
    }];
    distributeEvenly(newRules);
    setDirty(true);
  };

  /* ── remove a cost center ──────────────────────────── */
  const removeCostCenter = (ccId) => {
    const newRules = rules.filter(r => r.bank_cost_centers_id !== ccId);
    if (newRules.length > 0) distributeEvenly(newRules);
    else setRules([]);
    setDirty(true);
  };

  /* ── evenly distribute percentages ─────────────────── */
  const distributeEvenly = (list) => {
    const n = list.length;
    if (n === 0) { setRules([]); return; }
    const base = Math.floor(100 / n);
    const remainder = 100 - base * n;
    const updated = list.map((r, i) => ({
      ...r,
      percentage: base + (i < remainder ? 1 : 0),
    }));
    setRules(updated);
  };

  /* ── slider change — adjust others proportionally ──── */
  const handleSlider = (idx, newVal) => {
    newVal = Math.round(Math.max(0, Math.min(100, newVal)));
    const updated = [...rules];
    const oldVal = updated[idx].percentage;
    const diff = newVal - oldVal;
    if (diff === 0) return;

    updated[idx] = { ...updated[idx], percentage: newVal };

    const otherIdxs = updated.map((_, i) => i).filter(i => i !== idx);
    const otherSum = otherIdxs.reduce((s, i) => s + updated[i].percentage, 0);

    if (otherSum === 0) {
      const each = Math.floor(-diff / otherIdxs.length);
      otherIdxs.forEach((i, j) => {
        updated[i] = { ...updated[i], percentage: -each + (j < (-diff % otherIdxs.length) ? 1 : 0) };
      });
    } else {
      let remaining = -diff;
      otherIdxs.forEach((i, j) => {
        if (j === otherIdxs.length - 1) {
          updated[i] = { ...updated[i], percentage: updated[i].percentage + remaining };
        } else {
          const share = Math.round((updated[i].percentage / otherSum) * -diff);
          updated[i] = { ...updated[i], percentage: updated[i].percentage + share };
          remaining -= share;
        }
      });
    }

    updated.forEach((r, i) => { updated[i] = { ...updated[i], percentage: Math.max(0, r.percentage) }; });
    const total = updated.reduce((s, r) => s + r.percentage, 0);
    if (total !== 100 && updated.length > 0) {
      const fixIdx = idx === 0 ? 1 : 0;
      if (fixIdx < updated.length) {
        updated[fixIdx] = { ...updated[fixIdx], percentage: updated[fixIdx].percentage + (100 - total) };
      }
    }

    setRules(updated);
    setDirty(true);
  };

  /* ── save ──────────────────────────────────────────── */
  const handleSave = async () => {
    if (!selectedAccount) return;
    setSaving(true);
    try {
      const payload = rules.map(r => ({
        bank_cost_centers_id: r.bank_cost_centers_id,
        percentage: r.percentage,
      }));
      const res = await saveAccountAllocationRules(selectedAccount.accounts_id, { rules: payload });
      setAllRules(prev => [
        ...prev.filter(r => r.accounts_id !== selectedAccount.accounts_id),
        ...res.data,
      ]);
      setDirty(false);
      showToast('Allocation rules saved.');
    } catch {
      showToast('Save failed.', false);
    } finally {
      setSaving(false);
    }
  };

  /* ── derived ───────────────────────────────────────── */
  const total = rules.reduce((s, r) => s + r.percentage, 0);
  const availableCCs = costCenters.filter(cc =>
    cc.status === 'Active' && !rules.find(r => r.bank_cost_centers_id === cc.bank_cost_centers_id)
  );

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316'];

  /* ── Lookup configurations ─────────────────────────── */
  const accountLookupColumns = [
    { key: 'account_number', label: 'Account #' },
    { key: 'name', label: 'Account Name' },
    { key: 'status', label: 'Status' },
  ];

  const ccLookupColumns = [
    { key: 'code', label: 'Code' },
    { key: 'name', label: 'Name' },
    { key: 'department', label: 'Department' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999,
          background: toast.ok ? 'var(--bg-success)' : 'var(--bg-error)',
          color: toast.ok ? 'var(--text-success)' : 'var(--text-error)',
          padding: '12px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13,
          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
        }}>{toast.msg}</div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Accounts</div>
          <div className="kpi-value">{accounts.length}</div>
          <div className="kpi-icon"><PieChart size={40} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Accounts w/ Rules</div>
          <div className="kpi-value">{new Set(allRules.map(r => r.accounts_id)).size}</div>
        </div>
        <div className="kpi-card slate">
          <div className="kpi-label">Cost Centers</div>
          <div className="kpi-value">{costCenters.filter(c => c.status === 'Active').length}</div>
        </div>
      </div>

      {/* Account Selection */}
      <div className="page-card">
        <div className="page-card-header">
          <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>Select Account</span>
        </div>
        <div style={{ padding: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label className="form-label">Account</label>
            <LookupField
              label="Account"
              value={selectedAccount?.accounts_id || null}
              displayValue={selectedAccount ? `${selectedAccount.account_number} — ${selectedAccount.name || ''}` : ''}
              placeholder="Search accounts…"
              modalTitle="Select Account"
              data={accounts}
              columns={accountLookupColumns}
              searchableKeys={['account_number', 'name', 'status']}
              onChange={row => selectAccount(row)}
              onClear={() => { setSelected(null); setRules([]); setDirty(false); }}
            />
          </div>
          {selectedAccount && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {allRules.some(r => r.accounts_id === selectedAccount.accounts_id) && (
                <span className="badge badge-green">Has Rules</span>
              )}
              <span style={{ fontSize: 13, color: '#64748b' }}>
                {rules.length} cost center{rules.length !== 1 ? 's' : ''} assigned
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Allocation Split */}
      {selectedAccount && (
        <div className="page-card">
          <div className="page-card-header">
            <span className="rc-results-count" style={{ fontWeight: 700, fontSize: 15 }}>
              Allocation Split — {selectedAccount.account_number}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {dirty && <span className="unsaved-indicator"><Save size={13} strokeWidth={2.5} />Unsaved</span>}
              <button className="btn btn-primary" onClick={handleSave}
                disabled={!dirty || saving || (rules.length > 0 && total !== 100)}
                style={{ fontSize: 13, opacity: (!dirty || saving) ? 0.5 : 1 }}>
                <Save size={14} /> {saving ? 'Saving…' : 'Save Rules'}
              </button>
            </div>
          </div>
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Add cost center + Split Evenly */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'end' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label className="form-label">Add Cost Center</label>
                <LookupField
                  label="Cost Center"
                  value={null}
                  displayValue=""
                  placeholder="Search cost centers to add…"
                  modalTitle="Add Cost Center"
                  data={availableCCs}
                  columns={ccLookupColumns}
                  searchableKeys={['code', 'name', 'department']}
                  onChange={row => addCostCenter(row.bank_cost_centers_id)}
                  onClear={() => {}}
                />
              </div>
              {rules.length > 1 && (
                <button className="btn btn-ghost" style={{ fontSize: 12, whiteSpace: 'nowrap', marginBottom: 1 }}
                  onClick={() => { distributeEvenly(rules); setDirty(true); }}>
                  <Scale size={14} /> Split Evenly
                </button>
              )}
            </div>

            {/* Total bar */}
            {rules.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, fontWeight: 600 }}>
                  <span style={{ color: '#64748b' }}>Total Allocation</span>
                  <span style={{ color: total === 100 ? '#10b981' : '#ef4444', fontWeight: 700 }}>{total}%</span>
                </div>
                <div style={{ height: 10, borderRadius: 6, background: '#e2e8f0', overflow: 'hidden', display: 'flex' }}>
                  {rules.map((r, i) => (
                    <div key={r.bank_cost_centers_id}
                      style={{
                        width: `${r.percentage}%`,
                        background: COLORS[i % COLORS.length],
                        transition: 'width 0.2s',
                        minWidth: r.percentage > 0 ? 2 : 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Sliders */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rules.map((r, i) => (
                <div key={r.bank_cost_centers_id} style={{
                  padding: 16, borderRadius: 10,
                  border: '1px solid #e2e8f0',
                  background: '#f8fafc',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 12, height: 12, borderRadius: 3, background: COLORS[i % COLORS.length] }} />
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{r.cost_center_code}</span>
                      <span style={{ color: '#64748b', fontSize: 12 }}>{r.cost_center_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="number"
                        min={0} max={100}
                        value={r.percentage}
                        onChange={e => handleSlider(i, Number(e.target.value))}
                        className="form-input"
                        style={{ width: 60, textAlign: 'center', fontWeight: 700, fontSize: 14, padding: '4px 6px' }}
                      />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>%</span>
                      <button
                        onClick={() => removeCostCenter(r.bank_cost_centers_id)}
                        style={{
                          background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer',
                          padding: 4, borderRadius: 4, display: 'flex',
                        }}
                        title="Remove"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0} max={100}
                    value={r.percentage}
                    onChange={e => handleSlider(i, Number(e.target.value))}
                    style={{ width: '100%', accentColor: COLORS[i % COLORS.length], cursor: 'pointer' }}
                  />
                </div>
              ))}

              {rules.length === 0 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  color: '#94a3b8', gap: 8, padding: 40,
                }}>
                  <PieChart size={32} strokeWidth={1.5} />
                  <div style={{ fontSize: 14, fontWeight: 600 }}>No cost centers assigned</div>
                  <div style={{ fontSize: 12 }}>Use the lookup above to add cost centers.</div>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
