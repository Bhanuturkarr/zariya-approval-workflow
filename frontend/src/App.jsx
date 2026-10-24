import { useCallback, useEffect, useMemo, useState } from 'react';
import { isRemoteAvailable, loadWorkspace, mutate, readLocal } from './data.js';

const navItems = [
  ['Overview', '▦'], ['Applications', '▤'], ['Scrutiny & EVC', '⌕'], ['Documents', '▧'],
  ['Compliance', '◷'], ['Alerts', '♧'], ['Audit trail', '≋'], ['Institutions', '⌂']
];
const stages = ['Intake', 'Review', 'Documents', 'EVC', 'Decision', 'Compliance', 'Approved'];
const todayLabel = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
const shortDate = (s) => {
  if (!s) return 'Not set';
  const d = new Date(`${s}T00:00:00`);
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
};
const dueLabel = (s) => {
  if (!s) return 'Not set';
  const d = new Date(`${s}T00:00:00`);
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const day = new Date(d); day.setHours(0, 0, 0, 0);
  const diff = Math.round((day - now) / 86400000);
  return diff < 0 ? `Overdue · ${Math.abs(diff)} day${diff === -1 ? '' : 's'}` : diff === 0 ? 'Today' : shortDate(s);
};
const initials = (name = '') => name.split(/\s+/).map(s => s.replace(/\W/g, '')[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || 'Z';
const stageClass = stage => ({ Review: 'review', Documents: 'documents', EVC: 'evc', Overdue: 'overdue', Approved: 'ready', Compliance: 'ready', Decision: 'ready', Intake: 'intake' }[stage] || 'review');
const emptyForm = { institution: '', applicationType: 'Extension of approval', region: 'West', owner: 'Zariya', dueDate: '', priority: 'Normal' };

function IconButton({ children, label, onClick }) { return <button type="button" className="icon-btn" aria-label={label} title={label} onClick={onClick}>{children}</button>; }
function Status({ children }) { return <span className={`status ${stageClass(children)}`}>{children === 'EVC' ? 'EVC visit' : children}</span>; }

export default function App() {
  const [workspace, setWorkspace] = useState(() => readLocal());
  const [remote, setRemote] = useState(false);
  const [view, setView] = useState('Overview');
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [toastText, setToastText] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const data = await loadWorkspace();
    setWorkspace(data);
    setRemote(isRemoteAvailable());
    setLoading(false);
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const id = setInterval(() => { if (isRemoteAvailable()) refresh(); }, 20000);
    return () => clearInterval(id);
  }, [refresh]);
  useEffect(() => {
    if (!toastText) return undefined;
    const id = setTimeout(() => setToastText(''), 2800);
    return () => clearTimeout(id);
  }, [toastText]);

  const applications = workspace.applications || [];
  const activeAlerts = (workspace.alerts || []).filter(a => !a.acknowledged);
  const summary = workspace.summary || {};
  const shownApps = useMemo(() => applications.filter(app => {
    const matchesFilter = filter === 'All' || (filter === 'Overdue' ? new Date(`${app.dueDate}T00:00:00`) < new Date(new Date().setHours(0, 0, 0, 0)) : app.stage === filter);
    const matchesQuery = !query || `${app.institution} ${app.caseId} ${app.applicationType} ${app.owner} ${app.region}`.toLowerCase().includes(query.toLowerCase());
    return matchesFilter && matchesQuery;
  }), [applications, filter, query]);
  const allDocuments = useMemo(() => applications.flatMap(app => (app.documents || []).map(doc => ({ ...doc, caseId: app.caseId, institution: app.institution, applicationId: app.id }))), [applications]);

  const updateWorkspace = async (path, method, body, update, message) => {
    const result = await mutate(path, method, body, update);
    setWorkspace(result.data);
    setRemote(result.remote);
    setToastText(message);
  };
  const openView = (item) => {
    setView(item); setMenuOpen(false); setQuery('');
    setFilter(item === 'Scrutiny & EVC' ? 'Review' : item === 'Documents' ? 'Documents' : item === 'Overview' ? 'All' : 'All');
    if (item === 'Alerts') document.getElementById('alerts')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (item === 'Audit trail') document.getElementById('activity')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const createApplication = async (event) => {
    event.preventDefault();
    if (!form.institution.trim()) { setToastText('Enter an institution name.'); return; }
    const result = await mutate('/api/applications', 'POST', form, data => {
      const nextNum = 440 + data.applications.length + 1;
      const app = { ...form, id: Date.now(), caseId: `AICTE/26/${nextNum}`, stage: 'Intake', documents: [{ name: 'Application form', status: 'Received' }, { name: 'Faculty details', status: 'Pending' }, { name: 'Infrastructure report', status: 'Pending' }] };
      return { ...data, applications: [app, ...data.applications], audit: [{ id: Date.now(), actor: 'Zariya', action: 'created application and routed it to', caseId: app.caseId, detail: `${app.region} regional office`, createdAt: 'Just now' }, ...(data.audit || [])] };
    });
    setWorkspace(result.data); setRemote(result.remote); setCreateOpen(false); setForm(emptyForm); setFilter('All'); setView('Applications'); setToastText(`Application added${result.remote ? ' to the shared workspace' : ' to this browser'}.`);
  };
  const updateStage = async (app, stage) => updateWorkspace(`/api/applications/${app.id}/stage`, 'PATCH', { stage, actor: 'Zariya' }, data => ({ ...data, applications: data.applications.map(a => a.id === app.id ? { ...a, stage } : a), audit: [{ id: Date.now(), actor: 'Zariya', action: `moved the application to ${stage}`, caseId: app.caseId, detail: 'Workflow stage updated', createdAt: 'Just now' }, ...(data.audit || [])] }), `Case moved to ${stage}.`);
  const updateDocument = async (app, doc, status) => {
    const result = await mutate(`/api/applications/${app.id}/documents`, 'PATCH', { name: doc.name, status, actor: 'Zariya' }, data => ({ ...data, applications: data.applications.map(a => a.id === app.id ? { ...a, documents: a.documents.map(d => d.name === doc.name ? { ...d, status } : d) } : a), audit: [{ id: Date.now(), actor: 'Zariya', action: `marked ${doc.name} as ${status.toLowerCase()}`, caseId: app.caseId, detail: 'Document tracker updated', createdAt: 'Just now' }, ...(data.audit || [])] }));
    setWorkspace(result.data); setRemote(result.remote); setSelected(result.data.applications.find(a => a.id === app.id)); setToastText(`Document marked ${status.toLowerCase()}.`);
  };
  const acknowledge = async (alert) => updateWorkspace(`/api/alerts/${alert.id}/acknowledge`, 'PATCH', { actor: 'Zariya' }, data => ({ ...data, alerts: data.alerts.map(a => a.id === alert.id ? { ...a, acknowledged: true } : a), audit: [{ id: Date.now(), actor: 'Zariya', action: 'acknowledged alert', caseId: alert.body.split(' · ')[0], detail: alert.title, createdAt: 'Just now' }, ...(data.audit || [])] }), 'Alert acknowledged and added to the audit trail.');
  const exportCsv = () => {
    const rows = [['Institution', 'Case ID', 'Application', 'Stage', 'Owner', 'Region', 'Due date'], ...applications.map(a => [a.institution, a.caseId, a.applicationType, a.stage, a.owner, a.region, a.dueDate])];
    const csv = rows.map(row => row.map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = Object.assign(document.createElement('a'), { href: url, download: 'zariya-application-queue.csv' }); link.click(); URL.revokeObjectURL(url); setToastText('Application report downloaded.');
  };
  const title = view === 'Overview' ? 'ZARIYA' : view;

  return <div className="shell">
    <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark">z</div><div className="brand-name">zariya<span>.</span></div></div>
      <div className="workspace"><div className="workspace-label">Workspace</div><div className="workspace-value">AICTE · Approval Cell <span>⌄</span></div></div>
      <div className="nav-title">Workspace</div>
      <nav className="nav" aria-label="Main navigation">{navItems.slice(0, 6).map(([name, icon]) => <button key={name} className={view === name ? 'active' : ''} onClick={() => openView(name)}><span className="nav-icon">{icon}</span>{name}{name === 'Applications' && <span className="nav-count">{applications.length}</span>}{name === 'Alerts' && activeAlerts.length > 0 && <span className="nav-count">{activeAlerts.length}</span>}</button>)}</nav>
      <div className="nav-title admin-title">Administration</div>
      <nav className="nav" aria-label="Administration navigation">{navItems.slice(6).map(([name, icon]) => <button key={name} className={view === name ? 'active' : ''} onClick={() => openView(name)}><span className="nav-icon">{icon}</span>{name}</button>)}</nav>
      <div className="sidebar-bottom"><div className="help"><div className="help-icon">◌</div><div><b>Need a hand?</b><small>Follow the approval stages from intake to compliance.</small></div></div><div className="user"><div className="avatar">Z</div><div className="user-info">Zariya<small>Approval Cell</small></div><div className="more">···</div></div></div>
    </aside>

    <main className="main">
      <header className="topbar"><div className="crumb-wrap"><button className="icon-btn mobile-menu" aria-label="Open menu" onClick={() => setMenuOpen(!menuOpen)}>☰</button><div className="crumb">AICTE / <b>{view}</b></div></div><div className="top-actions"><span className={`connection ${remote ? 'online' : ''}`}><i />{remote ? 'API connected' : 'Browser demo · saved here'}</span><IconButton label="Notifications" onClick={() => openView('Alerts')}>♧<i className="dot" /></IconButton><IconButton label="Help" onClick={() => setToastText('Workflow: intake → scrutiny → committee/EVC → decision → compliance.')}>?</IconButton></div></header>
      <section className="content">
        <div className="page-head"><div><div className="eyebrow">{todayLabel} <span>·</span> Approval operations</div><h1>{title}</h1><p className="sub">{view === 'Overview' ? 'Track applications, deadlines and compliance across regions.' : `${view} across the current approval cycle.`}</p></div><div className="head-right"><div className="date-chip"><span className="period-dot" />Current cycle · 2026–27</div><button className="outline-btn" onClick={exportCsv}>↧ &nbsp;Export report</button><button className="primary-btn" onClick={() => setCreateOpen(true)}>＋ &nbsp;New application</button></div></div>
        {!remote && <div className="demo-banner"><span>i</span><div><b>Browser demo mode</b> Changes save in this browser. Start the API and PostgreSQL with <code>docker compose up --build</code> for shared database storage.</div></div>}
        {loading && <div className="loading-line"><span /> Loading workspace data…</div>}
        <div className="metrics">
          <Metric label="Applications in cycle" value={summary.applicationsInCycle ?? applications.length} foot={`${applications.length} sample cases in this workspace`} tone="teal" icon="▤" />
          <Metric label="Awaiting review" value={summary.awaitingReview ?? applications.filter(a => ['Review', 'Intake'].includes(a.stage)).length} foot="Across assigned regional offices" tone="blue" icon="⌕" />
          <Metric label="Action due in 7 days" value={summary.dueSoon ?? 0} foot={`${summary.overdue ?? 0} overdue · follow-up required`} tone="orange" icon="◷" />
          <Metric label="Compliance this cycle" value={`${summary.compliance ?? 0}%`} foot="Based on required documents received" tone="red" icon="✓" />
        </div>

        <div className="overview-grid">
          <section className="panel queue-panel">
            <div className="panel-head"><div><div className="panel-title">{view === 'Documents' ? 'Document tracker' : 'Application queue'}</div><div className="panel-sub">Filter, search and open any case to update its workflow</div></div><button className="link-btn" onClick={() => { setView('Applications'); setFilter('All'); }}>All applications&nbsp; ↗</button></div>
            <div className="queue-controls"><div className="filters">{['All', 'Review', 'Documents', 'EVC', 'Overdue'].map(value => <button key={value} className={`filter ${filter === value ? 'active' : ''}`} onClick={() => setFilter(value)}>{value === 'Review' ? 'In review' : value === 'EVC' ? 'EVC visit' : value} <span>{value === 'All' ? applications.length : value === 'Overdue' ? applications.filter(a => dueLabel(a.dueDate).startsWith('Overdue')).length : applications.filter(a => a.stage === value).length}</span></button>)}</div><label className="search"><span>⌕</span><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search institution or case" aria-label="Search applications" /><kbd>/</kbd></label></div>
            <div className="table-wrap"><table className="queue-table"><thead><tr><th>Institution / Case</th><th>Application</th><th>Stage</th><th>Owner</th><th>Due date</th></tr></thead><tbody>{shownApps.map(app => <tr key={app.id} onClick={() => setSelected(app)} tabIndex="0" onKeyDown={e => e.key === 'Enter' && setSelected(app)}><td><span className="inst-name">{app.institution}</span><span className="case-id">{app.caseId}</span></td><td className="type">{app.applicationType}</td><td><Status>{app.stage}</Status></td><td><span className="owner"><i className="mini-avatar">{initials(app.owner)}</i>{app.owner}</span></td><td className={dueLabel(app.dueDate).startsWith('Overdue') || dueLabel(app.dueDate) === 'Today' ? 'due-soon' : ''}>{dueLabel(app.dueDate)}</td></tr>)}</tbody></table>{shownApps.length === 0 && <div className="empty-state">No matching applications. Try another filter or search.</div>}</div>
            <div className="view-all-row">Showing {shownApps.length} of {applications.length} applications</div>
          </section>
          <section className="panel alerts-panel" id="alerts"><div className="panel-head"><div><div className="panel-title">Needs attention</div><div className="panel-sub">Deadline alerts and escalations</div></div><span className="alert-total">{activeAlerts.length} open</span></div><div className="alert-list">{activeAlerts.map(alert => <div className="alert" key={alert.id}><i className={`alert-mark ${alert.level}`} /><div className="alert-copy"><b>{alert.title}</b><small>{alert.body}</small><time>{alert.time}</time></div><button className="alert-dismiss" title="Acknowledge alert" aria-label={`Acknowledge ${alert.title}`} onClick={() => acknowledge(alert)}>✓</button></div>)}{activeAlerts.length === 0 && <div className="empty-state compact">You’re all caught up.</div>}</div></section>
        </div>
        <section className="panel workflow-panel"><div className="panel-head"><div><div className="panel-title">Approval workflow</div><div className="panel-sub">Each case is tracked from intake through compliance</div></div><button className="link-btn" onClick={() => setToastText('Cases are routed by institution location, then reviewed before committee or EVC assessment.')}>Workflow guide&nbsp; ↗</button></div><div className="workflow-flow">{[['01', 'Intake & routing', applications.filter(a => a.stage === 'Intake').length, 'Intake'], ['02', 'Scrutiny', applications.filter(a => a.stage === 'Review').length, 'Review'], ['03', 'Committee / EVC', applications.filter(a => a.stage === 'EVC').length, 'EVC'], ['04', 'Decision', applications.filter(a => a.stage === 'Decision').length, 'Decision'], ['05', 'Compliance', applications.filter(a => a.stage === 'Compliance').length, 'Compliance']].map(([number, label, count, stage]) => <button className="stage" key={number} onClick={() => { setFilter(stage); setView(label); }}><span className="stage-node">{number}</span><span><b>{label}</b><small>{count} {count === 1 ? 'application' : 'applications'}</small></span></button>)}</div></section>
        <div className="lower-grid">
          <section className="panel compliance-panel"><div className="panel-head"><div><div className="panel-title">Compliance by region</div><div className="panel-sub">Requirements received for active cases</div></div><button className="link-btn" onClick={() => openView('Compliance')}>View details&nbsp; ↗</button></div>{(workspace.regions || []).map(region => <div className="bar-row" key={region.name}><span>{region.name}</span><div className="bar"><span style={{ width: `${region.compliance}%` }} /></div><strong>{region.compliance}%</strong></div>)}<div className="panel-foot">Completion is calculated from document statuses in this workspace.</div></section>
          <section className="panel audit-panel" id="activity"><div className="panel-head"><div><div className="panel-title">Recent activity</div><div className="panel-sub">Actions are recorded for review</div></div><button className="link-btn" onClick={() => openView('Audit trail')}>Audit trail&nbsp; ↗</button></div>{(workspace.audit || []).slice(0, 5).map(event => <div className="audit-row" key={event.id}><div className="audit-symbol">✓</div><div className="audit-text"><b>{event.actor}</b> {event.action} <b>{event.caseId}</b><small>{event.createdAt} · {event.detail}</small></div><span className="audit-ref">Logged</span></div>)}{!workspace.audit?.length && <div className="empty-state compact">New actions will appear here.</div>}</section>
        </div>
        <div className="footer-note"><span className="lock">▣</span> Role-based access · Workflow updates recorded in the audit trail <span className="footer-brand">Zariya · Approval workflow &amp; compliance</span></div>
      </section>
    </main>

    {selected && <CaseDialog app={applications.find(a => a.id === selected.id) || selected} onClose={() => setSelected(null)} onStage={updateStage} onDocument={updateDocument} />}
    {createOpen && <CreateDialog form={form} setForm={setForm} onClose={() => setCreateOpen(false)} onSubmit={createApplication} />}
    <div className={`toast ${toastText ? 'show' : ''}`} role="status">{toastText}</div>
  </div>;
}

function Metric({ label, value, foot, tone, icon }) { return <article className="metric"><div className="metric-top">{label}<span className={`metric-icon ${tone}`}>{icon}</span></div><div className="metric-value">{value}</div><div className="metric-foot">{foot}</div></article>; }

function CaseDialog({ app, onClose, onStage, onDocument }) {
  useEffect(() => { const onKey = e => e.key === 'Escape' && onClose(); window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  return <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="case-title"><div className="modal-head"><div><h2 id="case-title">{app.institution}</h2><p>{app.caseId} · {app.applicationType}</p></div><button className="close" onClick={onClose} aria-label="Close">×</button></div><div className="modal-body"><div className="detail-grid"><Detail label="Current stage"><Status>{app.stage}</Status></Detail><Detail label="Assigned officer">{app.owner} · {app.region} region</Detail><Detail label="Next action due"><span className={dueLabel(app.dueDate).startsWith('Overdue') ? 'due-soon' : ''}>{dueLabel(app.dueDate)}</span></Detail><Detail label="Priority">{app.priority}</Detail></div><div className="modal-section">Workflow stage</div><label className="select-wrap"><span>Move case</span><select value={app.stage} onChange={e => onStage(app, e.target.value)}>{stages.map(stage => <option key={stage}>{stage}</option>)}</select></label><div className="modal-section">Application documents <small>Click a status to update it</small></div>{(app.documents || []).map(doc => <div className="doc-line" key={doc.name}><div className="doc-ico">▧</div><div><strong>{doc.name}</strong><small>Required application record</small></div><button className={`doc-state ${doc.status.toLowerCase()}`} onClick={() => onDocument(app, doc, doc.status === 'Pending' ? 'Received' : doc.status === 'Received' ? 'Verified' : 'Pending')}>{doc.status} ↻</button></div>)}<div className="modal-actions"><button className="outline-btn" onClick={onClose}>Close</button></div></div></section></div>;
}
function Detail({ label, children }) { return <div className="detail"><label>{label}</label><strong>{children}</strong></div>; }

function CreateDialog({ form, setForm, onClose, onSubmit }) {
  useEffect(() => { const onKey = e => e.key === 'Escape' && onClose(); window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey); }, [onClose]);
  const field = (key, value) => setForm(old => ({ ...old, [key]: value }));
  return <div className="overlay" onMouseDown={e => e.target === e.currentTarget && onClose()}><section className="modal create-modal" role="dialog" aria-modal="true" aria-labelledby="create-title"><div className="modal-head"><div><h2 id="create-title">New application</h2><p>Add an institution case to the approval cycle</p></div><button className="close" onClick={onClose} aria-label="Close">×</button></div><form className="modal-body" onSubmit={onSubmit}><label className="form-field full">Institution name<input required autoFocus value={form.institution} onChange={e => field('institution', e.target.value)} placeholder="e.g. Central Institute of Technology" /></label><label className="form-field">Application type<select value={form.applicationType} onChange={e => field('applicationType', e.target.value)}>{['Extension of approval', 'New institution', 'New programme', 'Increase in intake', 'Change of name'].map(x => <option key={x}>{x}</option>)}</select></label><label className="form-field">Region<select value={form.region} onChange={e => field('region', e.target.value)}>{['North', 'South', 'East', 'West'].map(x => <option key={x}>{x}</option>)}</select></label><label className="form-field">Assigned officer<input value={form.owner} onChange={e => field('owner', e.target.value)} /></label><label className="form-field">Action due<input type="date" value={form.dueDate} onChange={e => field('dueDate', e.target.value)} /></label><div className="modal-actions"><button type="button" className="outline-btn" onClick={onClose}>Cancel</button><button type="submit" className="primary-btn">Create application</button></div></form></section></div>;
}
