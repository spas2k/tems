import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitBranch, Play, CheckCircle2, XCircle, Clock, AlertTriangle, Zap, Split,
} from 'lucide-react';
import { getWorkflowRuns, getWorkflowDefinitions, runWorkflowDemo } from '../api';

const STATUS_CONFIG = {
  success: { label: 'Success', color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle2 },
  failed:  { label: 'Failed',  color: '#dc2626', bg: '#fef2f2', icon: XCircle },
  running: { label: 'Running', color: '#d97706', bg: '#fffbeb', icon: Clock },
};

export default function Workflows() {
  const navigate = useNavigate();
  const [runs, setRuns] = useState([]);
  const [definitions, setDefinitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [demoLoading, setDemoLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [runsRes, defsRes] = await Promise.all([
        getWorkflowRuns(),
        getWorkflowDefinitions(),
      ]);
      setRuns(runsRes.data);
      setDefinitions(defsRes.data);
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDemo = async (key, opts = {}) => {
    setDemoLoading(true);
    try {
      await runWorkflowDemo(key, opts);
      await load();
    } catch (err) {
      console.error('Demo run failed:', err);
    } finally {
      setDemoLoading(false);
    }
  };

  const successCount = runs.filter(r => r.status === 'success').length;
  const failedCount  = runs.filter(r => r.status === 'failed').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <div className="kpi-card blue">
          <div className="kpi-label">Total Runs</div>
          <div className="kpi-value">{runs.length}</div>
          <div className="kpi-icon"><GitBranch size={40} /></div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-label">Successful</div>
          <div className="kpi-value">{successCount}</div>
          <div className="kpi-icon"><CheckCircle2 size={40} /></div>
        </div>
        <div className="kpi-card red">
          <div className="kpi-label">Failed</div>
          <div className="kpi-value">{failedCount}</div>
          <div className="kpi-icon"><XCircle size={40} /></div>
        </div>
        <div className="kpi-card purple">
          <div className="kpi-label">Definitions</div>
          <div className="kpi-value">{definitions.length}</div>
          <div className="kpi-icon"><Zap size={40} /></div>
        </div>
      </div>

      {/* Available Workflow Definitions */}
      <div className="page-card">
        <div className="page-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={15} color="#7c3aed" />
            <span style={{ fontWeight: 600 }}>Available Workflows</span>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
            {definitions.map(def => (
              <div key={def.key} className="wf-def-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div className="wf-def-icon">
                    <GitBranch size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{def.name}</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>{def.stepCount} steps</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#475569', marginBottom: 12, lineHeight: 1.5 }}>
                  {def.description}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={demoLoading}
                    onClick={() => handleDemo(def.key)}
                    title="Run a simulated successful workflow (Yes branch)"
                  >
                    <Play size={13} /> Demo (Pass)
                  </button>
                  {def.hasBranches && (
                    <button
                      className="btn btn-sm btn-outline-amber"
                      disabled={demoLoading}
                      onClick={() => handleDemo(def.key, { branchChoices: { 3: 'no' } })}
                      title="Run the No/Reject branch path"
                    >
                      <Split size={13} /> Demo (Reject)
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-outline-danger"
                    disabled={demoLoading}
                    onClick={() => handleDemo(def.key, { failAtStep: 2 })}
                    title="Run a simulated workflow that fails at step 2"
                  >
                    <AlertTriangle size={13} /> Demo (Fail)
                  </button>
                </div>
              </div>
            ))}
            {definitions.length === 0 && !loading && (
              <div style={{ color: '#94a3b8', fontStyle: 'italic', padding: 20 }}>
                No workflow definitions found.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Workflow Runs Table */}
      <div className="page-card">
        <div className="page-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <GitBranch size={15} color="#2563eb" />
            <span style={{ fontWeight: 600 }}>Workflow Runs</span>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Loading…</div>
        ) : runs.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
            No workflow runs yet. Use the demo buttons above to generate sample runs.
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Run ID</th>
                <th>Workflow</th>
                <th>Status</th>
                <th>Triggered By</th>
                <th>Started</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {runs.map(run => {
                const cfg = STATUS_CONFIG[run.status] || STATUS_CONFIG.running;
                const StatusIcon = cfg.icon;
                const started = new Date(run.started_at);
                const finished = run.finished_at ? new Date(run.finished_at) : null;
                const durationMs = finished ? finished - started : null;
                const durationStr = durationMs !== null
                  ? durationMs < 1000 ? `${durationMs}ms` : `${(durationMs / 1000).toFixed(1)}s`
                  : '—';

                return (
                  <tr
                    key={run.workflow_runs_id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/workflows/${run.workflow_runs_id}`)}
                  >
                    <td>
                      <span className="wf-run-id">#{run.workflow_runs_id}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{run.workflow_name}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{run.workflow_key}</div>
                    </td>
                    <td>
                      <span className="wf-status-badge" style={{ color: cfg.color, background: cfg.bg }}>
                        <StatusIcon size={14} />
                        {cfg.label}
                      </span>
                    </td>
                    <td style={{ color: '#64748b' }}>{run.triggered_by_name || '—'}</td>
                    <td style={{ color: '#64748b', fontSize: 13 }}>
                      {started.toLocaleDateString()} {started.toLocaleTimeString()}
                    </td>
                    <td style={{ color: '#64748b', fontSize: 13 }}>{durationStr}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
