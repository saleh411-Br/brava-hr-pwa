// Brava HR PWA — Main App Logic

// ── State ─────────────────────────────────────────────────
const State = {
  page: 'dashboard',
  employees: [],
  hires: [],
  dashboard: null,
  currentEmp: null,
  currentHire: null,
  hiresFilter: 'All',
};

// ── Toast ─────────────────────────────────────────────────
function toast(msg, type='', duration=2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show ' + type;
  setTimeout(() => t.className = 'toast', duration);
}

// ── Loading ───────────────────────────────────────────────
function showLoader(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = '<div class="loading"><div class="spinner"></div><p>Loading…</p></div>';
}

// ── Navigation ────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  document.getElementById('nav-' + page)?.classList.add('active');
  State.page = page;
  updateTopbar(page);
  if (page === 'dashboard') loadDashboard();
  if (page === 'employees') { showEmployeeList(); }
  if (page === 'hires')     loadHires('All');
  if (page === 'payroll')   renderPayrollPage();
}

function updateTopbar(page) {
  const titles = { dashboard:'Dashboard', employees:'Employees', hires:'New Hires', payroll:'Payroll', settings:'Settings' };
  document.getElementById('topbar-title').textContent = titles[page] || 'Brava HR';
}

// ── Panel Management ──────────────────────────────────────
function openPanel(id) { document.getElementById(id)?.classList.add('open'); }
function closePanel(id) { document.getElementById(id)?.classList.remove('open'); }

// ═══════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════
async function loadDashboard() {
  const apiUrl = localStorage.getItem('brava_api_url');
  if (!apiUrl) {
    document.getElementById('dash-stats').innerHTML =
      '<div class="empty"><div class="empty-icon">⚙️</div><p>Configure your API URL in Settings to get started.</p></div>';
    return;
  }
  showLoader('dash-stats');
  showLoader('dash-alerts');
  showLoader('dash-vac');
  try {
    const [stats, alerts, vac] = await Promise.all([
      API.getDashboard(),
      API.getExpiryAlerts(),
      API.getOnVacation(),
    ]);
    State.dashboard = { stats, alerts, vac };
    renderDashboard(stats, alerts, vac);
  } catch(e) {
    document.getElementById('dash-stats').innerHTML =
      `<div class="empty"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;
  }
}

function renderDashboard(stats, alerts, vac) {
  // Stats grid
  document.getElementById('dash-stats').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card" onclick="navigate('employees')">
        <div class="stat-value">${stats.total || 0}</div>
        <div class="stat-label">Total Employees</div>
      </div>
      <div class="stat-card success" onclick="navigate('employees')">
        <div class="stat-value">${stats.active || 0}</div>
        <div class="stat-label">Active</div>
      </div>
      <div class="stat-card info">
        <div class="stat-value">${stats.onLeave || 0}</div>
        <div class="stat-label">On Vacation</div>
      </div>
      <div class="stat-card warn">
        <div class="stat-value">${stats.expiring || 0}</div>
        <div class="stat-label">Docs Expiring</div>
      </div>
    </div>
    ${renderBranchStats(stats.branches || {})}
  `;

  // On Vacation
  const vacEl = document.getElementById('dash-vac');
  if (!vac.length) {
    vacEl.innerHTML = '<p style="color:var(--muted);font-size:13px;text-align:center;padding:12px">No employees currently on vacation.</p>';
  } else {
    vacEl.innerHTML = vac.map(v => `
      <div class="vac-item">
        <div>
          <div class="vac-name">${v.name}</div>
          <div class="vac-meta">${v.type} · ${v.startDate} → ${v.endDate}</div>
        </div>
        <div class="vac-days">${v.daysLeft}d left</div>
      </div>
    `).join('');
  }

  // Expiry Alerts
  const alertEl = document.getElementById('dash-alerts');
  if (!alerts.length) {
    alertEl.innerHTML = '<p style="color:var(--green);font-size:13px;text-align:center;padding:12px">✅ All documents up to date</p>';
  } else {
    alertEl.innerHTML = alerts.slice(0,15).map(a => {
      const cls = a.days < 0 ? 'expired' : a.days <= 7 ? 'critical' : a.days <= 15 ? 'warning' : 'notice';
      const lbl = a.days < 0 ? `${Math.abs(a.days)}d EXPIRED` : `${a.days}d`;
      return `
        <div class="alert-item" onclick="quickEmpView('${a.empNo}')">
          <div class="alert-dot ${cls}"></div>
          <div class="alert-info">
            <div class="alert-name">${a.name}</div>
            <div class="alert-doc">${a.doc} · ${a.expiry}</div>
          </div>
          <div class="alert-days ${cls}">${lbl}</div>
        </div>
      `;
    }).join('');
  }
}

function renderBranchStats(branches) {
  const entries = Object.entries(branches).sort((a,b) => b[1]-a[1]);
  if (!entries.length) return '';
  return `
    <div class="card" style="margin-top:0">
      <div class="card-header"><span class="card-title">By Branch</span></div>
      ${entries.map(([b, n]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:13px;font-weight:600">${b}</span>
          <span style="font-size:13px;color:var(--navy);font-weight:700;font-family:'IBM Plex Mono',monospace">${n}</span>
        </div>
      `).join('')}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// EMPLOYEES
// ═══════════════════════════════════════════════════════════
function showEmployeeList() {
  const q = document.getElementById('emp-search')?.value?.trim();
  if (!q) {
    document.getElementById('emp-list').innerHTML =
      '<div class="empty"><div class="empty-icon">🔍</div><p>Search by name or employee number</p></div>';
    return;
  }
  searchEmployees(q);
}

async function searchEmployees(q) {
  if (!q || q.length < 2) return;
  showLoader('emp-list');
  try {
    const results = await API.searchEmployees(q);
    State.employees = results;
    renderEmployeeList(results);
  } catch(e) {
    document.getElementById('emp-list').innerHTML =
      `<div class="empty"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;
  }
}

function renderEmployeeList(list) {
  const el = document.getElementById('emp-list');
  if (!list.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">😕</div><p>No employees found</p></div>';
    return;
  }
  el.innerHTML = list.map((e, i) => {
    const initials = (e.nameEn||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();
    const status = (e.status||'Active').replace(/\s/g,'');
    return `
      <div class="emp-card" onclick="openEmployee(${i})">
        <div class="emp-avatar">${initials}</div>
        <div style="flex:1;min-width:0">
          <div class="emp-name">${e.nameEn || '—'}<span class="emp-badge b-${status}">${e.status}</span></div>
          <div class="emp-meta">${e.empNo} · ${e.jobTitle || '—'} · ${e.branch || '—'}</div>
        </div>
        <div style="color:var(--muted);font-size:20px">›</div>
      </div>
    `;
  }).join('');
}

async function openEmployee(idx) {
  const emp = State.employees[idx];
  if (!emp) return;
  openPanel('panel-emp');
  document.getElementById('panel-emp-title').textContent = 'Loading…';
  document.getElementById('panel-emp-body').innerHTML = '<div class="loading"><div class="spinner"></div></div>';
  try {
    const data = await API.getEmployee(emp.empNo);
    State.currentEmp = data;
    renderEmployeeDetail(data);
  } catch(e) {
    document.getElementById('panel-emp-body').innerHTML = `<p style="color:red">${e.message}</p>`;
  }
}

async function quickEmpView(empNo) {
  navigate('employees');
  document.getElementById('emp-search').value = empNo;
  showLoader('emp-list');
  try {
    const results = await API.searchEmployees(empNo);
    State.employees = results;
    renderEmployeeList(results);
    if (results.length) setTimeout(() => openEmployee(0), 300);
  } catch(e) {}
}

function renderEmployeeDetail(e) {
  document.getElementById('panel-emp-title').textContent = e.nameEn || '—';
  function days(d, n) {
    const v = parseInt(n);
    const cls = isNaN(v) ? '' : v < 0 ? 'days-crit' : v <= 30 ? 'days-warn' : 'days-ok';
    const lbl = isNaN(v) ? '—' : v < 0 ? `${Math.abs(v)}d EXPIRED` : `${v}d`;
    return `<p>${d || '—'} <span class="days-pill ${cls}">${lbl}</span></p>`;
  }
  function val(v) { return v || '—'; }
  function sar(v) { return v ? `SAR ${parseFloat(v).toLocaleString()}` : '—'; }

  document.getElementById('panel-emp-body').innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">Personal</div>
      <div class="detail-grid">
        <div class="detail-item"><label>Emp No.</label><p>${val(e.empNo)}</p></div>
        <div class="detail-item"><label>Status</label><p><span class="emp-badge b-${(e.status||'Active').replace(/\s/g,'')}">${val(e.status)}</span></p></div>
        <div class="detail-item"><label>Name (EN)</label><p>${val(e.nameEn)}</p></div>
        <div class="detail-item"><label>Nationality</label><p>${val(e.nationality)}</p></div>
        <div class="detail-item"><label>ID No.</label><p>${val(e.idNo)}</p></div>
        <div class="detail-item"><label>ID Expiry</label>${days(e.idExpiry, e.idDays)}</div>
        <div class="detail-item"><label>Phone</label><p><a href="tel:${e.phone}" style="color:var(--navy)">${val(e.phone)}</a></p></div>
        <div class="detail-item"><label>Email</label><p>${val(e.email)}</p></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Employment</div>
      <div class="detail-grid">
        <div class="detail-item"><label>Job Title</label><p>${val(e.jobTitle)}</p></div>
        <div class="detail-item"><label>Branch</label><p>${val(e.branch)}</p></div>
        <div class="detail-item"><label>Joining Date</label><p>${val(e.joiningDate)}</p></div>
        <div class="detail-item"><label>Service</label><p>${val(e.serviceLength)}</p></div>
        <div class="detail-item"><label>Contract Type</label><p>${val(e.contractType)}</p></div>
        <div class="detail-item"><label>Contract Expiry</label>${days(e.contractExpiry, e.contractDays)}</div>
        <div class="detail-item"><label>Labor Expiry</label>${days(e.laborExpiry, e.laborDays)}</div>
        <div class="detail-item"><label>Passport Expiry</label>${days(e.passExpiry, e.passDays)}</div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Salary</div>
      <div class="detail-grid">
        <div class="detail-item"><label>Basic</label><p>${sar(e.basicSalary)}</p></div>
        <div class="detail-item"><label>Housing</label><p>${sar(e.housingAllowance)}</p></div>
        <div class="detail-item"><label>Other Inc.</label><p>${sar(e.otherIncentives)}</p></div>
        <div class="detail-item"><label>GOSI</label><p>${sar(e.gosiDeduction)}</p></div>
        <div class="detail-item"><label>Net Pay</label><p style="font-weight:700;color:var(--navy)">${sar(e.netPayment)}</p></div>
        <div class="detail-item"><label>Transfer</label><p>${val(e.salaryTransferType)}</p></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Leave & Loans</div>
      <div class="detail-grid">
        <div class="detail-item"><label>Vac Accrued</label><p>${val(e.vacAccrued)} days</p></div>
        <div class="detail-item"><label>Vac Remaining</label><p style="font-weight:700;color:var(--navy)">${val(e.vacRemaining)} days</p></div>
        <div class="detail-item"><label>Loan Balance</label><p style="color:${parseFloat(e.loanBalance)>0?'var(--red)':'inherit'}">${sar(e.loanBalance)}</p></div>
        <div class="detail-item"><label>EOS Accrual</label><p style="font-weight:700">${sar(e.eosAccrual)}</p></div>
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Insurance & Health</div>
      <div class="detail-grid">
        <div class="detail-item"><label>Insurance Expiry</label>${days(e.insuranceExpiry, e.insuranceDays)}</div>
        <div class="detail-item"><label>Health Cert Expiry</label>${days(e.healthCertExpiry, e.healthCertDays)}</div>
      </div>
    </div>
    ${e.city || e.shortAddress ? `
    <div class="detail-section">
      <div class="detail-section-title">National Address</div>
      <div class="detail-grid">
        ${e.shortAddress ? `<div class="detail-item"><label>Short Address</label><p style="font-family:'IBM Plex Mono',monospace;font-weight:600;letter-spacing:1px">${e.shortAddress}</p></div>` : ''}
        ${e.city ? `<div class="detail-item"><label>City</label><p>${e.city}</p></div>` : ''}
      </div>
    </div>` : ''}
    <div style="margin-top:20px">
      <div class="section-label">Quick Actions</div>
      <div class="btn-row" style="flex-wrap:wrap;gap:8px">
        <button class="btn btn-secondary" onclick="openAddVacation('${e.empNo}','${e.nameEn}')">🏖️ Add Leave</button>
        <button class="btn btn-secondary" onclick="openAddWarning('${e.empNo}','${e.nameEn}')">⚠️ Warning</button>
        <button class="btn btn-secondary" onclick="openAddDeduction('${e.empNo}','${e.nameEn}')">➖ Deduction</button>
        <button class="btn btn-secondary" onclick="openSalaryAdj('${e.empNo}','${e.nameEn}')">💰 Salary Adj</button>
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// QUICK ACTION FORMS
// ═══════════════════════════════════════════════════════════
function openAddVacation(empNo, name) {
  document.getElementById('form-vac-title').textContent = `Add Leave — ${name}`;
  document.getElementById('form-vac').reset();
  document.getElementById('fvac-empno').value = empNo;
  openPanel('panel-form-vac');
}

async function submitVacation() {
  const d = {
    empNo: document.getElementById('fvac-empno').value,
    vacType: document.getElementById('fvac-type').value,
    startDate: document.getElementById('fvac-start').value,
    endDate: document.getElementById('fvac-end').value,
    docLink: document.getElementById('fvac-doc').value,
  };
  if (!d.vacType || !d.startDate || !d.endDate) { toast('Fill all required fields','err'); return; }
  try {
    const r = await API.addVacation(d);
    toast(r.msg || 'Leave recorded','ok');
    closePanel('panel-form-vac');
  } catch(e) { toast(e.message,'err'); }
}

function openAddWarning(empNo, name) {
  document.getElementById('form-warn-title').textContent = `Warning — ${name}`;
  document.getElementById('form-warn').reset();
  document.getElementById('fwarn-empno').value = empNo;
  openPanel('panel-form-warn');
}

async function submitWarning() {
  const d = {
    empNo: document.getElementById('fwarn-empno').value,
    warningDate: document.getElementById('fwarn-date').value,
    reason: document.getElementById('fwarn-reason').value,
    docLink: document.getElementById('fwarn-doc').value,
  };
  if (!d.warningDate || !d.reason) { toast('Fill all required fields','err'); return; }
  try {
    const r = await API.addWarning(d);
    toast(r.msg || 'Warning recorded','ok');
    closePanel('panel-form-warn');
  } catch(e) { toast(e.message,'err'); }
}

function openAddDeduction(empNo, name) {
  document.getElementById('form-ded-title').textContent = `Deduction — ${name}`;
  document.getElementById('form-ded').reset();
  document.getElementById('fded-empno').value = empNo;
  document.getElementById('fded-date').value = new Date().toISOString().split('T')[0];
  openPanel('panel-form-ded');
}

async function submitDeduction() {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const now = new Date();
  const d = {
    empNo: document.getElementById('fded-empno').value,
    deductionDate: document.getElementById('fded-date').value,
    amount: document.getElementById('fded-amount').value,
    reflectionMonth: months[now.getMonth()] + ' ' + now.getFullYear(),
    category: document.getElementById('fded-cat').value,
    notes: document.getElementById('fded-notes').value,
  };
  if (!d.amount || parseFloat(d.amount) <= 0) { toast('Enter a valid amount','err'); return; }
  try {
    const r = await API.addDeduction(d);
    toast(r.msg || 'Deduction saved','ok');
    closePanel('panel-form-ded');
  } catch(e) { toast(e.message,'err'); }
}

function openSalaryAdj(empNo, name) {
  document.getElementById('form-sal-title').textContent = `Salary Adj — ${name}`;
  document.getElementById('form-sal').reset();
  document.getElementById('fsal-empno').value = empNo;
  document.getElementById('fsal-date').value = new Date().toISOString().split('T')[0];
  openPanel('panel-form-sal');
}

async function submitSalaryAdj() {
  const d = {
    empNo: document.getElementById('fsal-empno').value,
    adjDate: document.getElementById('fsal-date').value,
    adjType: document.getElementById('fsal-type').value,
    field: document.getElementById('fsal-field').value,
    amount: document.getElementById('fsal-amount').value,
    notes: document.getElementById('fsal-notes').value,
  };
  if (!d.amount || parseFloat(d.amount) <= 0) { toast('Enter a valid amount','err'); return; }
  try {
    const r = await API.addSalaryAdj(d);
    toast(r.msg || 'Adjustment saved','ok');
    closePanel('panel-form-sal');
  } catch(e) { toast(e.message,'err'); }
}

// ═══════════════════════════════════════════════════════════
// NEW HIRES
// ═══════════════════════════════════════════════════════════
async function loadHires(filter) {
  State.hiresFilter = filter;
  document.querySelectorAll('#hire-chips .chip').forEach(c => {
    c.classList.toggle('active', c.dataset.status === filter);
  });
  showLoader('hire-list');
  try {
    const all = await API.getNewHires();
    State.hires = all;
    const filtered = filter === 'All' ? all : all.filter(h => h.status === filter);
    renderHireList(filtered);
  } catch(e) {
    document.getElementById('hire-list').innerHTML = `<div class="empty"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;
  }
}

function renderHireList(list) {
  const el = document.getElementById('hire-list');
  if (!list.length) {
    el.innerHTML = '<div class="empty"><div class="empty-icon">📋</div><p>No hires found</p></div>';
    return;
  }
  const colors = { Active:'#e3f2fd', Converted:'#e8f5e9', Rejected:'#ffebee', 'No Show':'#fff3e0' };
  const textColors = { Active:'#1565c0', Converted:'#2e7d32', Rejected:'#c62828', 'No Show':'#e65100' };
  el.innerHTML = list.map((h, i) => `
    <div class="emp-card" onclick="openHire(${i})">
      <div class="emp-avatar" style="background:${textColors[h.status]||'#1a237e'}">${(h.nameEn||'?')[0].toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div class="emp-name">${h.nameEn}
          <span class="emp-badge" style="background:${colors[h.status]||'#e3f2fd'};color:${textColors[h.status]||'#1565c0'}">${h.status}</span>
        </div>
        <div class="emp-meta">${h.hireType} · ${h.natType} · ${h.position || '—'}</div>
      </div>
      <div style="color:var(--muted);font-size:20px">›</div>
    </div>
  `).join('');
}

function openHire(idx) {
  const h = State.hires[idx];
  if (!h) return;
  State.currentHire = h;
  renderHireDetail(h);
  openPanel('panel-hire');
}

function renderHireDetail(h) {
  document.getElementById('panel-hire-title').textContent = h.nameEn || 'New Hire';
  const colors = { Active:'#e3f2fd', Converted:'#e8f5e9', Rejected:'#ffebee', 'No Show':'#fff3e0' };
  const textColors = { Active:'#1565c0', Converted:'#2e7d32', Rejected:'#c62828', 'No Show':'#e65100' };

  let actionBtns = '';
  if (h.status === 'Active') {
    actionBtns = `
      <button class="btn btn-amber" onclick="changeHireStatusApp('No Show')">❌ No Show</button>
      <button class="btn btn-danger" onclick="changeHireStatusApp('Rejected')">✖ Rejected</button>
    `;
  } else if (h.status === 'Rejected' || h.status === 'No Show') {
    actionBtns = `<button class="btn btn-secondary" onclick="changeHireStatusApp('Active')">↺ Reactivate</button>`;
  } else if (h.status === 'Converted') {
    actionBtns = `<div style="background:var(--green-lt);color:var(--green);padding:10px;border-radius:8px;font-weight:600;text-align:center">✅ Converted — Employee No: ${h.empNo}</div>`;
  }

  document.getElementById('panel-hire-body').innerHTML = `
    <div class="detail-section">
      <div class="detail-section-title">Hire Info</div>
      <div class="detail-grid">
        <div class="detail-item"><label>Hire ID</label><p style="font-family:'IBM Plex Mono',monospace">${h.hireId}</p></div>
        <div class="detail-item"><label>Status</label><p><span class="emp-badge" style="background:${colors[h.status]};color:${textColors[h.status]}">${h.status}</span></p></div>
        <div class="detail-item"><label>Hire Type</label><p>${h.hireType}</p></div>
        <div class="detail-item"><label>Nat. Type</label><p>${h.natType}</p></div>
        <div class="detail-item"><label>Nationality</label><p>${h.nationality || '—'}</p></div>
        <div class="detail-item"><label>Position</label><p>${h.position || '—'}</p></div>
        <div class="detail-item"><label>Phone</label><p><a href="tel:${h.phone}" style="color:var(--navy)">${h.phone || '—'}</a></p></div>
        <div class="detail-item"><label>Basic Salary</label><p>${h.basicSalary ? 'SAR '+parseFloat(h.basicSalary).toLocaleString() : '—'}</p></div>
        <div class="detail-item"><label>Joining Date</label><p>${h.joiningDate || 'Not set'}</p></div>
      </div>
    </div>
    ${h.status !== 'Converted' ? `
    <div class="section-label">Actions</div>
    <div class="btn-row" style="flex-wrap:wrap;gap:8px">
      ${actionBtns}
    </div>` : actionBtns}
  `;
}

async function changeHireStatusApp(newStatus) {
  const h = State.currentHire;
  if (!confirm(`Change status of ${h.nameEn} to "${newStatus}"?`)) return;
  try {
    await API.updateHireStatus(h.hireId, h._row, newStatus);
    toast(`Status updated to: ${newStatus}`, 'ok');
    h.status = newStatus;
    renderHireDetail(h);
    // Refresh list
    loadHires(State.hiresFilter);
  } catch(e) { toast(e.message, 'err'); }
}

// ═══════════════════════════════════════════════════════════
// PAYROLL PAGE
// ═══════════════════════════════════════════════════════════
function renderPayrollPage() {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const now = new Date();
  const mOpts = months.map((m,i) => `<option value="${i+1}" ${i===now.getMonth()?'selected':''}>${m}</option>`).join('');
  const yOpts = [-1,0,1].map(d => {
    const y = now.getFullYear()+d;
    return `<option value="${y}" ${d===0?'selected':''}>${y}</option>`;
  }).join('');

  document.getElementById('page-payroll').innerHTML = `
    <div class="card">
      <div class="card-header"><span class="card-title">💳 WPS Payroll CSV</span></div>
      <div class="form-row">
        <div class="form-group"><label>Month</label><select id="pay-month">${mOpts}</select></div>
        <div class="form-group"><label>Year</label><select id="pay-year">${yOpts}</select></div>
      </div>
      <button class="btn btn-primary" onclick="generatePayroll()">⬇️ Generate Payroll CSV</button>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">🍽️ Food Allowance CSV</span></div>
      <div class="form-row">
        <div class="form-group"><label>Month</label><select id="food-month">${mOpts}</select></div>
        <div class="form-group"><label>Year</label><select id="food-year">${yOpts}</select></div>
      </div>
      <button class="btn btn-primary" onclick="generateFoodAllowance()">⬇️ Generate Food Allowance CSV</button>
    </div>
    <div id="payroll-result"></div>
  `;
}

async function generatePayroll() {
  const month = parseInt(document.getElementById('pay-month').value);
  const year  = parseInt(document.getElementById('pay-year').value);
  document.getElementById('payroll-result').innerHTML = '<div class="loading"><div class="spinner"></div><p>Generating…</p></div>';
  try {
    const r = await API.generatePayroll(month, year);
    downloadCSV(r.csv, r.filename);
    document.getElementById('payroll-result').innerHTML = `<div style="background:var(--green-lt);color:var(--green);padding:12px;border-radius:8px;font-weight:600;text-align:center">✅ Downloaded: ${r.filename} (${r.rows} employees)</div>`;
  } catch(e) {
    document.getElementById('payroll-result').innerHTML = `<div style="background:var(--red-lt);color:var(--red);padding:12px;border-radius:8px">${e.message}</div>`;
  }
}

async function generateFoodAllowance() {
  const month = parseInt(document.getElementById('food-month').value);
  const year  = parseInt(document.getElementById('food-year').value);
  document.getElementById('payroll-result').innerHTML = '<div class="loading"><div class="spinner"></div><p>Generating…</p></div>';
  try {
    const r = await API.generateFoodAllowance(month, year);
    downloadCSV(r.csv, r.filename);
    document.getElementById('payroll-result').innerHTML = `<div style="background:var(--green-lt);color:var(--green);padding:12px;border-radius:8px;font-weight:600;text-align:center">✅ Downloaded: ${r.filename} (${r.rows} employees)</div>`;
  } catch(e) {
    document.getElementById('payroll-result').innerHTML = `<div style="background:var(--red-lt);color:var(--red);padding:12px;border-radius:8px">${e.message}</div>`;
  }
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], {type:'text/csv;charset=utf-8;'});
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════════════════
function renderSettings() {
  const url = localStorage.getItem('brava_api_url') || '';
  document.getElementById('settings-url').value = url;
}

function saveSettings() {
  const url = document.getElementById('settings-url').value.trim();
  if (url) {
    localStorage.setItem('brava_api_url', url);
    toast('Settings saved ✓', 'ok');
    loadDashboard();
  } else {
    toast('Enter a valid URL', 'err');
  }
}

function testConnection() {
  const url = document.getElementById('settings-url').value.trim();
  if (!url) { toast('Enter URL first', 'err'); return; }
  localStorage.setItem('brava_api_url', url);
  toast('Testing…');
  fetch(`${url}?action=ping`)
    .then(r => r.json())
    .then(d => { if(d.ok) toast('✅ Connected!', 'ok'); else throw new Error(JSON.stringify(d)); })
    .catch(e => toast('❌ ' + e.message, 'err'));
}

// ── Init ──────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  // Register service worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // Hide splash
  setTimeout(() => document.getElementById('splash')?.classList.add('hide'), 1200);

  // Load settings
  renderSettings();

  // Search on enter / input debounce
  let debounce;
  document.getElementById('emp-search')?.addEventListener('input', e => {
    clearTimeout(debounce);
    const q = e.target.value.trim();
    if (q.length >= 2) debounce = setTimeout(() => searchEmployees(q), 400);
    else document.getElementById('emp-list').innerHTML =
      '<div class="empty"><div class="empty-icon">🔍</div><p>Search by name or employee number</p></div>';
  });

  // Navigate to dashboard
  navigate('dashboard');
});
