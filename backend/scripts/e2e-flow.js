const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const port = Number(process.env.E2E_PORT || 5130);
const dbPath = path.join(os.tmpdir(), `expense-e2e-${Date.now()}.db`);
const apiBase = `http://localhost:${port}/api`;

const server = spawn(process.execPath, ['server.js'], {
  cwd: path.join(__dirname, '..'),
  env: {
    ...process.env,
    DATABASE_PATH: dbPath,
    PORT: String(port),
    JWT_SECRET: process.env.JWT_SECRET || 'e2e_test_secret',
    JWT_EXPIRE: '1h',
    NODE_ENV: 'test',
    BASE_CURRENCY: 'USD'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

const request = async (pathName, options = {}) => {
  const response = await fetch(`${apiBase}${pathName}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${pathName} failed: ${response.status} ${text}`);
  }

  return data;
};

const waitForServer = async () => {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(`http://localhost:${port}/`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  throw new Error('Backend did not become ready');
};

const run = async () => {
  await waitForServer();

  const email = `e2e-${Date.now()}@example.com`;
  const password = 'Password123';

  const register = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name: 'E2E User', email, password })
  });
  if (!register.success || !register.token) throw new Error('Register failed');

  const login = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  if (!login.success || !login.token) throw new Error('Login failed');

  const authHeaders = { Authorization: `Bearer ${login.token}` };

  const categories = await request('/categories', { headers: authHeaders });
  const expenseCategory = categories.data.find((category) => category.type === 'expense');
  if (!expenseCategory) throw new Error('No seeded expense category found');

  const created = await request('/transactions', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      type: 'expense',
      amount: 42.5,
      category: expenseCategory._id,
      description: 'E2E coffee',
      date: '2026-05-15'
    })
  });
  if (!created.success || created.data.description !== 'E2E coffee') throw new Error('Add expense failed');

  const edited = await request(`/transactions/${created.data._id}`, {
    method: 'PUT',
    headers: authHeaders,
    body: JSON.stringify({
      type: 'expense',
      amount: 55.75,
      category_id: expenseCategory._id,
      description: 'E2E edited coffee',
      date: '2026-05-15'
    })
  });
  if (!edited.success || edited.data.amount !== 55.75) throw new Error('Edit expense failed');

  const dashboardBeforeDelete = await request('/reports/summary', { headers: authHeaders });
  if (!dashboardBeforeDelete.success || dashboardBeforeDelete.data.expense < 55.75) {
    throw new Error('Dashboard summary before delete failed');
  }

  const filteredBeforeDelete = await request(
    `/transactions?type=expense&category=${expenseCategory._id}`,
    { headers: authHeaders }
  );
  if (filteredBeforeDelete.data.length < 1) throw new Error('Filter before delete failed');

  const deleted = await request(`/transactions/${created.data._id}`, {
    method: 'DELETE',
    headers: authHeaders
  });
  if (!deleted.success) throw new Error('Delete expense failed');

  const dashboardAfterDelete = await request('/reports/summary', { headers: authHeaders });
  if (!dashboardAfterDelete.success || dashboardAfterDelete.data.expense !== 0) {
    throw new Error('Dashboard summary after delete failed');
  }

  const filteredAfterDelete = await request(
    `/transactions?type=expense&category=${expenseCategory._id}`,
    { headers: authHeaders }
  );
  if (filteredAfterDelete.data.length !== 0) throw new Error('Filter after delete failed');

  const logout = await request('/auth/logout', {
    method: 'POST',
    headers: authHeaders
  });
  if (!logout.success) throw new Error('Logout failed');

  console.log('E2E flow passed: Register -> Login -> Add Expense -> Edit -> Delete -> Dashboard -> Filter -> Logout');
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    server.kill();
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
    }
  });
