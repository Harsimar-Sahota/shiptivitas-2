import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
app.use(express.json());

// ---- Simple JSON Database ----
const DB_FILE = path.join(process.cwd(), 'db.json');

function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ clients: [] }, null, 2));
  }
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ---- Health check ----
app.get('/', (req, res) => {
  res.status(200).send({
    message: 'SHIPTIVITY API running (JSON DB)',
  });
});

// ---- Get all clients (optional status filter) ----
app.get('/api/v1/clients', (req, res) => {
  const { status } = req.query;
  const db = readDB();

  let clients = db.clients;

  if (status) {
    clients = clients.filter(c => c.status === status);
  }

  // sort by priority (top → bottom)
  clients.sort((a, b) => a.priority - b.priority);

  res.status(200).send(clients);
});

// ---- Update client (status OR priority) ----
app.put('/api/v1/clients/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status, priority } = req.body;

  const db = readDB();
  const clients = db.clients;

  let client = clients.find(c => c.id === id);

  // if client does not exist, create it
  if (!client) {
    client = {
      id,
      status: status || 'backlog',
      priority: priority || clients.length + 1,
    };
    clients.push(client);
  }

  // update status
  if (status) {
    client.status = status;
  }

  // update priority (reorder swimlane)
  if (priority) {
    const sameLane = clients.filter(c => c.status === client.status && c.id !== id);

    sameLane.sort((a, b) => a.priority - b.priority);

    sameLane.splice(priority - 1, 0, client);

    sameLane.forEach((c, index) => {
      c.priority = index + 1;
    });
  }

  writeDB({ clients });

  res.status(200).send(clients);
});

// ---- Start server ----
app.listen(3001, () => {
  console.log('🚀 Shiptivity backend running on port 3001');
});
