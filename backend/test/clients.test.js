const assert = require('assert');
const fs = require('fs');
const http = require('http');
const os = require('os');
const path = require('path');

const dbPath = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'shiptivity-')), 'clients.db');
process.env.DB_PATH = dbPath;
process.env.NODE_ENV = 'test';

const Database = require('better-sqlite3');
const seedDb = new Database(dbPath);
const schema = fs.readFileSync(path.join(__dirname, '..', 'clients.sql'), 'utf8')
  .replace(/^DROP TABLE clients;\s*/, '');
seedDb.exec(schema);
seedDb.close();

const { app, db } = require('../build/server.js');
const server = app.listen(0);
const port = server.address().port;

const request = (id, body) => new Promise((resolve, reject) => {
  const requestData = JSON.stringify(body);
  const req = http.request({
    port,
    path: `/api/v1/clients/${id}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(requestData),
    },
  }, (res) => {
    let responseData = '';
    res.on('data', chunk => { responseData += chunk; });
    res.on('end', () => resolve({
      statusCode: res.statusCode,
      body: JSON.parse(responseData),
    }));
  });
  req.on('error', reject);
  req.end(requestData);
});

const priorities = (status) => db.prepare(
  'select priority from clients where status = ? order by priority',
).all(status).map(client => client.priority);

const tests = [
  async () => {
  const response = await request(1, { status: 'complete' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(priorities('in-progress'), [1, 2, 3, 4]);
  assert.deepEqual(priorities('complete'), [1, 2, 3, 4, 5]);
  assert.equal(db.prepare('select status from clients where id = 1').get().status, 'complete');
  },

  async () => {
  const response = await request(6, { status: 'in-progress', priority: 2 });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(
    db.prepare('select id from clients where status = ? order by priority').all('backlog'),
    [3, 7, 8, 9, 10, 12, 14, 18, 19, 20].map(id => ({ id })),
  );
  assert.deepEqual(
    db.prepare('select id from clients where status = ? order by priority').all('in-progress'),
    [4, 6, 5, 15, 16].map(id => ({ id })),
  );
  assert.deepEqual(priorities('backlog'), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(priorities('in-progress'), [1, 2, 3, 4, 5]);
  },

  async () => {
  const response = await request(5, { priority: 1 });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(
    db.prepare('select id from clients where status = ? order by priority').all('in-progress'),
    [5, 4, 6, 15, 16].map(id => ({ id })),
  );
  await request(4, { priority: 99 });
  assert.deepEqual(priorities('in-progress'), [1, 2, 3, 4, 5]);
  assert.equal(db.prepare('select id from clients where status = ? order by priority desc limit 1').get('in-progress').id, 4);
  },

  async () => {
  const before = db.prepare('select * from clients order by id').all();
  assert.equal((await request(1, { status: 'invalid' })).statusCode, 400);
  assert.equal((await request(1, { priority: 0 })).statusCode, 400);
  assert.equal((await request(999, { status: 'complete' })).statusCode, 400);
  assert.deepEqual(db.prepare('select * from clients order by id').all(), before);
  },
];

(async () => {
  try {
    for (const run of tests) {
      await run();
    }
    console.log(`passed ${tests.length} endpoint tests`);
  } finally {
    server.close();
    db.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
