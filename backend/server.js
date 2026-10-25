import express from 'express';
import Database from 'better-sqlite3';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  return res.status(200).send({'message': 'SHIPTIVITY API. Read documentation to see API docs'});
});

// We are keeping one connection alive for the rest of the life application for simplicity
const db = new Database(process.env.DB_PATH || './clients.db');

// Don't forget to close connection when server gets terminated
const closeDb = () => db.close();
process.on('SIGTERM', closeDb);
process.on('SIGINT', closeDb);

/**
 * Validate id input
 * @param {any} id
 */
const validateId = (id) => {
  if (!Number.isInteger(id) || id < 1) {
    return {
      valid: false,
      messageObj: {
      'message': 'Invalid id provided.',
      'long_message': 'Id can only be integer.',
      },
    };
  }
  const client = db.prepare('select * from clients where id = ? limit 1').get(id);
  if (!client) {
    return {
      valid: false,
      messageObj: {
      'message': 'Invalid id provided.',
      'long_message': 'Cannot find client with that id.',
      },
    };
  }
  return {
    valid: true,
  };
};

/**
 * Validate priority input
 * @param {any} priority
 */
const validatePriority = (priority) => {
  if (!Number.isInteger(priority) || priority < 1) {
    return {
      valid: false,
      messageObj: {
      'message': 'Invalid priority provided.',
      'long_message': 'Priority can only be positive integer.',
      },
    };
  }
  return {
    valid: true,
  };
};

const validStatuses = ['backlog', 'in-progress', 'complete'];

/**
 * Get all of the clients. Optional filter 'status'
 * GET /api/v1/clients?status={status} - list all clients, optional parameter status: 'backlog' | 'in-progress' | 'complete'
 */
app.get('/api/v1/clients', (req, res) => {
  const status = req.query.status;
  if (status) {
    // status can only be either 'backlog' | 'in-progress' | 'complete'
    if (status !== 'backlog' && status !== 'in-progress' && status !== 'complete') {
      return res.status(400).send({
        'message': 'Invalid status provided.',
        'long_message': 'Status can only be one of the following: [backlog | in-progress | complete].',
      });
    }
    const clients = db.prepare('select * from clients where status = ?').all(status);
    return res.status(200).send(clients);
  }
  const statement = db.prepare('select * from clients');
  const clients = statement.all();
  return res.status(200).send(clients);
});

/**
 * Get a client based on the id provided.
 * GET /api/v1/clients/{client_id} - get client by id
 */
app.get('/api/v1/clients/:id', (req, res) => {
  const id = Number(req.params.id);
  const { valid, messageObj } = validateId(id);
  if (!valid) {
    return res.status(400).send(messageObj);
  }
  return res.status(200).send(db.prepare('select * from clients where id = ?').get(id));
});

/**
 * Update client information based on the parameters provided.
 * When status is provided, the client status will be changed
 * When priority is provided, the client priority will be changed with the rest of the clients accordingly
 * Note that priority = 1 means it has the highest priority (should be on top of the swimlane).
 * No client on the same status should not have the same priority.
 * This API should return list of clients on success
 *
 * PUT /api/v1/clients/{client_id} - change the status of a client
 *    Data:
 *      status (optional): 'backlog' | 'in-progress' | 'complete',
 *      priority (optional): integer,
 *
 */
app.put('/api/v1/clients/:id', (req, res) => {
  const id = Number(req.params.id);
  const { valid, messageObj } = validateId(id);
  if (!valid) {
    return res.status(400).send(messageObj);
  }

  const body = req.body || {};
  const hasStatus = Object.prototype.hasOwnProperty.call(body, 'status');
  const hasPriority = Object.prototype.hasOwnProperty.call(body, 'priority');
  const { status, priority } = body;

  if (hasStatus && (!validStatuses.includes(status))) {
    return res.status(400).send({
      'message': 'Invalid status provided.',
      'long_message': 'Status can only be one of the following: [backlog | in-progress | complete].',
    });
  }
  if (hasPriority) {
    const priorityValidation = validatePriority(priority);
    if (!priorityValidation.valid) {
      return res.status(400).send(priorityValidation.messageObj);
    }
  }

  const updateClients = db.transaction(() => {
    const client = db.prepare('select * from clients where id = ?').get(id);
    const destinationStatus = hasStatus ? status : client.status;
    const statusChanged = destinationStatus !== client.status;
    const sourceClients = db.prepare(
      'select * from clients where status = ? order by priority asc, id asc',
    ).all(client.status).filter(item => item.id !== id);

    if (!statusChanged && !hasPriority) {
      return;
    }

    const destinationClients = statusChanged
      ? db.prepare(
        'select * from clients where status = ? order by priority asc, id asc',
      ).all(destinationStatus)
      : sourceClients;
    const orderedClients = statusChanged ? destinationClients : sourceClients;
    const requestedPriority = hasPriority
      ? priority
      : orderedClients.length + 1;
    const insertionIndex = Math.min(requestedPriority - 1, orderedClients.length);
    orderedClients.splice(insertionIndex, 0, client);

    const update = db.prepare('update clients set status = ?, priority = ? where id = ?');
    if (statusChanged) {
      sourceClients.forEach((item, index) => update.run(item.status, index + 1, item.id));
      orderedClients.forEach((item, index) => update.run(destinationStatus, index + 1, item.id));
    } else {
      orderedClients.forEach((item, index) => update.run(destinationStatus, index + 1, item.id));
    }
  });

  try {
    updateClients();
  } catch (error) {
    return res.status(500).send({
      'message': 'Unable to update client.',
      'long_message': error.message,
    });
  }

  return res.status(200).send(db.prepare('select * from clients').all());
});

const port = process.env.PORT || 3001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(port);
  console.log('app running on port ', port);
}

export { app, db };
