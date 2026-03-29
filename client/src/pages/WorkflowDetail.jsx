/**
 * @file Workflow run detail page with flowchart visualization.
 * @module WorkflowDetail
 *
 * Shows workflow run info, step-by-step timeline, and SVG flowchart via WorkflowFlowchart component.
 */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, XCircle, Clock, MinusCircle, GitBranch, Info } from 'lucide-react';
import { getWorkflowRun } from '../api';
import WorkflowFlowchart from '../components/WorkflowFlowchart';

const STATUS_CONFIG = {
  success: { label: 'Success', color: '#16a34a', bg: '#f0fdf4', icon: CheckCircle2 },
  failed:  { label: 'Failed',  color: '#dc2626', bg: '#fef2f2', icon: XCircle },
  running: { label: 'Running', color: '#d97706', bg: '#fffbeb', icon: Clock },
  skipped: { label: 'Skipped', color: '#94a3b8', bg: '#f8fafc', icon: MinusCircle },
  pending: { label: 'Pending', color: '#94a3b8', bg: '#f8fafc', icon: Clock },
};

export default function WorkflowDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedStep, setSelectedStep] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await getWorkflowRun(id);
        setData(res.data);
      } catch (err) {
        console.error('Failed to load workflow run:', err);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-faint)' }}>
        Loading workflow…
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ color: 'var(--text-error)', marginBottom: 12 }}>Workflow run not found.</div>
        <button className="btn btn-primary" onClick={() => navigate('/workflows')}>
          <ArrowLeft size={15} /> Back
        </button>
      </div>
    );
  }

  const { run, steps, edges } = data;
  const runCfg = STATUS_CONFIG[run.status] || STATUS_CONFIG.running;
  const RunIcon = runCfg.icon;
  const started = new Date(run.started_at);
  const finished = run.finished_at ? new Date(run.finished_at) : null;
  const activeStep = selectedStep ? steps.find(s => s.step === selectedStep) : null;
  const activeStepCfg = activeStep ? (STATUS_CONFIG[activeStep.status] || STATUS_CONFIG.pending) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="wf-detail-header">
        <button className="btn-back" onClick={() => navigate('/workflows')}>
          <ArrowLeft size={15} /><span className="btn-back-label">Back</span>
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <GitBranch size={20} color="#2563eb" />
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>
              {run.workflow_name}
            </h2>
            <span className="wf-status-badge" style={{ color: runCfg.color, background: runCfg.bg }}>
              <RunIcon size={14} />
              {runCfg.label}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, display: 'flex', gap: 16 }}>
            <span>Run #{run.workflow_runs_id}</span>
            <span>Started: {started.toLocaleString()}</span>
            {finished && <span>Finished: {finished.toLocaleString()}</span>}
            {run.triggered_by_name && <span>By: {run.triggered_by_name}</span>}
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {run.status === 'failed' && run.error_message && (
        <div className="wf-error-banner">
          <XCircle size={16} />
          <span>{run.error_message}</span>
        </div>
      )}

      {/* Main Content: Flowchart + Step Detail */}
      <div className="wf-detail-body">
        {/* Flowchart */}
        <div className="wf-flowchart-container">
          <div className="page-card-header" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <GitBranch size={14} color="#7c3aed" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Process Flow</span>
            </div>
            <div style={{ display: 'flex', gap: 12, fontSize: 12 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="wf-legend-dot" style={{ background: '#16a34a' }} /> Success
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="wf-legend-dot" style={{ background: '#dc2626' }} /> Failed
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span className="wf-legend-dot" style={{ background: '#cbd5e1' }} /> Not Reached
              </span>
            </div>
          </div>
          <div style={{ padding: 24 }}>
            <WorkflowFlowchart
              steps={steps}
              edges={edges}
              selectedStep={selectedStep}
              onSelectStep={setSelectedStep}
            />
          </div>
        </div>

        {/* Step Detail Panel */}
        <div className="wf-step-panel">
          <div className="page-card-header" style={{ padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Info size={14} color="#2563eb" />
              <span style={{ fontWeight: 600, fontSize: 14 }}>Step Details</span>
            </div>
          </div>
          {activeStep ? (
            <div style={{ padding: 16 }}>
              <div className="wf-step-detail-header">
                <div
                  className="wf-step-detail-status"
                  style={{ background: activeStepCfg.bg, color: activeStepCfg.color }}
                >
                  {React.createElement(activeStepCfg.icon, { size: 18 })}
                  <span style={{ fontWeight: 600 }}>{activeStepCfg.label}</span>
                </div>
                <div className="wf-step-detail-number">Step {activeStep.step}</div>
              </div>

              <h3 style={{ margin: '16px 0 4px', fontSize: 16, fontWeight: 600 }}>
                {activeStep.label}
              </h3>
              <div className="wf-step-type-badge">{activeStep.type}</div>

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                  Instruction
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, background: 'var(--bg-subtle)', borderRadius: 8, padding: 12, border: '1px solid var(--border-color)' }}>
                  {activeStep.instruction || 'No instruction provided.'}
                </div>
              </div>

              {activeStep.status_detail && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>
                    Result Detail
                  </div>
                  <div style={{
                    fontSize: 13, lineHeight: 1.5, borderRadius: 8, padding: 12,
                    border: '1px solid',
                    borderColor: activeStep.status === 'failed' ? 'var(--bg-error-border)' : 'var(--border-color)',
                    background: activeStep.status === 'failed' ? 'var(--bg-error)' : 'var(--bg-subtle)',
                    color: activeStep.status === 'failed' ? 'var(--text-error)' : 'var(--text-secondary)',
                  }}>
                    {activeStep.status_detail}
                  </div>
                </div>
              )}

              {activeStep.executed_at && (
                <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-faint)' }}>
                  Executed: {new Date(activeStep.executed_at).toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-faint)' }}>
              <Info size={32} style={{ marginBottom: 8, opacity: 0.4 }} />
              <div style={{ fontSize: 14 }}>Click a step in the flowchart to view its details.</div>
            </div>
          )}

          {/* Steps Summary */}
          <div style={{ borderTop: '1px solid var(--border-color)', padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>
              All Steps
            </div>
            {steps.map(s => {
              const sCfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending;
              const SIcon = sCfg.icon;
              return (
                <div
                  key={s.step}
                  className={'wf-step-list-item' + (selectedStep === s.step ? ' active' : '')}
                  onClick={() => setSelectedStep(s.step)}
                >
                  <SIcon size={14} color={sCfg.color} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{s.label}</span>
                  <span style={{ fontSize: 11, color: sCfg.color, fontWeight: 500 }}>{sCfg.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
