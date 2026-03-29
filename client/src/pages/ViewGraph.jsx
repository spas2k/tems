/**
 * @file Read-only saved graph viewer — displays chart without config options.
 * @module ViewGraph
 */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, RefreshCw, AlertCircle,
  Database, Filter, Clock, User,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Treemap,
} from 'recharts';
import { getSavedGraph, runReport, getReportCatalog } from '../api';
import { useAuth } from '../context/AuthContext';

const COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#6366f1',
  '#14b8a6', '#e11d48', '#0ea5e9', '#a855f7', '#22c55e',
  '#eab308', '#dc2626', '#7c3aed', '#db2777', '#0891b2',
];

const CHART_LABELS = {
  bar: 'Bar', line: 'Line', area: 'Area', pie: 'Pie', donut: 'Donut',
  scatter: 'Scatter', radar: 'Radar', composed: 'Composed',
  stackedBar: 'Stacked Bar', horizontalBar: 'Horizontal Bar', treemap: 'Treemap',
};

export default function ViewGraph() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canEdit = hasPermission('reports', 'update');

  const [graph, setGraph]       = useState(null);
  const [config, setConfig]     = useState(null);
  const [catalog, setCatalog]   = useState(null);
  const [results, setResults]   = useState(null);
  const [running, setRunning]   = useState(true);
  const [error, setError]       = useState(null);

  // Load catalog for field labels
  useEffect(() => {
    getReportCatalog().then(r => setCatalog(r.data)).catch(() => {});
  }, []);

  // Load saved graph and auto-run
  useEffect(() => {
    if (!id) return;
    setRunning(true); setError(null);
    getSavedGraph(id)
      .then(r => {
        const row = r.data;
        const cfg = typeof row.config === 'string' ? JSON.parse(row.config) : row.config;
        setGraph(row);
        setConfig(cfg);

        const groupBy = [{ table: cfg.xAxis?.table, field: cfg.xAxis?.field }];
        if (cfg.groupByField) groupBy.push({ table: cfg.groupByField.table, field: cfg.groupByField.field });
        const aggregations = (cfg.yAxes || []).map(y => ({ table: y.table, field: y.field, func: y.agg || 'sum' }));

        return runReport({
          tableKey: cfg.tableKey,
          linkedTables: (cfg.linkedTables || []).map(lt => ({ tableKey: lt.tableKey, joinFrom: lt.joinFrom })),
          fields: [],
          filters: (cfg.filters || []).map(f => ({ table: f.table, field: f.field, op: f.op, value: f.value })),
          filterLogic: cfg.filterLogic || 'AND',
          sorts: [],
          groupBy,
          aggregations,
          limit: Math.min(cfg.limit || 1000, 10000),
          offset: 0,
          distinct: false,
        });
      })
      .then(r => setResults(r.data))
      .catch(e => setError(e.response?.data?.error || e.message || 'Failed to load graph'))
      .finally(() => setRunning(false));
  }, [id]);

  const handleRefresh = useCallback(() => {
    if (!config) return;
    setRunning(true); setError(null); setResults(null);

    const groupBy = [{ table: config.xAxis?.table, field: config.xAxis?.field }];
    if (config.groupByField) groupBy.push({ table: config.groupByField.table, field: config.groupByField.field });
    const aggregations = (config.yAxes || []).map(y => ({ table: y.table, field: y.field, func: y.agg || 'sum' }));

    runReport({
      tableKey: config.tableKey,
      linkedTables: (config.linkedTables || []).map(lt => ({ tableKey: lt.tableKey, joinFrom: lt.joinFrom })),
      fields: [],
      filters: (config.filters || []).map(f => ({ table: f.table, field: f.field, op: f.op, value: f.value })),
      filterLogic: config.filterLogic || 'AND',
      sorts: [],
      groupBy,
      aggregations,
      limit: Math.min(config.limit || 1000, 10000),
      offset: 0,
      distinct: false,
    })
      .then(r => setResults(r.data))
      .catch(e => setError(e.response?.data?.error || e.message || 'Query failed'))
      .finally(() => setRunning(false));
  }, [config]);

  // Resolve field label from catalog
  const resolveFieldLabel = useCallback((table, field) => {
    if (!catalog?.tables) return field;
    const td = catalog.tables[table];
    return td?.fields?.find(f => f.key === field)?.label || field;
  }, [catalog]);

  // Config shorthand
  const chartType = config?.chartType || 'bar';
  const xAxis = config?.xAxis;
  const yAxes = config?.yAxes || [];
  const showLegend = config?.showLegend !== false;
  const showGrid = config?.showGrid !== false;
  const stacked = config?.stacked || false;
  const smooth = config?.smooth || false;
  const innerRadius = config?.innerRadius || 0;
  const colorPalette = config?.colorPalette || COLORS;

  // Chart data transformation
  const chartData = useMemo(() => {
    if (!results?.data?.length || !xAxis) return [];
    const xResultKey = results.fields?.find(f => f.key.includes(xAxis.field))?.key || xAxis.field;
    return results.data.map(row => {
      const entry = { _x: row[xResultKey] ?? row[xAxis.field] ?? '' };
      yAxes.forEach((y, i) => {
        const yResultKey = results.fields?.find(f =>
          f.key.includes(y.field) && f.key.includes(y.agg)
        )?.key || `${y.agg}_${y.table}__${y.field}`;
        entry[`y${i}`] = Number(row[yResultKey] ?? row[`${y.agg}_${y.field}`] ?? 0);
      });
      return entry;
    }).sort((a, b) => {
      if (typeof a._x === 'string') return a._x.localeCompare(b._x);
      return (a._x || 0) - (b._x || 0);
    });
  }, [results, xAxis, yAxes]);

  // Pie data
  const pieData = useMemo(() => {
    if (chartType !== 'pie' || !chartData.length) return [];
    return chartData.map((d, i) => ({
      name: String(d._x || `Item ${i + 1}`),
      value: d.y0 || 0,
      color: colorPalette[i % colorPalette.length],
    }));
  }, [chartType, chartData, colorPalette]);

  // Render chart
  const renderChart = () => {
    if (!chartData.length) return null;
    const h = 500;
    const axisStyle = { fontSize: 11, fill: '#64748b' };
    const tooltipStyle = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' };
    const gridProps = showGrid ? { stroke: '#e2e8f0', strokeDasharray: '3 3' } : { stroke: 'transparent' };

    const xLabel = xAxis ? resolveFieldLabel(xAxis.table, xAxis.field) : '';
    const seriesLabels = yAxes.map(y => y.label || resolveFieldLabel(y.table, y.field));

    if (chartType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={h}>
          <PieChart>
            <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
              innerRadius={innerRadius} outerRadius="80%"
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
              labelLine={{ stroke: '#94a3b8' }}>
              {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'treemap') {
      const tmData = chartData.map((d, i) => ({
        name: String(d._x || `Item ${i + 1}`),
        size: d.y0 || 0,
        fill: colorPalette[i % colorPalette.length],
      }));
      return (
        <ResponsiveContainer width="100%" height={h}>
          <Treemap data={tmData} dataKey="size" nameKey="name"
            stroke="#f8fafc" fill="#3b82f6">
            <Tooltip contentStyle={tooltipStyle} />
          </Treemap>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'radar') {
      return (
        <ResponsiveContainer width="100%" height={h}>
          <RadarChart data={chartData}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="_x" tick={axisStyle} />
            <PolarRadiusAxis tick={axisStyle} />
            {yAxes.map((y, i) => (
              <Radar key={i} name={seriesLabels[i]} dataKey={`y${i}`}
                stroke={y.color} fill={y.color} fillOpacity={0.25} />
            ))}
            <Tooltip contentStyle={tooltipStyle} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          </RadarChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'scatter') {
      return (
        <ResponsiveContainer width="100%" height={h}>
          <ScatterChart>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="_x" name={xLabel} tick={axisStyle} />
            <YAxis tick={axisStyle} />
            {yAxes.map((y, i) => (
              <Scatter key={i} name={seriesLabels[i]} data={chartData} dataKey={`y${i}`}
                fill={y.color} />
            ))}
            <Tooltip contentStyle={tooltipStyle} cursor={{ strokeDasharray: '3 3' }} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    if (chartType === 'composed') {
      return (
        <ResponsiveContainer width="100%" height={h}>
          <ComposedChart data={chartData}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="_x" tick={axisStyle} />
            <YAxis tick={axisStyle} />
            {yAxes.map((y, i) => {
              const ct = y.chartType || 'bar';
              if (ct === 'line') return <Line key={i} name={seriesLabels[i]} dataKey={`y${i}`} stroke={y.color} strokeWidth={2} dot={false} type={smooth ? 'monotone' : 'linear'} />;
              if (ct === 'area') return <Area key={i} name={seriesLabels[i]} dataKey={`y${i}`} fill={y.color} stroke={y.color} fillOpacity={0.2} type={smooth ? 'monotone' : 'linear'} />;
              return <Bar key={i} name={seriesLabels[i]} dataKey={`y${i}`} fill={y.color} stackId={stacked ? 'stack' : undefined} radius={[3, 3, 0, 0]} />;
            })}
            <Tooltip contentStyle={tooltipStyle} />
            {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
          </ComposedChart>
        </ResponsiveContainer>
      );
    }

    const isHorizontal = chartType === 'horizontal';
    const ChartWrapper = (chartType === 'line') ? LineChart
      : (chartType === 'area') ? AreaChart
      : BarChart;

    return (
      <ResponsiveContainer width="100%" height={h}>
        <ChartWrapper data={chartData} layout={isHorizontal ? 'vertical' : 'horizontal'}>
          <CartesianGrid {...gridProps} />
          {isHorizontal ? (
            <>
              <YAxis dataKey="_x" type="category" tick={axisStyle} width={120} />
              <XAxis type="number" tick={axisStyle} />
            </>
          ) : (
            <>
              <XAxis dataKey="_x" tick={axisStyle} />
              <YAxis tick={axisStyle} />
            </>
          )}
          {yAxes.map((y, i) => {
            if (chartType === 'line') return <Line key={i} name={seriesLabels[i]} dataKey={`y${i}`} stroke={y.color} strokeWidth={2} dot={{ r: 3 }} type={smooth ? 'monotone' : 'linear'} />;
            if (chartType === 'area') return <Area key={i} name={seriesLabels[i]} dataKey={`y${i}`} fill={y.color} stroke={y.color} fillOpacity={0.2} stackId={stacked ? 'stack' : undefined} type={smooth ? 'monotone' : 'linear'} />;
            return <Bar key={i} name={seriesLabels[i]} dataKey={`y${i}`} fill={y.color} stackId={(stacked || chartType === 'stacked') ? 'stack' : undefined} radius={isHorizontal ? [0, 3, 3, 0] : [3, 3, 0, 0]} />;
          })}
          <Tooltip contentStyle={tooltipStyle} />
          {showLegend && <Legend wrapperStyle={{ fontSize: 11 }} />}
        </ChartWrapper>
      </ResponsiveContainer>
    );
  };

  // Data table below chart
  const renderDataTable = () => {
    if (!results?.data?.length) return null;
    const fields = results.fields || [];
    return (
      <div style={{ marginTop: 20, borderRadius: 12, border: '1px solid var(--border-color)', overflow: 'hidden' }}>
        <div style={{ padding: '8px 14px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
          Data ({results.data.length} rows)
        </div>
        <div style={{ maxHeight: 320, overflow: 'auto' }}>
          <table className="data-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                {fields.map(col => <th key={col.key}>{col.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {results.data.map((row, ri) => (
                <tr key={ri}>
                  {fields.map(col => {
                    const v = row[col.key];
                    const isNum = col.type === 'number' || col.format === 'currency';
                    const display = v === null || v === undefined ? '—'
                      : col.format === 'currency' ? `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : col.format === 'date' ? String(v).split('T')[0]
                      : String(v);
                    return <td key={col.key} style={{ textAlign: isNum ? 'right' : 'left', whiteSpace: 'nowrap' }}>{display}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="page-card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Header */}
      <div className="page-card-header" style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button className="btn-back" onClick={() => navigate('/graphs')} title="Back to Graphs">
            <ArrowLeft size={15} /><span className="btn-back-label">Back</span>
          </button>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{graph?.name || 'Loading…'}</div>
            {graph?.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 1 }}>{graph.description}</div>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {!running && results && (
            <button className="btn btn-ghost btn-sm" onClick={handleRefresh}>
              <RefreshCw size={13} /> Refresh
            </button>
          )}
          {canEdit && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate(`/create-graph?id=${id}`)}>
              <Pencil size={13} /> Edit Graph
            </button>
          )}
        </div>
      </div>

      {/* Info bar */}
      {config && !running && (
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-muted)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Database size={12} /> {config.tableKey}
          </span>
          <span style={{ background: 'rgba(59,130,246,0.12)', color: '#3b82f6', borderRadius: 10, padding: '2px 8px', fontWeight: 600, fontSize: 11 }}>
            {CHART_LABELS[chartType] || chartType}
          </span>
          {(config.linkedTables || []).length > 0 && (
            <span style={{ color: '#0ea5e9', background: '#e0f2fe', borderRadius: 10, padding: '2px 8px', fontWeight: 600, fontSize: 11 }}>
              +{config.linkedTables.length} linked
            </span>
          )}
          {(config.filters || []).length > 0 && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Filter size={12} /> {config.filters.length} filter{config.filters.length !== 1 ? 's' : ''}
            </span>
          )}
          {graph?.updated_at && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} /> {new Date(graph.updated_at).toLocaleDateString()}
            </span>
          )}
          {graph?.created_by_name && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <User size={12} /> {graph.created_by_name}
            </span>
          )}
        </div>
      )}

      {/* Loading */}
      {running && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--text-muted)' }}>
          <RefreshCw size={26} style={{ animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 15, fontWeight: 600 }}>Loading graph…</span>
        </div>
      )}

      {/* Error */}
      {error && !running && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <div style={{ borderRadius: 14, padding: 28, maxWidth: 500, textAlign: 'center' }}>
            <AlertCircle size={36} color="var(--text-error)" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 700, color: 'var(--text-error)', marginBottom: 8, fontSize: 16 }}>Error</div>
            <div style={{ fontSize: 13, fontFamily: 'monospace', background: 'var(--bg-error)', borderRadius: 8, padding: '8px 12px', marginBottom: 16, color: 'var(--text-error)' }}>{error}</div>
            <button className="btn btn-ghost" onClick={() => navigate('/graphs')}>Back to Graphs</button>
          </div>
        </div>
      )}

      {/* Chart + Data */}
      {results && !running && (
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <div className="page-card" style={{ padding: 20, marginBottom: 0 }}>
            {renderChart()}
          </div>
          {renderDataTable()}
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
