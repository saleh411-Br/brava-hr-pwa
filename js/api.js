// Brava HR — API Connector
// Set your deployed Google Apps Script Web App URL here:
const API_URL = localStorage.getItem('brava_api_url') || '';

const API = {
  async call(action, params = {}) {
    const url = localStorage.getItem('brava_api_url');
    if (!url) throw new Error('API not configured. Go to Settings and enter your Web App URL.');
    const res = await fetch(`${url}?action=${action}`, {
      method: 'POST',
      body: JSON.stringify({ action, ...params }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  },

  // ── Dashboard ──────────────────────────────────────────────
  async getDashboard()     { return this.call('getDashboardStats'); },
  async getExpiryAlerts()  { return this.call('getExpiryAlerts'); },
  async getOnVacation()    { return this.call('getOnVacation'); },

  // ── Employees ──────────────────────────────────────────────
  async searchEmployees(q) { return this.call('searchEmployees', { q }); },
  async getEmployee(empNo) { return this.call('getEmployee', { empNo }); },
  async saveEmployee(d)    { return this.call('saveEmployee', d); },

  // ── Records ────────────────────────────────────────────────
  async addVacation(d)     { return this.call('addVacation', d); },
  async addWarning(d)      { return this.call('addWarning', d); },
  async addLoan(d)         { return this.call('addLoan', d); },
  async addDeduction(d)    { return this.call('addDeduction', d); },
  async addSalaryAdj(d)    { return this.call('addSalaryAdj', d); },

  // ── New Hires ──────────────────────────────────────────────
  async getNewHires(status) { return this.call('getNewHires', { status }); },
  async saveNewHire(d)      { return this.call('saveNewHireApi', d); },
  async updateHireStatus(hireId, rowNum, status) {
    return this.call('updateHireStatusApi', { hireId, rowNum, status });
  },

  // ── Payroll ────────────────────────────────────────────────
  async generatePayroll(month, year)       { return this.call('generatePayroll', { month, year }); },
  async generateFoodAllowance(month, year) { return this.call('generateFoodAllowance', { month, year }); },
};
