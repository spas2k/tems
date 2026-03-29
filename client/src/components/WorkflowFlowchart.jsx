/**
 * @file SVG-based workflow flowchart renderer.
 * @module WorkflowFlowchart
 *
 * Lays out nodes in a 2D grid from steps/edges, rendering decision diamonds, status-colored nodes, and connecting paths with labels.
 *
 * @param {Array} props.steps - Array of workflow step objects (name, type, status, col, row)
 * @param {Array} props.edges - Array of { from, to, label } edge definitions
 * @param {number|null} props.selectedStep - Currently highlighted step index
 * @param {Function} props.onSelectStep - Callback when a step node is clicked
 */
import React, { useMemo } from 'react';
import {
  CheckCircle2, XCircle, MinusCircle, Play, Flag, Square, Diamond, Circle,
} from 'lucide-react';

/**
 * WorkflowFlowchart — renders a 2-D flowchart with branching support.
 *
 * Decision nodes render as diamonds with Yes/No branches.  Branches can
 * merge back to a shared node (e.g. an "End" node).
 *
 * Props:
 *   steps:        [{ step, type, label, status, instruction }]
 *   edges:        [{ from, to, label? }]     — label = 'Yes …' / 'No …'
 *   selectedStep: number | null
 *   onSelectStep: (stepNum) => void
 */

/* ── colour + icon maps ──────────────────────────────────── */
const STATUS_STYLES = {
  success: { fill: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', text: '#15803d', glow: 'rgba(22,163,74,0.15)' },
  failed:  { fill: '#dc2626', bg: '#fef2f2', border: '#fecaca', text: '#991b1b', glow: 'rgba(220,38,38,0.15)' },
  skipped: { fill: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', glow: 'transparent' },
  pending: { fill: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', glow: 'transparent' },
};

const TYPE_ICONS = { start: Play, end: Flag, process: Square, decision: Diamond };

/* ── layout constants ────────────────────────────────────── */
const NODE_W   = 240;
const NODE_H   = 56;
const COL_GAP  = 60;   // horizontal spacing between columns
const ROW_GAP  = 56;   // vertical spacing between rows
const CELL_W   = NODE_W + COL_GAP;
const CELL_H   = NODE_H + ROW_GAP;
const PAD      = 24;    // canvas padding

/* ══════════════════════════════════════════════════════════ */
/*  LAYOUT ENGINE — assign (col, row) to every step          */
/* ══════════════════════════════════════════════════════════ */
function computeLayout(steps, edges) {
  const stepMap   = new Map(steps.map(s => [s.step, s]));
  const adj       = new Map();          // from → [{ to, label }]
  const inDegree  = new Map();

  for (const e of edges) {
    if (!adj.has(e.from)) adj.set(e.from, []);
    adj.get(e.from).push(e);
    inDegree.set(e.to, (inDegree.get(e.to) || 0) + 1);
  }

  // Find the start node (in-degree 0 or step 1)
  const sorted = [...steps].sort((a, b) => a.step - b.step);
  const startStep = sorted.find(s => !inDegree.get(s.step)) || sorted[0];

  const positions = new Map(); // step → { col, row }
  const visited   = new Set();
  let maxRow = 0;
  let maxCol = 0;

  function layout(stepNum, col, row) {
    if (visited.has(stepNum) || !stepMap.has(stepNum)) return row;
    visited.add(stepNum);
    positions.set(stepNum, { col, row });
    maxRow = Math.max(maxRow, row);
    maxCol = Math.max(maxCol, col);

    const outEdges = adj.get(stepNum) || [];
    const step = stepMap.get(stepNum);

    if (step.type === 'decision' && outEdges.length >= 2) {
      // "Yes" branch stays in the current column, "No" goes right
      const yesEdge = outEdges.find(e => e.label && /yes/i.test(e.label)) || outEdges[0];
      const noEdge  = outEdges.find(e => e.label && /no/i.test(e.label))  || outEdges[1];

      const afterYes = layout(yesEdge.to, col, row + 1);
      layout(noEdge.to, col + 1, row + 1);
      return afterYes;
    }

    if (outEdges.length === 1) {
      return layout(outEdges[0].to, col, row + 1);
    }

    return row;
  }

  layout(startStep.step, 0, 0);

  // Assign any orphan steps (not reachable — shouldn't happen normally)
  for (const s of sorted) {
    if (!visited.has(s.step)) {
      maxRow += 1;
      positions.set(s.step, { col: 0, row: maxRow });
    }
  }

  return { positions, maxRow, maxCol };
}

/* ══════════════════════════════════════════════════════════ */
/*  SVG CONNECTORS                                           */
/* ══════════════════════════════════════════════════════════ */
function ConnectorSVG({ edges, positions, stepMap }) {
  const paths = edges.map((e, i) => {
    const from = positions.get(e.from);
    const to   = positions.get(e.to);
    if (!from || !to) return null;

    // Centre of each node in pixel coordinates
    const fx = PAD + from.col * CELL_W + NODE_W / 2;
    const fy = PAD + from.row * CELL_H + NODE_H / 2;
    const tx = PAD + to.col   * CELL_W + NODE_W / 2;
    const ty = PAD + to.row   * CELL_H + NODE_H / 2;

    // Connection points
    const startY = fy + NODE_H / 2;   // bottom of "from"
    const endY   = ty - NODE_H / 2;   // top of "to"
    const startX = fx;
    const endX   = tx;

    // Is the connector for a taken path? (both nodes are success/failed — not skipped)
    const fromStep = stepMap.get(e.from);
    const toStep   = stepMap.get(e.to);
    const fromOk   = fromStep && (fromStep.status === 'success' || fromStep.status === 'failed');
    const toOk     = toStep   && (toStep.status   === 'success' || toStep.status   === 'failed');
    const active   = fromOk && toOk;
    const colour   = active
      ? (fromStep.status === 'success' ? '#16a34a' : '#dc2626')
      : '#d1d5db';

    // Build the SVG path
    let d;
    if (startX === endX) {
      // Straight vertical line
      d = `M ${startX} ${startY} L ${endX} ${endY}`;
    } else {
      // Curved: go down, curve right/left, then down to target
      const midY = startY + (endY - startY) * 0.35;
      d = `M ${startX} ${startY} L ${startX} ${midY} C ${startX} ${midY + 20}, ${endX} ${midY + 20}, ${endX} ${midY + 40} L ${endX} ${endY}`;
    }

    // Edge label (Yes / No)
    const hasLabel = e.label;
    const labelX = startX === endX ? startX + 14 : (startX + endX) / 2;
    const labelY = startY + 16;

    return (
      <g key={i}>
        <path d={d} fill="none" stroke={colour} strokeWidth={active ? 2.5 : 2}
              strokeDasharray={active ? 'none' : '6 4'} />
        {/* Arrow head */}
        <polygon
          points={`${endX},${endY} ${endX - 5},${endY - 8} ${endX + 5},${endY - 8}`}
          fill={colour}
        />
        {hasLabel && (
          <g>
            <rect
              x={labelX - 2} y={labelY - 10} rx={4} ry={4}
              width={Math.min(e.label.length * 6.5 + 12, 120)} height={18}
              fill="#fff" stroke={colour} strokeWidth={1}
            />
            <text x={labelX + 4} y={labelY + 2}
              fontSize={10} fontWeight="600" fill={colour}
              fontFamily="Inter, sans-serif">
              {e.label}
            </text>
          </g>
        )}
      </g>
    );
  });

  return <>{paths}</>;
}

/* ══════════════════════════════════════════════════════════ */
/*  FLOW NODE                                                */
/* ══════════════════════════════════════════════════════════ */
function FlowNode({ step, isSelected, onClick, x, y }) {
  const sCfg = STATUS_STYLES[step.status] || STATUS_STYLES.pending;
  const TypeIcon = TYPE_ICONS[step.type] || Circle;
  const isTerminal = step.type === 'start' || step.type === 'end';
  const isDiamond  = step.type === 'decision';

  return (
    <div
      className={'wf-flow-node' + (isSelected ? ' selected' : '') + (isDiamond ? ' diamond' : '')}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: NODE_W,
        height: NODE_H,
        '--node-color':  sCfg.fill,
        '--node-bg':     sCfg.bg,
        '--node-border': sCfg.border,
        '--node-glow':   sCfg.glow,
        borderRadius: isDiamond ? 4 : isTerminal ? 40 : 10,
      }}
      onClick={() => onClick(step.step)}
      title={step.instruction}
    >
      {/* Diamond decorative corners */}
      {isDiamond && <div className="wf-diamond-shape" style={{ borderColor: sCfg.border }} />}

      <div className="wf-node-status-dot" style={{ background: sCfg.fill }} />
      <div className="wf-node-icon" style={{ color: sCfg.fill }}>
        {step.status === 'success' ? <CheckCircle2 size={20} /> :
         step.status === 'failed'  ? <XCircle size={20} /> :
         step.status === 'skipped' ? <MinusCircle size={20} /> :
         <TypeIcon size={20} />}
      </div>
      <div className="wf-node-label" style={{ color: sCfg.text }}>
        {step.label}
      </div>
      <div className="wf-node-step-num">{step.step}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                           */
/* ══════════════════════════════════════════════════════════ */
export default function WorkflowFlowchart({ steps, edges, selectedStep, onSelectStep }) {
  const layout = useMemo(() => {
    if (!steps?.length) return null;
    return computeLayout(steps, edges || []);
  }, [steps, edges]);

  if (!layout) {
    return <div style={{ textAlign: 'center', color: '#94a3b8', padding: 24 }}>No steps to display.</div>;
  }

  const { positions, maxRow, maxCol } = layout;
  const canvasW = (maxCol + 1) * CELL_W + PAD * 2;
  const canvasH = (maxRow + 1) * CELL_H + PAD * 2;

  const stepMap = new Map(steps.map(s => [s.step, s]));

  return (
    <div className="wf-flowchart" style={{ position: 'relative', width: canvasW, minHeight: canvasH, margin: '0 auto' }}>
      {/* SVG layer for connectors */}
      <svg width={canvasW} height={canvasH}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', overflow: 'visible' }}>
        <ConnectorSVG edges={edges || []} positions={positions} stepMap={stepMap} />
      </svg>

      {/* Node layer */}
      {steps.map(step => {
        const pos = positions.get(step.step);
        if (!pos) return null;
        const x = PAD + pos.col * CELL_W;
        const y = PAD + pos.row * CELL_H;
        return (
          <FlowNode
            key={step.step}
            step={step}
            isSelected={selectedStep === step.step}
            onClick={onSelectStep}
            x={x}
            y={y}
          />
        );
      })}
    </div>
  );
}
