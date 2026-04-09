// Brava HR PWA — Main App v3.0

// ── Hijri Converter (Umm Al-Qura approximation) ───────────
const HIJRI_EPOCH = 1948440; // Julian Day of 1 Muharram 1 AH
function hijriToGregorian(hy, hm, hd) {
  // Approximate conversion using Gregorian calendar
  const N = Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm
          - Math.floor((hm - 1) / 2) + hd + 1948440 - 385;
  let l = N + 68569, n = Math.floor(4 * l / 146097);
  l = l - Math.floor((146097 * n + 3) / 4);
  let i = Math.floor(4000 * (l + 1) / 1461001);
  l = l - Math.floor(1461 * i / 4) + 31;
  let j = Math.floor(80 * l / 2447);
  const day = l - Math.floor(2447 * j / 80);
  l = Math.floor(j / 11);
  const month = j + 2 - 12 * l;
  const year = 100 * (n - 49) + i + l;
  return { year, month, day };
}
function parseHijriInput(val) {
  // Accept: 1447/10/14 or 14/10/1447 or 14-10-1447
  if (!val) return null;
  const parts = val.split(/[\/\-\.]/);
  if (parts.length !== 3) return null;
  let hy, hm, hd;
  if (parseInt(parts[0]) > 1000) { hy=+parts[0]; hm=+parts[1]; hd=+parts[2]; }
  else { hd=+parts[0]; hm=+parts[1]; hy=+parts[2]; }
  if (!hy||!hm||!hd) return null;
  const g = hijriToGregorian(hy, hm, hd);
  return `${g.year}-${String(g.month).padStart(2,'0')}-${String(g.day).padStart(2,'0')}`;
}

// ── PIN LOCK ───────────────────────────────────────────────
const DEFAULT_PIN = '1234';
let _pinBuffer = '';
function getPin()    { return localStorage.getItem('brava_pin') || DEFAULT_PIN; }
function isUnlocked(){ return sessionStorage.getItem('brava_unlocked') === '1'; }
function lockApp()   { sessionStorage.removeItem('brava_unlocked'); showLock(); }
function showLock()  { document.getElementById('lockscreen').style.display='flex'; document.getElementById('app').style.display='none'; _pinBuffer=''; updateDots(); document.getElementById('pin-error').textContent=''; }
function showApp()   { document.getElementById('lockscreen').style.display='none'; document.getElementById('app').style.display='flex'; setTimeout(()=>document.getElementById('splash')?.classList.add('hide'),800); }
function pinInput(n) { if(_pinBuffer.length>=6) return; _pinBuffer+=String(n); updateDots(); if(_pinBuffer.length>=getPin().length) pinSubmit(); }
function pinClear()  { _pinBuffer=_pinBuffer.slice(0,-1); updateDots(); }
function updateDots(){ for(let i=0;i<4;i++){const d=document.getElementById('d'+i);if(d)d.classList.toggle('filled',i<_pinBuffer.length);} }
function pinSubmit() { if(_pinBuffer===getPin()){sessionStorage.setItem('brava_unlocked','1');showApp();navigate('dashboard');}else{document.getElementById('pin-error').textContent='Incorrect PIN. Try again.';_pinBuffer='';updateDots();setTimeout(()=>document.getElementById('pin-error').textContent='',2000);} }
function changePin() { const cur=document.getElementById('cur-pin').value,nw=document.getElementById('new-pin').value,conf=document.getElementById('conf-pin').value; if(cur!==getPin()){toast('Current PIN incorrect','err');return;} if(nw.length<4){toast('PIN must be 4+ digits','err');return;} if(!/^\d+$/.test(nw)){toast('Digits only','err');return;} if(nw!==conf){toast('PINs do not match','err');return;} localStorage.setItem('brava_pin',nw); ['cur-pin','new-pin','conf-pin'].forEach(id=>document.getElementById(id).value=''); toast('PIN updated','ok'); }

// ── TOAST / UI ─────────────────────────────────────────────
function toast(msg,type='',dur=3000){const t=document.getElementById('toast');t.textContent=msg;t.className='toast show '+type;clearTimeout(t._t);t._t=setTimeout(()=>t.className='toast',dur);}
function showLoader(id){const el=document.getElementById(id);if(el)el.innerHTML='<div class="loading"><div class="spinner"></div><p>Loading…</p></div>';}

// ── NAVIGATION ─────────────────────────────────────────────
const State={page:'dashboard',employees:[],allEmployees:[],hires:[],currentEmp:null,currentHire:null,hiresFilter:'All'};
function navigate(page){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  document.getElementById('page-'+page)?.classList.add('active');
  document.getElementById('nav-'+page)?.classList.add('active');
  State.page=page;
  const T={dashboard:'Dashboard',employees:'Employees',hires:'New Hires',payroll:'Payroll',settings:'Settings'};
  document.getElementById('topbar-title').textContent=T[page]||'Brava HR';
  if(page==='dashboard') loadDashboard();
  if(page==='employees') loadAllEmployees();
  if(page==='hires') loadHires('All');
  if(page==='payroll') renderPayrollPage();
  if(page==='settings') renderSettings();
}
function refreshPage(){if(State.page==='dashboard')loadDashboard();else if(State.page==='employees')loadAllEmployees();else if(State.page==='hires')loadHires(State.hiresFilter);}
function openPanel(id){document.getElementById(id)?.classList.add('open');}
function closePanel(id){document.getElementById(id)?.classList.remove('open');}

// ── HIJRI DATE INPUT HELPER ────────────────────────────────
// Converts a hijri input field value to gregorian before form submission
function setupHijriField(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  // Add a toggle button next to it
  const wrap = el.parentElement;
  const toggle = document.createElement('div');
  toggle.style.cssText = 'display:flex;gap:6px;margin-top:4px';
  toggle.innerHTML = `
    <select id="${inputId}-mode" style="font-size:11px;padding:3px 6px;border:1px solid var(--border);border-radius:4px;background:#fff">
      <option value="gregorian">Gregorian</option>
      <option value="hijri">Hijri (converts auto)</option>
    </select>
    <input id="${inputId}-hijri" placeholder="e.g. 1447/10/14" style="display:none;font-size:12px;padding:4px 8px;border:1px solid var(--border);border-radius:4px;flex:1" />
    <span id="${inputId}-converted" style="font-size:11px;color:var(--green);align-self:center"></span>`;
  wrap.appendChild(toggle);

  document.getElementById(`${inputId}-mode`).addEventListener('change', function() {
    const isHijri = this.value === 'hijri';
    el.style.display = isHijri ? 'none' : '';
    document.getElementById(`${inputId}-hijri`).style.display = isHijri ? '' : 'none';
  });

  document.getElementById(`${inputId}-hijri`).addEventListener('input', function() {
    const greg = parseHijriInput(this.value);
    const conv = document.getElementById(`${inputId}-converted`);
    if (greg) { el.value = greg; conv.textContent = '→ '+greg; }
    else { conv.textContent = 'Invalid format'; }
  });
}

// ── FILE UPLOAD WIDGET ─────────────────────────────────────
window.__uploadCallbacks={};
function createUploadWidget(cid,subFolder,onSuccess,accept){
  accept=accept||'image/*,.pdf';
  const c=document.getElementById(cid); if(!c) return;
  c.innerHTML=`<div class="upload-zone" id="${cid}-z"><div class="upload-icon">📎</div><div class="upload-label">Tap to upload</div><div class="upload-sub">Image or PDF · max 10MB</div><input type="file" id="${cid}-i" accept="${accept}" style="display:none"/></div><div class="upload-progress" id="${cid}-p" style="display:none"><div class="upload-progress-bar" id="${cid}-b"></div></div><div class="upload-result" id="${cid}-r" style="display:none"></div>`;
  document.getElementById(`${cid}-z`).onclick=()=>document.getElementById(`${cid}-i`).click();
  window.__uploadCallbacks[cid]=onSuccess;
  document.getElementById(`${cid}-i`).addEventListener('change',async function(e){
    const file=e.target.files[0]; if(!file) return;
    if(file.size>10*1024*1024){toast('File too large (max 10MB)','err');return;}
    const z=document.getElementById(`${cid}-z`),p=document.getElementById(`${cid}-p`),b=document.getElementById(`${cid}-b`),r=document.getElementById(`${cid}-r`);
    z.classList.add('uploading'); z.querySelector('.upload-label').textContent=`Uploading ${file.name}…`; p.style.display='block';
    let pct=0; const iv=setInterval(()=>{pct=Math.min(pct+6,85);b.style.width=pct+'%';},250);
    try{
      const result=await API.uploadFile(file,subFolder); clearInterval(iv); b.style.width='100%';
      setTimeout(()=>{
        p.style.display='none'; z.classList.remove('uploading'); z.classList.add('done');
        z.innerHTML=`<div class="upload-icon">✅</div><div class="upload-label">${result.fileName}</div><div class="upload-sub" style="color:var(--green)">Saved to Google Drive</div>`;
        r.style.display='flex'; r.innerHTML=`<a href="${result.viewUrl}" target="_blank" class="upload-link">🔗 View in Drive</a><button class="upload-change" onclick="createUploadWidget('${cid}','${subFolder}',window.__uploadCallbacks['${cid}'],'${accept}')">Change</button>`;
        if(onSuccess) onSuccess(result.viewUrl,result.fileName);
        toast(`✅ ${result.fileName} uploaded`,'ok');
      },300);
    }catch(err){clearInterval(iv);p.style.display='none';z.classList.remove('uploading');z.querySelector('.upload-label').textContent='Tap to upload';b.style.width='0';toast('❌ '+err.message,'err');}
  });
}
function initUploads(specs){specs.forEach(([id,folder,targetId])=>createUploadWidget(id,folder,targetId?(url)=>{const el=document.getElementById(targetId);if(el)el.value=url;}:null));}

// ── DASHBOARD ──────────────────────────────────────────────
async function loadDashboard(){
  if(!localStorage.getItem('brava_api_url')){document.getElementById('dash-stats').innerHTML='<div class="empty"><div class="empty-icon">⚙️</div><p>Configure API URL in Settings first.</p></div>';return;}
  showLoader('dash-stats');showLoader('dash-alerts');showLoader('dash-vac');
  try{
    const[stats,alerts,vac]=await Promise.all([API.getDashboard(),API.getExpiryAlerts(),API.getOnVacation()]);
    const br=Object.entries(stats.branches||{}).sort((a,b)=>b[1]-a[1]);
    document.getElementById('dash-stats').innerHTML=`<div class="stats-grid">
      <div class="stat-card" onclick="navigate('employees')"><div class="stat-value">${stats.total||0}</div><div class="stat-label">Total Employees</div></div>
      <div class="stat-card success" onclick="navigate('employees')"><div class="stat-value">${stats.active||0}</div><div class="stat-label">Active</div></div>
      <div class="stat-card info"><div class="stat-value">${stats.onLeave||0}</div><div class="stat-label">On Vacation</div></div>
      <div class="stat-card warn"><div class="stat-value">${stats.expiring||0}</div><div class="stat-label">Docs Expiring</div></div>
    </div>${br.length?`<div class="card" style="margin-top:0"><div class="card-header"><span class="card-title">By Branch</span></div>${br.map(([b,n])=>`<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--border)"><span style="font-size:13px;font-weight:600">${b}</span><span style="font-size:13px;color:var(--navy);font-weight:700">${n}</span></div>`).join('')}</div>`:''}`;
    document.getElementById('dash-vac').innerHTML=vac.length?vac.map(v=>`<div class="vac-item" onclick="quickEmpView('${v.empNo}')" style="cursor:pointer"><div><div class="vac-name">${v.name} <span style="font-size:11px;color:var(--muted);font-weight:400">${v.branch?'· '+v.branch:''}</span></div><div class="vac-meta">${v.type} · ${v.startDate} → ${v.endDate}</div></div><div class="vac-days">${v.daysLeft}d left</div></div>`).join(''):'<p style="color:var(--muted);font-size:13px;text-align:center;padding:12px">No one on vacation.</p>';
    // Alerts sorted by category
    const docOrder=["Iqama/ID","Passport","Contract","Labor License","Health Cert","Health Safety","Insurance"];
    alerts.sort((a,b)=>{const ai=docOrder.indexOf(a.doc),bi=docOrder.indexOf(b.doc);return ai===bi?a.days-b.days:ai-bi;});
    let alertHtml='',curDoc=null;
    alerts.forEach(a=>{
      if(a.doc!==curDoc){curDoc=a.doc;alertHtml+=`<div style="background:var(--navy);color:#fff;padding:4px 10px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-radius:4px;margin:8px 0 4px">📄 ${a.doc}</div>`;}
      const cls=a.days<0?'expired':a.days<=7?'critical':a.days<=15?'warning':'notice';
      const lbl=a.days<0?`${Math.abs(a.days)}d EXPIRED`:`${a.days}d`;
      alertHtml+=`<div class="alert-item" onclick="quickEmpView('${a.empNo}')"><div class="alert-dot ${cls}"></div><div class="alert-info"><div class="alert-name">${a.name}</div><div class="alert-doc">${a.expiry}</div></div><div class="alert-days ${cls}">${lbl}</div></div>`;
    });
    document.getElementById('dash-alerts').innerHTML=alerts.length?alertHtml:'<p style="color:var(--green);font-size:13px;text-align:center;padding:12px">✅ All documents up to date</p>';
  }catch(e){document.getElementById('dash-stats').innerHTML=`<div class="empty"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;}
}

// ── EMPLOYEES ──────────────────────────────────────────────
async function loadAllEmployees(){
  showLoader('emp-list');
  try{
    const results=await API.getAllEmployees();
    State.allEmployees=results;
    renderEmployeeList(results);
  }catch(e){document.getElementById('emp-list').innerHTML=`<div class="empty"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;}
}
function renderEmployeeList(list){
  const el=document.getElementById('emp-list');
  if(!list.length){el.innerHTML='<div class="empty"><div class="empty-icon">😕</div><p>No employees found</p></div>';return;}
  el.innerHTML=list.map((e,i)=>{const ini=(e.nameEn||'?').split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase();const sc=(e.status||'Active').replace(/\s/g,'');return `<div class="emp-card" onclick="openEmployeeByNo('${e.empNo}')"><div class="emp-avatar">${ini}</div><div style="flex:1;min-width:0"><div class="emp-name">${e.nameEn||'—'}<span class="emp-badge b-${sc}">${e.status}</span></div><div class="emp-meta">${e.empNo} · ${e.jobTitle||'—'} · ${e.branch||'—'}</div></div><div style="color:var(--muted);font-size:20px">›</div></div>`;}).join('');
}
function filterEmployees(q){
  if(!q||q.length<1){renderEmployeeList(State.allEmployees);return;}
  const ql=q.toLowerCase();
  renderEmployeeList(State.allEmployees.filter(e=>String(e.empNo).toLowerCase().includes(ql)||String(e.nameEn||'').toLowerCase().includes(ql)||String(e.nameAr||'').toLowerCase().includes(ql)));
}
async function openEmployeeByNo(empNo){
  openPanel('panel-emp'); document.getElementById('panel-emp-title').textContent='Loading…'; document.getElementById('panel-emp-body').innerHTML='<div class="loading"><div class="spinner"></div></div>';
  try{const data=await API.getEmployee(empNo);State.currentEmp=data;renderEmployeeDetail(data);}catch(e){document.getElementById('panel-emp-body').innerHTML=`<p style="color:red">${e.message}</p>`;}
}
async function quickEmpView(empNo){navigate('employees');document.getElementById('emp-search').value=empNo;filterEmployees(empNo);setTimeout(()=>openEmployeeByNo(empNo),300);}

function renderEmployeeDetail(e){
  document.getElementById('panel-emp-title').textContent=e.nameEn||'—';
  function days(d,n){const v=parseInt(n);const cls=isNaN(v)?'':v<0?'days-crit':v<=30?'days-warn':'days-ok';const lbl=isNaN(v)?'—':v<0?`${Math.abs(v)}d EXPIRED`:`${v}d`;return `<p>${d||'—'} <span class="days-pill ${cls}">${lbl}</span></p>`;}
  function val(v){return v||'—';}
  function sar(v){return v?`SAR ${parseFloat(v).toLocaleString()}`:'—';}
  function doc(label,url){const link=url&&url.indexOf('http')===0?`<a href="${url}" target="_blank" class="doc-view-btn">🔗 View</a>`:`<span class="doc-missing">Not uploaded</span>`;return `<div class="doc-row"><span class="doc-row-label">${label}</span>${link}</div>`;}
  const nm=(e.nameEn||'').replace(/'/g,'_');
  document.getElementById('panel-emp-body').innerHTML=`
    <div class="detail-section"><div class="detail-section-title">👤 Personal</div><div class="detail-grid">
      <div class="detail-item"><label>Emp No.</label><p style="font-family:monospace;font-weight:700">${val(e.empNo)}</p></div>
      <div class="detail-item"><label>Status</label><p><span class="emp-badge b-${(e.status||'Active').replace(/\s/g,'')}">${val(e.status)}</span></p></div>
      <div class="detail-item"><label>Name (EN)</label><p>${val(e.nameEn)}</p></div>
      <div class="detail-item"><label>Name (AR)</label><p dir="rtl">${val(e.nameAr)}</p></div>
      <div class="detail-item"><label>Nationality</label><p>${val(e.nationality)}</p></div>
      <div class="detail-item"><label>Gender</label><p>${val(e.gender)}</p></div>
      <div class="detail-item"><label>DOB</label><p>${val(e.dob)}</p></div>
      <div class="detail-item"><label>Phone</label><p><a href="tel:${e.phone}" style="color:var(--navy);font-weight:600">${val(e.phone)}</a></p></div>
      <div class="detail-item"><label>Email</label><p style="font-size:12px">${val(e.email)}</p></div>
    </div></div>
    <div class="detail-section"><div class="detail-section-title">📄 ID & Documents</div><div class="detail-grid">
      <div class="detail-item"><label>ID / Iqama No.</label><p style="font-weight:600">${val(e.idNo)}</p></div>
      <div class="detail-item"><label>ID Expiry</label>${days(e.idExpiry,e.idDays)}</div>
      <div class="detail-item"><label>Passport No.</label><p>${val(e.passportNo)}</p></div>
      <div class="detail-item"><label>Pass Expiry</label>${days(e.passExpiry,e.passDays)}</div>
    </div>
    ${doc('ID / Iqama Copy',e.copyId)}${doc('Passport Copy',e.copyPassport)}</div>
    <div class="detail-section"><div class="detail-section-title">💼 Employment</div><div class="detail-grid">
      <div class="detail-item"><label>Job Title</label><p>${val(e.jobTitle)}</p></div>
      <div class="detail-item"><label>Branch</label><p>${val(e.branch)}</p></div>
      <div class="detail-item"><label>Joining Date</label><p>${val(e.joiningDate)}</p></div>
      <div class="detail-item"><label>Service</label><p style="font-weight:600;color:var(--navy)">${val(e.serviceLength)}</p></div>
      <div class="detail-item"><label>Contract Type</label><p>${val(e.contractType)}</p></div>
      <div class="detail-item"><label>Contract Expiry</label>${days(e.contractExpiry,e.contractDays)}</div>
      <div class="detail-item"><label>Labor Expiry</label>${days(e.laborExpiry,e.laborDays)}</div>
    </div>
    ${doc('Contract Copy',e.copyContract)}</div>
    <div class="detail-section"><div class="detail-section-title">🏥 Health</div><div class="detail-grid">
      <div class="detail-item"><label>HC No.</label><p>${val(e.healthCertNo)}</p></div>
      <div class="detail-item"><label>HC Expiry</label>${days(e.healthCertExpiry,e.healthCertDays)}</div>
      <div class="detail-item"><label>Health Safety Expiry</label>${days(e.healthSafetyExpiry,e.healthSafetyDays)}</div>
    </div>
    ${doc('Health Certificate',e.copyHealthCert)}</div>
    <div class="detail-section"><div class="detail-section-title">🛡️ Insurance</div><div class="detail-grid">
      <div class="detail-item"><label>Policy No.</label><p>${val(e.insurancePolicyNo)}</p></div>
      <div class="detail-item"><label>Provider</label><p>${val(e.insuranceProvider)}</p></div>
      <div class="detail-item"><label>Expiry</label>${days(e.insuranceExpiry,e.insuranceDays)}</div>
      <div class="detail-item"><label>Dependants</label><p>${val(e.noDependants)}</p></div>
    </div></div>
    <div class="detail-section"><div class="detail-section-title">💰 Salary</div><div class="detail-grid">
      <div class="detail-item"><label>Basic</label><p style="font-weight:700">${sar(e.basicSalary)}</p></div>
      <div class="detail-item"><label>Housing</label><p>${sar(e.housingAllowance)}</p></div>
      <div class="detail-item"><label>Other Inc.</label><p>${sar(e.otherIncentives)}</p></div>
      <div class="detail-item"><label>Food Allow.</label><p>${sar(e.foodAllowance)}</p></div>
      <div class="detail-item"><label>GOSI</label><p style="color:var(--red)">${sar(e.gosiDeduction)}</p></div>
      <div class="detail-item"><label>Net Pay</label><p style="font-weight:700;color:var(--navy);font-size:15px">${sar(e.netPayment)}</p></div>
      <div class="detail-item"><label>OT Rate</label><p>${e.otRate?`SAR ${parseFloat(e.otRate).toFixed(2)}/hr`:'—'}</p></div>
      <div class="detail-item"><label>Transfer</label><p>${val(e.salaryTransferType)}</p></div>
      <div class="detail-item"><label>Bank</label><p>${val(e.bankName)}</p></div>
      <div class="detail-item full"><label>IBAN</label><p style="font-family:monospace;font-size:12px">${val(e.iban)}</p></div>
    </div></div>
    <div class="detail-section"><div class="detail-section-title">🏖️ Leave & Loans</div><div class="detail-grid">
      <div class="detail-item"><label>Vac Accrued</label><p>${val(e.vacAccrued)} days</p></div>
      <div class="detail-item"><label>Vac Remaining</label><p style="font-weight:700;color:var(--navy)">${val(e.vacRemaining)} days</p></div>
      <div class="detail-item"><label>Loan Balance</label><p style="color:${parseFloat(e.loanBalance)>0?'var(--red)':'var(--green)'};font-weight:600">${sar(e.loanBalance)}</p></div>
      <div class="detail-item"><label>EOS Accrual</label><p style="font-weight:700">${sar(e.eosAccrual)}</p></div>
    </div></div>
    <div class="detail-section"><div class="detail-section-title">🆘 Emergency</div><div class="detail-grid">
      <div class="detail-item"><label>Name</label><p>${val(e.emergencyContact)}</p></div>
      <div class="detail-item"><label>Phone</label><p><a href="tel:${e.emergencyPhone}" style="color:var(--navy)">${val(e.emergencyPhone)}</a></p></div>
    </div></div>
    ${e.city||e.shortAddress?`<div class="detail-section"><div class="detail-section-title">📍 Address</div><div class="detail-grid">
      ${e.shortAddress?`<div class="detail-item"><label>Short Address</label><p style="font-family:monospace;font-weight:700;letter-spacing:2px">${e.shortAddress}</p></div>`:''}
      ${e.city?`<div class="detail-item"><label>City</label><p>${e.city}</p></div>`:''}
      ${e.streetName?`<div class="detail-item"><label>Street</label><p>${e.streetName}</p></div>`:''}
      ${e.district?`<div class="detail-item"><label>District</label><p>${e.district}</p></div>`:''}
      ${e.postalCode?`<div class="detail-item"><label>Postal Code</label><p>${e.postalCode}</p></div>`:''}
    </div></div>`:''}
    ${(e.lastWorkingDate||e.eosConfirmed)?`<div class="detail-section" style="border-left:4px solid var(--red)"><div class="detail-section-title" style="color:var(--red)">📋 Offboarding & EOS</div><div class="detail-grid">
      <div class="detail-item"><label>Last Working Day</label><p style="font-weight:700;color:var(--red)">${val(e.lastWorkingDate)}</p></div>
      <div class="detail-item"><label>EOS Confirmed</label><p>${val(e.eosConfirmed)||'—'}</p></div>
      ${e.eosAmountPaid?`<div class="detail-item"><label>EOS Paid</label><p style="font-weight:700;color:var(--green)">${sar(e.eosAmountPaid)}</p></div>`:''}
      <div class="detail-item"><label>EOS Accrual</label><p style="font-weight:700">${sar(e.eosAccrual)}</p></div>
    </div>${doc('Termination Doc',e.terminationDoc)}</div>`:''}
    <div style="margin-top:20px"><div class="section-label">Quick Actions</div>
    <div class="btn-row" style="flex-wrap:wrap;gap:8px">
      <button class="btn btn-secondary" onclick="openAddVacation('${e.empNo}','${nm}')">🏖️ Leave</button>
      <button class="btn btn-secondary" onclick="openAddWarning('${e.empNo}','${nm}')">⚠️ Warning</button>
      <button class="btn btn-secondary" onclick="openAddDeduction('${e.empNo}','${nm}')">➖ Deduction</button>
      <button class="btn btn-secondary" onclick="openSalaryAdj('${e.empNo}','${nm}')">💰 Salary Adj</button>
      <button class="btn btn-secondary" onclick="openAddLoan('${e.empNo}','${nm}')">🏦 Loan</button>
      <button class="btn btn-secondary" onclick="openAddAbsence('${e.empNo}','${nm}')">🚫 Absence</button>
      <button class="btn btn-secondary" onclick="openAddHolidayRep('${e.empNo}','${nm}')">🎌 Holiday Rep</button>
      <button class="btn btn-secondary" onclick="openRecLoanDed('${e.empNo}','${nm}')">💳 Loan Ded</button>
      <button class="btn btn-danger" onclick="openSetLastDay('${e.empNo}','${nm}')">📋 Last Day</button>
    </div></div>
    <div style="margin-top:12px"><div class="section-label">Records</div>
    <button class="btn btn-secondary" style="width:100%" onclick="loadEmpRecords('${e.empNo}')">📂 View All Records</button>
    <div id="emp-records-panel" style="margin-top:10px"></div></div>`;
}

// ── EMPLOYEE RECORDS ───────────────────────────────────────
// ── Store current empNo for records refresh ──
let _currentRecordsEmpNo = '';

async function loadEmpRecords(empNo){
  _currentRecordsEmpNo = empNo;
  const panel=document.getElementById('emp-records-panel');
  panel.innerHTML='<div class="loading"><div class="spinner"></div></div>';
  try{
    const r=await API.getEmployeeRecords(empNo);
    let html='';

    // Helper: doc link button
    function docBtn(url){ return url&&url.indexOf('http')===0?`<a href="${url}" target="_blank" style="font-size:11px;padding:3px 8px;background:var(--cyan-lt);color:var(--navy);border-radius:4px;text-decoration:none;white-space:nowrap">🔗 Doc</a>`:''; }

    // Vacations
    if(r.vacations&&r.vacations.length){
      html+=`<div class="detail-section-title">🏖️ Vacations</div>`;
      r.vacations.forEach(v=>{
        html+=`<div class="rec-row">
          <div style="flex:1;min-width:0">
            <strong>${v.type}</strong> ${docBtn(v.doc)}<br>
            <span style="font-size:11px;color:var(--muted)">${v.start} → ${v.end} · ${v.days} days</span>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;align-items:center">
            <button class="rec-edit" onclick="openEditVacation(${v._row},'${empNo}','${(v.type||'').replace(/'/g,'_')}','${v.start}','${v.end}')">✏️</button>
            <button class="rec-del" onclick="deleteRecord('vacation',${v._row},'${empNo}')">🗑️</button>
          </div></div>`;
      });
    }

    // Warnings
    if(r.warnings&&r.warnings.length){
      html+=`<div class="detail-section-title" style="margin-top:12px">⚠️ Warnings</div>`;
      r.warnings.forEach(w=>{
        html+=`<div class="rec-row">
          <div style="flex:1;min-width:0">
            <strong>${w.date}</strong> ${docBtn(w.doc)}<br>
            <span style="font-size:11px;color:var(--muted)">${w.reason}</span>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;align-items:center">
            <button class="rec-del" onclick="deleteRecord('warning',${w._row},'${empNo}')">🗑️</button>
          </div></div>`;
      });
    }

    // Loans
    if(r.loans&&r.loans.length){
      html+=`<div class="detail-section-title" style="margin-top:12px">🏦 Loans</div>`;
      r.loans.forEach(l=>{
        html+=`<div class="rec-row">
          <div style="flex:1;min-width:0">
            <strong>${l.loanId}</strong> · SAR ${parseFloat(l.amount).toLocaleString()}<br>
            <span style="font-size:11px;color:var(--muted)">${l.months} months · <span style="color:${l.status==='Active'?'var(--amber)':'var(--green)'}">${l.status}</span> · ${l.date}</span>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;align-items:center">
            <button class="rec-del" onclick="deleteRecord('loan',${l._row},'${empNo}')">🗑️</button>
          </div></div>`;
      });
    }

    // Absences
    if(r.absences&&r.absences.length){
      html+=`<div class="detail-section-title" style="margin-top:12px">🚫 Absences</div>`;
      r.absences.forEach(a=>{
        html+=`<div class="rec-row">
          <div style="flex:1;min-width:0">
            <strong>${a.start} → ${a.end}</strong> · ${a.days} days<br>
            <span style="font-size:11px;color:var(--muted)">${a.reason}</span>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;align-items:center">
            <button class="rec-edit" onclick="openEditAbsence(${a._row},'${empNo}','${a.start}','${a.end}','${(a.reason||'').replace(/'/g,'_')}')">✏️</button>
            <button class="rec-del" onclick="deleteRecord('absence',${a._row},'${empNo}')">🗑️</button>
          </div></div>`;
      });
    }

    panel.innerHTML=html||'<p style="color:var(--muted);font-size:13px;text-align:center;padding:12px">No records found.</p>';
  }catch(e){panel.innerHTML=`<p style="color:red">${e.message}</p>`;}
}

// Open edit vacation panel pre-filled
function openEditVacation(row, empNo, type, start, end){
  document.getElementById('fvac-empno').value = empNo;
  document.getElementById('form-vac-title').textContent = 'Edit Leave Record';
  try{ document.getElementById('fvac-type').value = type; }catch(e){}
  // Convert D-MMM-YY to YYYY-MM-DD for date input
  function parseDate(d){ try{ return new Date(d).toISOString().split('T')[0]; }catch(e){ return ''; } }
  document.getElementById('fvac-start').value = parseDate(start);
  document.getElementById('fvac-end').value   = parseDate(end);
  openPanel('panel-form-vac');
}

// Open edit absence panel pre-filled
function openEditAbsence(row, empNo, start, end, reason){
  document.getElementById('fabs-empno').value = empNo;
  document.getElementById('form-abs-title').textContent = 'Edit Absence';
  function parseDate(d){ try{ return new Date(d).toISOString().split('T')[0]; }catch(e){ return ''; } }
  document.getElementById('fabs-start').value  = parseDate(start);
  document.getElementById('fabs-end').value    = parseDate(end);
  document.getElementById('fabs-reason').value = reason.replace(/_/g,"'");
  openPanel('panel-form-abs');
}

async function deleteRecord(type,row,empNo){
  if(!confirm(`Delete this ${type} record? This cannot be undone.`)) return;
  try{
    const r=await API.deleteRecord(type,row);
    if(r.error) throw new Error(r.error);
    toast('✅ Record deleted','ok');
    loadEmpRecords(empNo);
  }catch(e){toast('❌ '+e.message,'err');}
}

// ── ADD EMPLOYEE ───────────────────────────────────────────
function openAddEmployee(){
  document.getElementById('add-emp-form').reset(); openPanel('panel-add-emp');
  setTimeout(()=>{
    initUploads([['upload-ae-id','ID Documents','ae-copyId'],['upload-ae-passport','Passport Copies','ae-copyPassport'],['upload-ae-contract','Contracts','ae-copyContract'],['upload-ae-healthcert','Health Certificates','ae-copyHealthCert']]);
    ['ae-joiningDate','ae-laborExpiry','ae-healthCertExpiry','ae-healthSafetyExpiry','ae-insuranceExpiry'].forEach(setupHijriField);
  },100);
}
async function submitAddEmployee(){
  const g=id=>{const el=document.getElementById(id);return el?el.value.trim():'';};
  const d={nameEn:g('ae-nameEn'),nameAr:g('ae-nameAr'),gender:g('ae-gender'),nationality:g('ae-nationality'),idNo:g('ae-idNo'),copyId:g('ae-copyId'),copyPassport:g('ae-copyPassport'),copyContract:g('ae-copyContract'),copyHealthCert:g('ae-copyHealthCert'),passportNo:g('ae-passportNo'),dob:g('ae-dob'),jobTitle:g('ae-jobTitle'),branch:g('ae-branch'),contractLocation:g('ae-branch'),joiningDate:g('ae-joiningDate'),contractType:g('ae-contractType'),laborExpiry:g('ae-laborExpiry'),phone:g('ae-phone'),email:g('ae-email'),healthCertNo:g('ae-healthCertNo'),healthCertExpiry:g('ae-healthCertExpiry'),healthSafetyExpiry:g('ae-healthSafetyExpiry'),insurancePolicyNo:g('ae-insurancePolicyNo'),insuranceProvider:g('ae-insuranceProvider'),insuranceExpiry:g('ae-insuranceExpiry'),noDependants:g('ae-noDependants'),emergencyContactName:g('ae-emergencyContact'),emergencyContactNo:g('ae-emergencyPhone'),basicSalary:g('ae-basicSalary'),otherIncentives:g('ae-otherInc'),housingAllowance:g('ae-housing'),foodAllowance:g('ae-foodAllowance'),gosiDeduction:g('ae-gosi'),salaryTransferType:g('ae-transferType'),bankName:g('ae-bankName'),bankCode:g('ae-bankCode'),iban:g('ae-iban'),foodAllowanceEligible:g('ae-foodEligible'),foodAllowanceAmount:g('ae-foodAmount'),shortAddress:g('ae-shortAddress'),buildingNo:g('ae-buildingNo'),streetName:g('ae-streetName'),district:g('ae-district'),city:g('ae-city'),postalCode:g('ae-postalCode'),secondaryNo:g('ae-secondaryNo')};
  if(!d.nameEn){toast('Name (EN) required','err');return;}
  if(!d.joiningDate){toast('Joining Date required','err');return;}
  if(!d.basicSalary){toast('Basic Salary required','err');return;}
  const btn=document.getElementById('ae-submit'); btn.disabled=true; btn.textContent='Saving…';
  try{const r=await API.call('addEmployee',d);if(r.error)throw new Error(r.error);toast('✅ '+r.msg,'ok');closePanel('panel-add-emp');loadAllEmployees();}
  catch(e){toast('❌ '+e.message,'err');}
  finally{btn.disabled=false;btn.textContent='✅ Add Employee';}
}

// ── EDIT EMPLOYEE ──────────────────────────────────────────
function openEditEmployee(){
  const e=State.currentEmp; if(!e) return;
  const set=(id,val)=>{const el=document.getElementById(id);if(el&&val!=null)el.value=val;};
  set('ee-nameEn',e.nameEn);set('ee-nameAr',e.nameAr);set('ee-gender',e.gender);set('ee-nationality',e.nationality);
  set('ee-idNo',e.idNo);set('ee-passportNo',e.passportNo);set('ee-jobTitle',e.jobTitle);set('ee-branch',e.branch);
  set('ee-contractType',e.contractType);set('ee-phone',e.phone);set('ee-email',e.email);
  set('ee-basicSalary',e.basicSalary);set('ee-otherInc',e.otherIncentives);set('ee-housing',e.housingAllowance);
  set('ee-foodAllowance',e.foodAllowance);set('ee-gosi',e.gosiDeduction);set('ee-transferType',e.salaryTransferType);
  set('ee-bankName',e.bankName);set('ee-bankCode',e.bankCode);set('ee-iban',e.iban);
  set('ee-foodEligible',e.foodAllowanceEligible);set('ee-foodAmount',e.foodAllowanceAmount);
  set('ee-shortAddress',e.shortAddress);set('ee-buildingNo',e.buildingNo);set('ee-streetName',e.streetName);
  set('ee-district',e.district);set('ee-city',e.city);set('ee-postalCode',e.postalCode);set('ee-secondaryNo',e.secondaryNo);
  set('ee-emergencyContact',e.emergencyContact);set('ee-emergencyPhone',e.emergencyPhone);
  set('ee-insurancePolicyNo',e.insurancePolicyNo);set('ee-insuranceProvider',e.insuranceProvider);
  set('ee-noDependants',e.noDependants);set('ee-healthCertNo',e.healthCertNo);
  document.getElementById('edit-emp-title').textContent='Edit — '+e.nameEn;
  openPanel('panel-edit-emp');
  const folder=`Employees/${e.nameEn}`;
  setTimeout(()=>{
    initUploads([['upload-ee-id',folder+'/ID','ee-copyId'],['upload-ee-passport',folder+'/Passport','ee-copyPassport'],['upload-ee-contract',folder+'/Contract','ee-copyContract'],['upload-ee-healthcert',folder+'/HealthCert','ee-copyHealthCert']]);
    ['ee-laborExpiry','ee-insuranceExpiry','ee-healthCertExpiry','ee-healthSafetyExpiry'].forEach(setupHijriField);
  },100);
}
async function submitEditEmployee(){
  const e=State.currentEmp; if(!e) return;
  const g=id=>{const el=document.getElementById(id);return el?el.value.trim():'';};
  const d={row:e._row,empNo:e.empNo,status:e.status,joiningDate:e.joiningDate,contractLocation:e.branch,
    nameEn:g('ee-nameEn'),nameAr:g('ee-nameAr'),gender:g('ee-gender'),nationality:g('ee-nationality'),
    idNo:g('ee-idNo'),passportNo:g('ee-passportNo'),copyId:g('ee-copyId')||e.copyId,
    copyPassport:g('ee-copyPassport')||e.copyPassport,copyContract:g('ee-copyContract')||e.copyContract,
    copyHealthCert:g('ee-copyHealthCert')||e.copyHealthCert,
    jobTitle:g('ee-jobTitle'),branch:g('ee-branch'),contractType:g('ee-contractType'),
    phone:g('ee-phone'),email:g('ee-email'),basicSalary:g('ee-basicSalary'),
    otherIncentives:g('ee-otherInc'),housingAllowance:g('ee-housing'),foodAllowance:g('ee-foodAllowance'),
    gosiDeduction:g('ee-gosi'),salaryTransferType:g('ee-transferType'),
    bankName:g('ee-bankName'),bankCode:g('ee-bankCode'),iban:g('ee-iban'),
    foodAllowanceEligible:g('ee-foodEligible'),foodAllowanceAmount:g('ee-foodAmount'),
    shortAddress:g('ee-shortAddress'),buildingNo:g('ee-buildingNo'),streetName:g('ee-streetName'),
    district:g('ee-district'),city:g('ee-city'),postalCode:g('ee-postalCode'),secondaryNo:g('ee-secondaryNo'),
    emergencyContactName:g('ee-emergencyContact'),emergencyContactNo:g('ee-emergencyPhone'),
    insurancePolicyNo:g('ee-insurancePolicyNo'),insuranceProvider:g('ee-insuranceProvider'),
    noDependants:g('ee-noDependants'),healthCertNo:g('ee-healthCertNo'),
    laborExpiry:g('ee-laborExpiry'),insuranceExpiry:g('ee-insuranceExpiry'),
    healthCertExpiry:g('ee-healthCertExpiry'),healthSafetyExpiry:g('ee-healthSafetyExpiry')};
  const btn=document.getElementById('ee-submit'); btn.disabled=true; btn.textContent='Saving…';
  try{const r=await API.call('updateEmployee',d);if(r.error)throw new Error(r.error);toast('✅ Employee updated','ok');closePanel('panel-edit-emp');const fresh=await API.getEmployee(e.empNo);State.currentEmp=fresh;renderEmployeeDetail(fresh);}
  catch(e2){toast('❌ '+e2.message,'err');}
  finally{btn.disabled=false;btn.textContent='💾 Save Changes';}
}

// ── QUICK ACTIONS ──────────────────────────────────────────
function openAddVacation(empNo,name){document.getElementById('form-vac').reset();document.getElementById('fvac-empno').value=empNo;document.getElementById('form-vac-title').textContent=`Leave — ${name}`;openPanel('panel-form-vac');setTimeout(()=>initUploads([['upload-vac-doc',`Employees/${name}/Leave`,'fvac-doc'],['upload-vac-visa',`Employees/${name}/Exit Visa`,'fvac-exitVisaDoc'],['upload-vac-ticket',`Employees/${name}/Tickets`,'fvac-exitVisaTicket']]),100);}
async function submitVacation(){const g=id=>document.getElementById(id)?.value?.trim()||'';const d={empNo:g('fvac-empno'),vacType:g('fvac-type'),startDate:g('fvac-start'),endDate:g('fvac-end'),ticketBy:g('fvac-ticketBy'),ticketCost:g('fvac-ticketCost'),exitVisa:g('fvac-exitVisa'),docLink:g('fvac-doc'),exitVisaDoc:g('fvac-exitVisaDoc'),exitVisaTicket:g('fvac-exitVisaTicket')};if(!d.vacType||!d.startDate||!d.endDate){toast('Fill required fields','err');return;}try{const r=await API.addVacation(d);toast(r.msg||'Leave recorded','ok');closePanel('panel-form-vac');}catch(e){toast(e.message,'err');}}

function openAddWarning(empNo,name){document.getElementById('form-warn').reset();document.getElementById('fwarn-empno').value=empNo;document.getElementById('form-warn-title').textContent=`Warning — ${name}`;openPanel('panel-form-warn');setTimeout(()=>initUploads([['upload-warn-doc',`Employees/${name}/Warnings`,'fwarn-doc']]),100);}
async function submitWarning(){const g=id=>document.getElementById(id)?.value?.trim()||'';const d={empNo:g('fwarn-empno'),warningDate:g('fwarn-date'),reason:g('fwarn-reason'),docLink:g('fwarn-doc')};if(!d.warningDate||!d.reason){toast('Fill required fields','err');return;}try{const r=await API.addWarning(d);toast(r.msg||'Warning recorded','ok');closePanel('panel-form-warn');}catch(e){toast(e.message,'err');}}

function openAddDeduction(empNo,name){document.getElementById('form-ded').reset();document.getElementById('fded-empno').value=empNo;document.getElementById('fded-date').value=new Date().toISOString().split('T')[0];document.getElementById('form-ded-title').textContent=`Deduction — ${name}`;openPanel('panel-form-ded');}
async function submitDeduction(){const g=id=>document.getElementById(id)?.value?.trim()||'';const d={empNo:g('fded-empno'),deductionDate:g('fded-date'),amount:g('fded-amount'),category:g('fded-cat'),notes:g('fded-notes')};if(!d.amount||parseFloat(d.amount)<=0){toast('Enter valid amount','err');return;}try{const r=await API.addDeduction(d);toast(r.msg||'Deduction saved','ok');closePanel('panel-form-ded');}catch(e){toast(e.message,'err');}}

function openSalaryAdj(empNo,name){document.getElementById('form-sal').reset();document.getElementById('fsal-empno').value=empNo;document.getElementById('fsal-date').value=new Date().toISOString().split('T')[0];document.getElementById('form-sal-title').textContent=`Salary Adj — ${name}`;openPanel('panel-form-sal');}
async function submitSalaryAdj(){const g=id=>document.getElementById(id)?.value?.trim()||'';const d={empNo:g('fsal-empno'),adjDate:g('fsal-date'),adjType:g('fsal-type'),field:g('fsal-field'),amount:g('fsal-amount'),notes:g('fsal-notes')};if(!d.amount||parseFloat(d.amount)<=0){toast('Enter valid amount','err');return;}try{const r=await API.addSalaryAdj(d);toast(r.msg||'Saved','ok');closePanel('panel-form-sal');}catch(e){toast(e.message,'err');}}

function openAddLoan(empNo,name){document.getElementById('form-loan').reset();document.getElementById('floan-empno').value=empNo;document.getElementById('floan-date').value=new Date().toISOString().split('T')[0];document.getElementById('form-loan-title').textContent=`Loan — ${name}`;openPanel('panel-form-loan');}
async function submitLoan(){const g=id=>document.getElementById(id)?.value?.trim()||'';const d={empNo:g('floan-empno'),loanDate:g('floan-date'),loanAmount:g('floan-amount'),months:g('floan-months'),notes:g('floan-notes')};if(!d.loanAmount||parseFloat(d.loanAmount)<=0){toast('Enter valid amount','err');return;}if(!d.months){toast('Enter months','err');return;}try{const r=await API.addLoan(d);toast(r.msg||'Loan recorded','ok');closePanel('panel-form-loan');}catch(e){toast(e.message,'err');}}

function openAddAbsence(empNo,name){document.getElementById('form-abs').reset();document.getElementById('fabs-empno').value=empNo;document.getElementById('form-abs-title').textContent=`Absence — ${name}`;openPanel('panel-form-abs');}
async function submitAbsence(){const g=id=>document.getElementById(id)?.value?.trim()||'';const d={empNo:g('fabs-empno'),startDate:g('fabs-start'),endDate:g('fabs-end'),reason:g('fabs-reason')};if(!d.startDate||!d.endDate){toast('Fill dates','err');return;}try{const r=await API.addAbsence(d);toast(r.msg||'Absence recorded','ok');closePanel('panel-form-abs');}catch(e){toast(e.message,'err');}}

function openAddHolidayRep(empNo,name){document.getElementById('form-holrep').reset();document.getElementById('fholrep-empno').value=empNo;document.getElementById('form-holrep-title').textContent=`Holiday Replacement — ${name}`;openPanel('panel-form-holrep');}
async function submitHolidayRep(){const g=id=>document.getElementById(id)?.value?.trim()||'';const d={empNo:g('fholrep-empno'),holType:g('fholrep-type'),scenario:g('fholrep-scenario'),holStart:g('fholrep-start'),holEnd:g('fholrep-end')};if(!d.holStart||!d.holEnd){toast('Fill dates','err');return;}try{const r=await API.addHolidayRep(d);toast(r.msg||'Recorded','ok');closePanel('panel-form-holrep');}catch(e){toast(e.message,'err');}}

async function openRecLoanDed(empNo,name){
  document.getElementById('form-loanded').reset();
  document.getElementById('floanded-empno').value=empNo;
  document.getElementById('floanded-date').value=new Date().toISOString().split('T')[0];
  document.getElementById('form-loanded-title').textContent=`Loan Deduction — ${name}`;
  // Load employee's active loans
  const sel=document.getElementById('floanded-loanselect');
  sel.innerHTML='<option value="">Loading loans…</option>';
  document.getElementById('floanded-amount').value='';
  document.getElementById('floanded-nextmonth').textContent='';
  try{
    const loans=await API.getEmployeeLoans(empNo);
    if(!loans.length){
      sel.innerHTML='<option value="">No active loans found</option>';
    } else {
      sel.innerHTML='<option value="">— Select Loan —</option>'+
        loans.map(l=>`<option value="${l.loanId}" data-amount="${l.nextAmount}" data-month="${l.nextMonth}">
          ${l.loanId} · SAR ${parseFloat(l.amount).toLocaleString()} · ${l.pendingCount} payments left
        </option>`).join('');
    }
  }catch(e){sel.innerHTML='<option value="">Error loading loans</option>';}
  openPanel('panel-form-loanded');
}
function onLoanSelect(){
  const sel=document.getElementById('floanded-loanselect');
  const opt=sel.options[sel.selectedIndex];
  const amt=opt?.dataset?.amount;
  const month=opt?.dataset?.month;
  if(amt) document.getElementById('floanded-amount').value=amt;
  if(month) document.getElementById('floanded-nextmonth').textContent=`Next deduction: ${month}`;
  else document.getElementById('floanded-nextmonth').textContent='';
  document.getElementById('floanded-loanid').value=sel.value;
}
async function submitLoanDed(){
  const g=id=>document.getElementById(id)?.value?.trim()||'';
  const d={empNo:g('floanded-empno'),loanId:g('floanded-loanid'),actualAmount:g('floanded-amount'),dedDate:g('floanded-date')};
  if(!d.loanId){toast('Select a loan','err');return;}
  if(!d.actualAmount||parseFloat(d.actualAmount)<=0){toast('Enter amount','err');return;}
  try{const r=await API.addLoanDeduction(d);toast(r.msg||'Deduction recorded','ok');closePanel('panel-form-loanded');}
  catch(e){toast(e.message,'err');}
}

function openSetLastDay(empNo,name){document.getElementById('form-lastday').reset();document.getElementById('flastday-empno').value=empNo;document.getElementById('form-lastday-title').textContent=`Last Day — ${name}`;openPanel('panel-form-lastday');setTimeout(()=>initUploads([['upload-lastday-doc',`Employees/${name}/Offboarding`,'flastday-doc'],['upload-lastday-visa',`Employees/${name}/Final Exit`,'flastday-visadoc'],['upload-lastday-ticket',`Employees/${name}/Tickets`,'flastday-ticket']]),100);}
async function submitLastDay(){const g=id=>document.getElementById(id)?.value?.trim()||'';const d={empNo:g('flastday-empno'),lastWorkingDate:g('flastday-date'),exitReason:g('flastday-reason'),finalExitRequired:g('flastday-finalexit'),terminationDoc:g('flastday-doc'),finalExitVisaDoc:g('flastday-visadoc'),finalExitTicket:g('flastday-ticket')};if(!d.lastWorkingDate){toast('Date required','err');return;}try{const r=await API.call('setLastDay',d);toast(r.msg||'Last day set','ok');closePanel('panel-form-lastday');}catch(e){toast(e.message,'err');}}

// ── NEW HIRES ──────────────────────────────────────────────
async function loadHires(filter){
  State.hiresFilter=filter;
  document.querySelectorAll('#hire-chips .chip').forEach(c=>c.classList.toggle('active',c.dataset.status===filter));
  showLoader('hire-list');
  try{
    const all=await API.getNewHires(); State.hires=all;
    const list=filter==='All'?all:all.filter(h=>h.status===filter);
    const el=document.getElementById('hire-list');
    if(!list.length){el.innerHTML='<div class="empty"><div class="empty-icon">📋</div><p>No hires found</p></div>';return;}
    const C={Active:'#e3f2fd',Converted:'#e8f5e9',Rejected:'#ffebee','No Show':'#fff3e0'};
    const T={Active:'#1565c0',Converted:'#2e7d32',Rejected:'#c62828','No Show':'#e65100'};
    el.innerHTML=list.map((h)=>`<div class="emp-card" onclick="openHire(${State.hires.indexOf(h)})"><div class="emp-avatar" style="background:${T[h.status]||'#1a237e'}">${(h.nameEn||'?')[0].toUpperCase()}</div><div style="flex:1;min-width:0"><div class="emp-name">${h.nameEn}<span class="emp-badge" style="background:${C[h.status]};color:${T[h.status]}">${h.status}</span></div><div class="emp-meta">${h.hireType} · ${h.natType} · ${h.position||'—'}</div></div><div style="color:var(--muted);font-size:20px">›</div></div>`).join('');
  }catch(e){document.getElementById('hire-list').innerHTML=`<div class="empty"><div class="empty-icon">❌</div><p>${e.message}</p></div>`;}
}

function openHire(idx){
  const h=State.hires[idx]; if(!h) return; State.currentHire=h;
  document.getElementById('panel-hire-title').textContent=h.nameEn||'New Hire';
  const C={Active:'#e3f2fd',Converted:'#e8f5e9',Rejected:'#ffebee','No Show':'#fff3e0'};
  const T={Active:'#1565c0',Converted:'#2e7d32',Rejected:'#c62828','No Show':'#e65100'};
  let actions='';
  if(h.status==='Active'){
    actions=`<button class="btn btn-amber" onclick="changeHireStatusApp('No Show')">❌ No Show</button>
    <button class="btn btn-danger" onclick="changeHireStatusApp('Rejected')">✖ Rejected</button>
    <button class="btn btn-success" onclick="openConvertHire()">👤 Convert to Employee</button>`;
  } else if(h.status==='Rejected'||h.status==='No Show'){
    actions=`<button class="btn btn-secondary" onclick="changeHireStatusApp('Active')">↺ Reactivate</button>`;
  } else if(h.status==='Converted'){
    actions=`<div style="background:var(--green-lt);color:var(--green);padding:10px;border-radius:8px;font-weight:600;text-align:center">✅ Converted — Emp No: ${h.empNo}</div>`;
  }
  document.getElementById('panel-hire-body').innerHTML=`
    <div class="detail-section"><div class="detail-section-title">Hire Info</div><div class="detail-grid">
      <div class="detail-item"><label>Hire ID</label><p style="font-family:monospace">${h.hireId}</p></div>
      <div class="detail-item"><label>Status</label><p><span class="emp-badge" style="background:${C[h.status]};color:${T[h.status]}">${h.status}</span></p></div>
      <div class="detail-item"><label>Hire Type</label><p>${h.hireType}</p></div>
      <div class="detail-item"><label>Nationality</label><p>${h.nationality||'—'}</p></div>
      <div class="detail-item"><label>Position</label><p>${h.position||'—'}</p></div>
      <div class="detail-item"><label>Work Location</label><p>${h.workLocation||'—'}</p></div>
      <div class="detail-item"><label>Phone</label><p><a href="tel:${h.phone}" style="color:var(--navy)">${h.phone||'—'}</a></p></div>
      <div class="detail-item"><label>Basic Salary</label><p>${h.basicSalary?'SAR '+parseFloat(h.basicSalary).toLocaleString():'—'}</p></div>
      <div class="detail-item"><label>Contract Type</label><p>${h.contractType||'—'}</p></div>
      <div class="detail-item"><label>Joining Date</label><p>${h.joiningDate||'Not set'}</p></div>
    </div></div>
    ${h.status!=='Converted'?`<div class="section-label">Actions</div><div class="btn-row" style="flex-wrap:wrap;gap:8px">${actions}</div>`:actions}`;
  openPanel('panel-hire');
}

function openConvertHire(){
  const h=State.currentHire;
  document.getElementById('convert-hire-name').textContent=h.nameEn;
  document.getElementById('convert-joining').value=h.joiningDate?new Date(h.joiningDate.replace(/(\d+)-(\w+)-(\d+)/,'$3 $2 20$1')).toISOString().split('T')[0]:'';
  openPanel('panel-convert-hire');
}
async function submitConvertHire(){
  const h=State.currentHire;
  const joiningDate=document.getElementById('convert-joining').value;
  if(!joiningDate){toast('Joining date required','err');return;}
  if(!confirm(`Convert ${h.nameEn} to employee with joining date ${joiningDate}?`)) return;
  try{
    const r=await API.call('convertHire',{hireId:h.hireId,joiningDate});
    if(r.error)throw new Error(r.error);
    toast(`✅ Converted! Emp No: ${r.empNo}`,'ok');
    h.status='Converted';h.empNo=r.empNo;
    closePanel('panel-convert-hire');
    openHire(State.hires.indexOf(h));
    loadHires(State.hiresFilter);
  }catch(e){toast(e.message,'err');}
}

async function changeHireStatusApp(ns){const h=State.currentHire;if(!confirm(`Change ${h.nameEn} to "${ns}"?`))return;try{await API.updateHireStatus(h.hireId,h._row,ns);toast(`Status → ${ns}`,'ok');h.status=ns;openHire(State.hires.indexOf(h));loadHires(State.hiresFilter);}catch(e){toast(e.message,'err');}}

function openAddHire(){
  document.getElementById('add-hire-form').reset();
  ['ah-nat-row','ah-nonsaudi-fields','ah-foreign-fields'].forEach(id=>document.getElementById(id).style.display='none');
  openPanel('panel-add-hire');
  setTimeout(()=>initUploads([['upload-ah-id','New Hires/ID','ah-idCopy'],['upload-ah-contract','New Hires/Contracts','ah-contractCopy'],['upload-ah-qiwa','New Hires/Qiwa','ah-qiwaContract'],['upload-ah-iqama','New Hires/Iqama','ah-iqamaDoc'],['upload-ah-visa','New Hires/Visa','ah-visaCopy'],['upload-ah-outsource','New Hires/Outsource','ah-outsourceCopy']]),100);
}
function onHireTypeChange(){const ht=document.getElementById('ah-hireType').value,nt=document.getElementById('ah-natType').value;document.getElementById('ah-nat-row').style.display=(nt==='Non-Saudi'||ht==='Foreign Hire')?'block':'none';document.getElementById('ah-nonsaudi-fields').style.display=nt==='Non-Saudi'?'block':'none';document.getElementById('ah-foreign-fields').style.display=ht==='Foreign Hire'?'block':'none';}
async function submitAddHire(){
  const g=id=>document.getElementById(id)?.value?.trim()||'';
  const d={hireType:g('ah-hireType'),natType:g('ah-natType'),nameEn:g('ah-nameEn'),nameAr:g('ah-nameAr'),nationality:g('ah-natType')==='Saudi'?'Saudi':g('ah-nationality'),idNo:g('ah-idNo'),idCopy:g('ah-idCopy'),position:g('ah-position'),workLocation:g('ah-workLocation'),phone:g('ah-phone'),email:g('ah-email'),contractType:g('ah-contractType'),contractCopy:g('ah-contractCopy'),basicSalary:g('ah-basicSalary'),otherAllowance:g('ah-otherAllowance'),grossSalary:(parseFloat(g('ah-basicSalary'))||0)+(parseFloat(g('ah-otherAllowance'))||0),medicalInsurance:g('ah-medicalIns'),iqamaTransferCost:g('ah-iqamaCost'),otherCosts:g('ah-otherCosts'),qiwaContract:g('ah-qiwaContract'),iqamaTransferDoc:g('ah-iqamaDoc'),visaCopy:g('ah-visaCopy'),visaCost:g('ah-visaCost'),chamberCost:g('ah-chamberCost'),mofCost:g('ah-mofCost'),outsourceName:g('ah-outsourceName'),outsourceAuth:g('ah-outsourceAuth'),outsourceAuthCost:g('ah-outsourceAuthCost'),outsourceAuthCopy:g('ah-outsourceCopy'),notes:g('ah-notes')};
  if(!d.nameEn){toast('Name required','err');return;}if(!d.position){toast('Position required','err');return;}if(!d.phone){toast('Phone required','err');return;}
  const btn=document.getElementById('ah-submit');btn.disabled=true;btn.textContent='Saving…';
  try{const r=await API.call('saveNewHireApi',d);if(r.error)throw new Error(r.error);toast('✅ '+r.msg,'ok');closePanel('panel-add-hire');loadHires('All');}
  catch(e){toast('❌ '+e.message,'err');}
  finally{btn.disabled=false;btn.textContent='✅ Add New Hire';}
}

// ── PAYROLL ────────────────────────────────────────────────
function renderPayrollPage(){
  const months=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const now=new Date();
  const mO=months.map((m,i)=>`<option value="${i+1}" ${i===now.getMonth()?'selected':''}>${m}</option>`).join('');
  const yO=[-1,0,1].map(d=>{const y=now.getFullYear()+d;return `<option value="${y}" ${d===0?'selected':''}>${y}</option>`;}).join('');
  document.getElementById('page-payroll').innerHTML=`
    <div class="card"><div class="card-header"><span class="card-title">💳 WPS Payroll CSV</span></div>
      <div class="form-row"><div class="form-group"><label>Month</label><select id="pay-month">${mO}</select></div><div class="form-group"><label>Year</label><select id="pay-year">${yO}</select></div></div>
      <button class="btn btn-primary" onclick="genPayroll()">⬇️ Generate WPS CSV</button></div>
    <div class="card"><div class="card-header"><span class="card-title">🍽️ Food Allowance CSV</span></div>
      <div class="form-row"><div class="form-group"><label>Month</label><select id="food-month">${mO}</select></div><div class="form-group"><label>Year</label><select id="food-year">${yO}</select></div></div>
      <button class="btn btn-primary" onclick="genFood()">⬇️ Generate Food CSV</button></div>
    <div id="payroll-result"></div>`;
}
async function genPayroll(){const m=parseInt(document.getElementById('pay-month').value),y=parseInt(document.getElementById('pay-year').value);document.getElementById('payroll-result').innerHTML='<div class="loading"><div class="spinner"></div><p>Generating…</p></div>';try{const r=await API.generatePayroll(m,y);if(r.error)throw new Error(r.error);downloadCSV(r.csv,r.filename);document.getElementById('payroll-result').innerHTML=`<div style="background:var(--green-lt);color:var(--green);padding:12px;border-radius:8px;font-weight:600;text-align:center">✅ ${r.filename} — ${r.rows} employees</div>`;}catch(e){document.getElementById('payroll-result').innerHTML=`<div style="background:var(--red-lt);color:var(--red);padding:12px;border-radius:8px">${e.message}</div>`;}}
async function genFood(){const m=parseInt(document.getElementById('food-month').value),y=parseInt(document.getElementById('food-year').value);document.getElementById('payroll-result').innerHTML='<div class="loading"><div class="spinner"></div><p>Generating…</p></div>';try{const r=await API.generateFoodAllowance(m,y);if(r.error)throw new Error(r.error);downloadCSV(r.csv,r.filename);document.getElementById('payroll-result').innerHTML=`<div style="background:var(--green-lt);color:var(--green);padding:12px;border-radius:8px;font-weight:600;text-align:center">✅ ${r.filename} — ${r.rows} employees</div>`;}catch(e){document.getElementById('payroll-result').innerHTML=`<div style="background:var(--red-lt);color:var(--red);padding:12px;border-radius:8px">${e.message}</div>`;}}
function downloadCSV(csv,filename){const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);}

// ── SETTINGS ───────────────────────────────────────────────
function renderSettings(){document.getElementById('settings-url').value=localStorage.getItem('brava_api_url')||'';}
function saveSettings(){const url=document.getElementById('settings-url').value.trim();if(!url){toast('Enter URL','err');return;}localStorage.setItem('brava_api_url',url);toast('✅ Settings saved','ok');}
function testConnection(){const url=document.getElementById('settings-url').value.trim();if(!url){toast('Enter URL first','err');return;}localStorage.setItem('brava_api_url',url);toast('Testing…');fetch(`${url}?action=ping`).then(r=>r.json()).then(d=>{if(d.ok)toast('✅ Connected! v'+d.version,'ok');else throw new Error(JSON.stringify(d));}).catch(e=>toast('❌ '+e.message,'err'));}
async function runRefreshAll(){toast('Refreshing…');try{const r=await API.call('refreshAll');toast(r.msg||'✅ Done','ok');}catch(e){toast('❌ '+e.message,'err');}}
async function fixMissingHeaders(){toast('Fixing headers…');try{const r=await API.call('fixHeaders');toast(r.msg||'✅ Done','ok');}catch(e){toast('❌ '+e.message,'err');}}

// ── INIT ───────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded',()=>{
  if('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(()=>{});
  if(isUnlocked()){document.getElementById('lockscreen').style.display='none';showApp();navigate('dashboard');}
  else{document.getElementById('splash').style.display='none';document.getElementById('app').style.display='none';}
  let deb;
  document.getElementById('emp-search')?.addEventListener('input',e=>{clearTimeout(deb);deb=setTimeout(()=>filterEmployees(e.target.value.trim()),200);});
});
