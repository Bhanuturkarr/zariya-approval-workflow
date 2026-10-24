const today = new Date();
const dateOffset = (days) => {
  const d = new Date(today);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const seedWorkspace = {
  summary: { applicationsInCycle: 8, awaitingReview: 3, dueSoon: 5, overdue: 1, compliance: 75 },
  applications: [
    { id: 1, caseId: 'AICTE/26/0418', institution: 'Mahatma Gandhi Institute of Technology', applicationType: 'Extension of approval', stage: 'Review', owner: 'R. Kulkarni', region: 'West', dueDate: dateOffset(0), priority: 'High', documents: [{ name: 'Application form', status: 'Received' }, { name: 'Faculty details', status: 'Verified' }, { name: 'Infrastructure report', status: 'Pending' }] },
    { id: 2, caseId: 'AICTE/26/0421', institution: 'Coastal School of Engineering', applicationType: 'New institution', stage: 'Documents', owner: 'S. Iyer', region: 'South', dueDate: dateOffset(3), priority: 'Normal', documents: [{ name: 'Application form', status: 'Received' }, { name: 'Land documents', status: 'Pending' }, { name: 'Fire safety certificate', status: 'Pending' }] },
    { id: 3, caseId: 'AICTE/26/0396', institution: 'National Institute of Technology Studies', applicationType: 'Increase in intake', stage: 'EVC', owner: 'P. Deshmukh', region: 'West', dueDate: dateOffset(4), priority: 'Normal', documents: [{ name: 'Application form', status: 'Verified' }, { name: 'EVC visit report', status: 'Received' }, { name: 'Faculty details', status: 'Verified' }] },
    { id: 4, caseId: 'AICTE/26/0372', institution: 'Eastern Valley Technical University', applicationType: 'Extension of approval', stage: 'Compliance', owner: 'Zariya', region: 'East', dueDate: dateOffset(-2), priority: 'High', documents: [{ name: 'Application form', status: 'Verified' }, { name: 'Compliance statement', status: 'Pending' }, { name: 'Audited accounts', status: 'Received' }] },
    { id: 5, caseId: 'AICTE/26/0430', institution: 'Saraswati College of Technology', applicationType: 'New programme', stage: 'Review', owner: 'N. Bose', region: 'North', dueDate: dateOffset(6), priority: 'Normal', documents: [{ name: 'Application form', status: 'Received' }, { name: 'Board resolution', status: 'Verified' }, { name: 'Faculty details', status: 'Received' }] },
    { id: 6, caseId: 'AICTE/26/0403', institution: 'Deccan Institute of Applied Sciences', applicationType: 'Extension of approval', stage: 'Documents', owner: 'R. Kulkarni', region: 'West', dueDate: dateOffset(7), priority: 'Normal', documents: [{ name: 'Application form', status: 'Received' }, { name: 'Infrastructure report', status: 'Pending' }, { name: 'Compliance statement', status: 'Received' }] },
    { id: 7, caseId: 'AICTE/26/0388', institution: 'Himalayan College of Engineering', applicationType: 'Increase in intake', stage: 'EVC', owner: 'N. Bose', region: 'North', dueDate: dateOffset(10), priority: 'Normal', documents: [{ name: 'Application form', status: 'Verified' }, { name: 'EVC visit report', status: 'Received' }, { name: 'Faculty details', status: 'Verified' }] },
    { id: 8, caseId: 'AICTE/26/0412', institution: 'Riverbend Institute of Technology', applicationType: 'Extension of approval', stage: 'Review', owner: 'S. Iyer', region: 'South', dueDate: dateOffset(11), priority: 'Normal', documents: [{ name: 'Application form', status: 'Received' }, { name: 'Faculty details', status: 'Pending' }, { name: 'Audited accounts', status: 'Received' }] }
  ],
  alerts: [
    { id: 1, level: 'urgent', title: 'Scrutiny deadline today', body: 'AICTE/26/0418 · Mahatma Gandhi Institute of Technology', time: 'Due today · action required', acknowledged: false },
    { id: 2, level: 'urgent', title: 'Compliance response overdue', body: 'AICTE/26/0372 · Eastern Valley Technical University', time: 'Overdue by 2 days · escalated to Regional Director', acknowledged: false },
    { id: 3, level: '', title: 'EVC visit scheduled', body: 'AICTE/26/0396 · National Institute of Technology Studies', time: `Due ${dateOffset(4)} · West regional office`, acknowledged: false },
    { id: 4, level: 'info', title: 'Documents received', body: 'AICTE/26/0421 · Coastal School of Engineering', time: '3 files uploaded · review required', acknowledged: false }
  ],
  audit: [
    { id: 1, actor: 'R. Kulkarni', action: 'completed preliminary scrutiny', caseId: 'AICTE/26/0418', detail: 'Regional office, West', createdAt: 'Today, 10:42 AM' },
    { id: 2, actor: 'System', action: 'routed application to South regional office', caseId: 'AICTE/26/0421', detail: 'Rule: institution location', createdAt: 'Today, 10:16 AM' },
    { id: 3, actor: 'S. Iyer', action: 'uploaded EVC report', caseId: 'AICTE/26/0396', detail: 'Document verified', createdAt: 'Today, 9:58 AM' }
  ],
  regions: [{ name: 'North', compliance: 100 }, { name: 'South', compliance: 50 }, { name: 'West', compliance: 78 }, { name: 'East', compliance: 67 }]
};

const storageKey = 'zariya-workspace-v2';
const API = import.meta.env.VITE_API_URL || '';
let remoteAvailable = false;

export function isRemoteAvailable() { return remoteAvailable; }
export function readLocal() {
  try { return JSON.parse(localStorage.getItem(storageKey)) || structuredClone(seedWorkspace); }
  catch { return structuredClone(seedWorkspace); }
}
export function saveLocal(data) {
  localStorage.setItem(storageKey, JSON.stringify(data));
  return data;
}
export async function loadWorkspace() {
  try {
    const res = await fetch(`${API}/api/workspace`, { signal: AbortSignal.timeout(1800) });
    if (!res.ok) throw new Error('API unavailable');
    remoteAvailable = true;
    const data = await res.json();
    saveLocal(data);
    return data;
  } catch {
    remoteAvailable = false;
    const local = readLocal();
    if (!local.applications?.length) return saveLocal(structuredClone(seedWorkspace));
    return local;
  }
}
export async function mutate(path, method, body, updater) {
  if (remoteAvailable) {
    try {
      const res = await fetch(`${API}${path}`, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
      if (!res.ok) throw new Error('Request failed');
      const data = await fetch(`${API}/api/workspace`).then(r => r.json());
      saveLocal(data);
      return { data, remote: true };
    } catch { remoteAvailable = false; }
  }
  const data = updater(readLocal());
  saveLocal(data);
  return { data, remote: false };
}
