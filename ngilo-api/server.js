const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const { randomUUID } = require('crypto');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const BASE_FARE = 50;
const FARE_PER_KILOMETER = 10;
const LOCATIONS = ['Estancia', 'Poblacion, Kalibo', 'Mabilo', 'New Buswang', 'Mobo', 'Pook'];
const RIDE_STATUSES = ['Pending', 'Accepted', 'Assigned', 'In Progress', 'Completed', 'Cancelled'];

// Demonstration distances only. They are not official distances or fare rates.
const DISTANCES = {
  'Estancia|Poblacion, Kalibo': 11.5,
  'Estancia|Mabilo': 8.6,
  'Estancia|New Buswang': 12.9,
  'Estancia|Mobo': 14.1,
  'Estancia|Pook': 6.4,
  'Poblacion, Kalibo|Mabilo': 4.2,
  'Poblacion, Kalibo|New Buswang': 3.1,
  'Poblacion, Kalibo|Mobo': 4.8,
  'Poblacion, Kalibo|Pook': 7.2,
  'Mabilo|New Buswang': 5.5,
  'Mabilo|Mobo': 7.0,
  'Mabilo|Pook': 9.3,
  'New Buswang|Mobo': 5.2,
  'New Buswang|Pook': 8.1,
  'Mobo|Pook': 5.6,
};

app.use(cors());
app.use(express.json());

const db = new sqlite3.Database(path.join(__dirname, 'ngilo.db'));
const sessions = new Map();

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(error) {
      if (error) reject(error);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (error, row) => {
      if (error) reject(error);
      else resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (error, rows) => {
      if (error) reject(error);
      else resolve(rows);
    });
  });
}

function exec(sql) {
  return new Promise((resolve, reject) => {
    db.exec(sql, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function sendError(res, status, message) {
  return res.status(status).json({ error: message });
}

function publicUser(user) {
  return {
    userId: user.user_id,
    username: user.username,
    fullName: user.full_name || user.username,
    role: user.role || 'passenger',
  };
}

function distanceBetween(pickup, destination) {
  return DISTANCES[`${pickup}|${destination}`] ?? DISTANCES[`${destination}|${pickup}`];
}

function fareQuote(pickup, destination) {
  const distanceKm = distanceBetween(pickup, destination);
  const distanceCharge = Math.round(distanceKm * FARE_PER_KILOMETER);
  return {
    pickup,
    destination,
    distanceKm,
    baseFare: BASE_FARE,
    farePerKilometer: FARE_PER_KILOMETER,
    distanceCharge,
    tax: 0,
    totalFare: BASE_FARE + distanceCharge,
    paymentStatus: 'Unpaid',
    isEstimate: true,
  };
}

function validRoute(pickup, destination) {
  return LOCATIONS.includes(pickup) && LOCATIONS.includes(destination) && pickup !== destination;
}

async function requireAuth(req, res, next) {
  try {
    const authorization = req.get('authorization') || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
    const userId = sessions.get(token);
    if (!token || !userId) return sendError(res, 401, 'Please sign in to continue.');

    const user = await get('SELECT * FROM users WHERE user_id = ?', [userId]);
    if (!user) {
      sessions.delete(token);
      return sendError(res, 401, 'Your session is no longer available. Please sign in again.');
    }

    req.authToken = token;
    req.user = user;
    return next();
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Unable to verify your session.');
  }
}

function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') return sendError(res, 403, 'Administrator access is required.');
  return next();
}

function requirePassenger(req, res, next) {
  if (req.user.role !== 'passenger') return sendError(res, 403, 'Passenger access is required.');
  return next();
}

async function addNotification(userId, message, rideId = null) {
  await run(
    'INSERT INTO notifications (user_id, message, ride_id) VALUES (?, ?, ?)',
    [userId, message, rideId],
  );
}

const rideSelection = `
  SELECT r.*, u.full_name AS passenger_name, u.username AS passenger_username,
         t.driver_name, t.plate_number
  FROM rides r
  JOIN users u ON u.user_id = r.passenger_id
  LEFT JOIN tricycles t ON t.tricycle_id = r.tricycle_id
`;

async function findRide(rideId) {
  return get(`${rideSelection} WHERE r.ride_id = ?`, [rideId]);
}

async function ensureColumn(table, column, definition) {
  const columns = await all(`PRAGMA table_info(${table})`);
  if (!columns.some((item) => item.name === column)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function initialiseDatabase() {
  await exec('PRAGMA foreign_keys = ON;');

  await run(`CREATE TABLE IF NOT EXISTS users (
    user_id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL DEFAULT '',
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'passenger'
  )`);
  await ensureColumn('users', 'full_name', "TEXT NOT NULL DEFAULT ''");
  await ensureColumn('users', 'role', "TEXT NOT NULL DEFAULT 'passenger'");

  // Retained from the reference project so its existing message data remains usable.
  await run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id TEXT,
    user_id TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_read INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (sender_id) REFERENCES users(user_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id)
  )`);
  await ensureColumn('messages', 'sender_id', 'TEXT');
  await ensureColumn('messages', 'is_read', 'INTEGER NOT NULL DEFAULT 0');

  await run(`CREATE TABLE IF NOT EXISTS tricycles (
    tricycle_id TEXT PRIMARY KEY,
    driver_name TEXT NOT NULL,
    plate_number TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available'
  )`);

  await run(`CREATE TABLE IF NOT EXISTS rides (
    ride_id TEXT PRIMARY KEY,
    passenger_id TEXT NOT NULL,
    pickup TEXT NOT NULL,
    destination TEXT NOT NULL,
    distance_km REAL NOT NULL,
    fare REAL NOT NULL,
    payment_status TEXT NOT NULL DEFAULT 'Unpaid',
    status TEXT NOT NULL DEFAULT 'Pending',
    tricycle_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (passenger_id) REFERENCES users(user_id),
    FOREIGN KEY (tricycle_id) REFERENCES tricycles(tricycle_id)
  )`);

  await run(`CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    ride_id TEXT,
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id),
    FOREIGN KEY (ride_id) REFERENCES rides(ride_id)
  )`);

  const tricycles = [
    ['TRI-001', 'Juan Dela Cruz', 'KLB-101'],
    ['TRI-002', 'Maria Santos', 'KLB-102'],
    ['TRI-003', 'Pedro Reyes', 'KLB-103'],
    ['TRI-004', 'Ana Garcia', 'KLB-104'],
    ['TRI-005', 'Jose Ramos', 'KLB-105'],
    ['TRI-006', 'Liza Mendoza', 'KLB-106'],
  ];
  for (const tricycle of tricycles) {
    await run(
      'INSERT OR IGNORE INTO tricycles (tricycle_id, driver_name, plate_number) VALUES (?, ?, ?)',
      tricycle,
    );
  }

  const admin = await get("SELECT user_id FROM users WHERE role = 'admin' LIMIT 1");
  if (!admin) {
    await run(
      'INSERT INTO users (user_id, full_name, username, password, role) VALUES (?, ?, ?, ?, ?)',
      [randomUUID(), 'Sakay All Administrator', 'admin', await bcrypt.hash('admin', 10), 'admin'],
    );
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', application: 'Sakay All' });
});

app.get('/api/locations', (req, res) => {
  res.json(LOCATIONS);
});

app.post('/api/signup', async (req, res) => {
  try {
    const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';

    if (!fullName) return sendError(res, 400, 'Full name is required.');
    if (!username || !password) return sendError(res, 400, 'Username and password are required.');

    const existing = await get('SELECT user_id FROM users WHERE username = ? COLLATE NOCASE', [username]);
    if (existing) return sendError(res, 409, 'That username is already registered.');

    const userId = randomUUID();
    const hashedPassword = await bcrypt.hash(password, 10);
    await run(
      'INSERT INTO users (user_id, full_name, username, password, role) VALUES (?, ?, ?, ?, ?)',
      [userId, fullName, username, hashedPassword, 'passenger'],
    );
    await addNotification(userId, 'Welcome to Sakay All! Your passenger account is ready.');
    return res.status(201).json({ userId, username, fullName, role: 'passenger' });
  } catch (error) {
    if (error.message.includes('UNIQUE')) return sendError(res, 409, 'That username is already registered.');
    console.error(error);
    return sendError(res, 500, 'Server error during registration.');
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!username || !password) return sendError(res, 400, 'Username and password are required.');

    const user = await get('SELECT * FROM users WHERE username = ? COLLATE NOCASE', [username]);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return sendError(res, 401, 'Invalid username or password.');
    }

    const token = randomUUID();
    sessions.set(token, user.user_id);
    return res.json({ token, ...publicUser(user) });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Server error during sign in.');
  }
});

app.post('/api/logout', requireAuth, (req, res) => {
  sessions.delete(req.authToken);
  res.json({ success: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  res.json(publicUser(req.user));
});

app.get('/api/user/:userId', async (req, res) => {
  try {
    const user = await get('SELECT * FROM users WHERE user_id = ?', [req.params.userId]);
    if (!user) return sendError(res, 404, 'User not found.');
    return res.json(publicUser(user));
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Unable to retrieve the user.');
  }
});

app.put('/api/profile', requireAuth, async (req, res) => {
  try {
    const fullName = typeof req.body.fullName === 'string' ? req.body.fullName.trim() : '';
    const username = typeof req.body.username === 'string' ? req.body.username.trim() : '';
    if (!fullName || !username) return sendError(res, 400, 'Full name and username are required.');

    const duplicate = await get(
      'SELECT user_id FROM users WHERE username = ? COLLATE NOCASE AND user_id <> ?',
      [username, req.user.user_id],
    );
    if (duplicate) return sendError(res, 409, 'That username is already registered.');

    await run(
      'UPDATE users SET full_name = ?, username = ? WHERE user_id = ?',
      [fullName, username, req.user.user_id],
    );
    const updated = await get('SELECT * FROM users WHERE user_id = ?', [req.user.user_id]);
    return res.json(publicUser(updated));
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Unable to update your profile.');
  }
});

app.get('/api/fare', requireAuth, (req, res) => {
  const { pickup, destination } = req.query;
  if (!validRoute(pickup, destination)) {
    return sendError(res, 400, 'Choose two different supported locations.');
  }
  return res.json(fareQuote(pickup, destination));
});

app.get('/api/tricycles/availability', requireAuth, async (req, res) => {
  try {
    const result = await get("SELECT COUNT(*) AS available FROM tricycles WHERE status = 'Available'");
    return res.json({ available: result.available, simulated: true });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Unable to retrieve tricycle availability.');
  }
});

app.post('/api/rides', requireAuth, requirePassenger, async (req, res) => {
  const { pickup, destination } = req.body;
  if (!validRoute(pickup, destination)) {
    return sendError(res, 400, 'Choose two different supported locations.');
  }

  const active = await get(
    `SELECT ride_id FROM rides
     WHERE passenger_id = ? AND status IN ('Pending', 'Accepted', 'Assigned', 'In Progress')`,
    [req.user.user_id],
  );
  if (active) return sendError(res, 409, 'Finish or cancel your current ride before booking another.');

  const quote = fareQuote(pickup, destination);
  const rideId = randomUUID();
  let transactionStarted = false;

  try {
    await exec('BEGIN IMMEDIATE;');
    transactionStarted = true;
    const tricycle = await get(
      "SELECT * FROM tricycles WHERE status = 'Available' ORDER BY tricycle_id LIMIT 1",
    );
    const status = tricycle ? 'Assigned' : 'Pending';

    await run(
      `INSERT INTO rides
        (ride_id, passenger_id, pickup, destination, distance_km, fare, status, tricycle_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [rideId, req.user.user_id, pickup, destination, quote.distanceKm, quote.totalFare, status,
        tricycle ? tricycle.tricycle_id : null],
    );

    if (tricycle) {
      await run("UPDATE tricycles SET status = 'Assigned' WHERE tricycle_id = ?", [tricycle.tricycle_id]);
    }

    await addNotification(
      req.user.user_id,
      tricycle
        ? `Ride requested. ${tricycle.plate_number} with ${tricycle.driver_name} has been assigned.`
        : 'Ride request submitted. It is pending until a tricycle becomes available.',
      rideId,
    );
    await exec('COMMIT;');
    transactionStarted = false;
    return res.status(201).json(await findRide(rideId));
  } catch (error) {
    if (transactionStarted) await exec('ROLLBACK;');
    console.error(error);
    return sendError(res, 500, 'Unable to create your ride request.');
  }
});

app.get('/api/rides/mine', requireAuth, requirePassenger, async (req, res) => {
  try {
    const rides = await all(
      `${rideSelection} WHERE r.passenger_id = ? ORDER BY r.created_at DESC, r.ride_id DESC`,
      [req.user.user_id],
    );
    return res.json(rides);
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Unable to retrieve your rides.');
  }
});

app.patch('/api/rides/:rideId/cancel', requireAuth, requirePassenger, async (req, res) => {
  let transactionStarted = false;
  try {
    const ride = await get('SELECT * FROM rides WHERE ride_id = ? AND passenger_id = ?', [req.params.rideId, req.user.user_id]);
    if (!ride) return sendError(res, 404, 'Ride not found.');
    if (['Completed', 'Cancelled'].includes(ride.status)) {
      return sendError(res, 409, `A ${ride.status.toLowerCase()} ride cannot be cancelled.`);
    }

    await exec('BEGIN IMMEDIATE;');
    transactionStarted = true;
    await run("UPDATE rides SET status = 'Cancelled', updated_at = CURRENT_TIMESTAMP WHERE ride_id = ?", [ride.ride_id]);
    if (ride.tricycle_id) {
      await run("UPDATE tricycles SET status = 'Available' WHERE tricycle_id = ?", [ride.tricycle_id]);
    }
    await addNotification(req.user.user_id, 'Your ride was cancelled.', ride.ride_id);
    await exec('COMMIT;');
    transactionStarted = false;
    return res.json(await findRide(ride.ride_id));
  } catch (error) {
    if (transactionStarted) await exec('ROLLBACK;');
    console.error(error);
    return sendError(res, 500, 'Unable to cancel the ride.');
  }
});

app.patch('/api/rides/:rideId/pay', requireAuth, requirePassenger, async (req, res) => {
  try {
    const ride = await get('SELECT * FROM rides WHERE ride_id = ? AND passenger_id = ?', [req.params.rideId, req.user.user_id]);
    if (!ride) return sendError(res, 404, 'Ride not found.');
    if (ride.status === 'Cancelled') return sendError(res, 409, 'A cancelled ride cannot be paid.');
    if (ride.payment_status === 'Paid (Simulated)') return res.json(await findRide(ride.ride_id));

    await run(
      "UPDATE rides SET payment_status = 'Paid (Simulated)', updated_at = CURRENT_TIMESTAMP WHERE ride_id = ?",
      [ride.ride_id],
    );
    await addNotification(req.user.user_id, `Simulated payment recorded for your ${ride.destination} ride.`, ride.ride_id);
    return res.json(await findRide(ride.ride_id));
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Unable to record the simulated payment.');
  }
});

app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const notifications = await all(
      'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC, id DESC',
      [req.user.user_id],
    );
    return res.json(notifications);
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Unable to retrieve notifications.');
  }
});

app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const result = await run(
      'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.user_id],
    );
    if (!result.changes) return sendError(res, 404, 'Notification not found.');
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Unable to update the notification.');
  }
});

app.patch('/api/notifications/read-all', requireAuth, async (req, res) => {
  try {
    await run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [req.user.user_id]);
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Unable to update notifications.');
  }
});

app.get('/api/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    const stats = await get(`
      SELECT
        (SELECT COUNT(*) FROM users WHERE role = 'passenger') AS passengers,
        (SELECT COUNT(*) FROM rides) AS totalRides,
        (SELECT COUNT(*) FROM rides WHERE status = 'Pending') AS pendingRides,
        (SELECT COUNT(*) FROM rides WHERE status IN ('Accepted', 'Assigned', 'In Progress')) AS activeRides,
        (SELECT COUNT(*) FROM rides WHERE status = 'Completed') AS completedRides,
        (SELECT COUNT(*) FROM rides WHERE status = 'Cancelled') AS cancelledRides,
        (SELECT COUNT(*) FROM tricycles WHERE status = 'Available') AS availableTricycles
    `);
    return res.json(stats);
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Unable to retrieve application statistics.');
  }
});

app.get('/api/admin/passengers', requireAuth, requireAdmin, async (req, res) => {
  try {
    const passengers = await all(`
      SELECT u.user_id, u.full_name, u.username,
             COUNT(r.ride_id) AS ride_count,
             MAX(r.created_at) AS last_ride
      FROM users u
      LEFT JOIN rides r ON r.passenger_id = u.user_id
      WHERE u.role = 'passenger'
      GROUP BY u.user_id
      ORDER BY u.full_name COLLATE NOCASE
    `);
    return res.json(passengers);
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Unable to retrieve passengers.');
  }
});

app.get('/api/admin/tricycles', requireAuth, requireAdmin, async (req, res) => {
  try {
    return res.json(await all('SELECT * FROM tricycles ORDER BY tricycle_id'));
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Unable to retrieve tricycles.');
  }
});

app.get('/api/admin/rides', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { status } = req.query;
    if (status && !RIDE_STATUSES.includes(status)) return sendError(res, 400, 'Invalid ride status.');
    const where = status ? 'WHERE r.status = ?' : '';
    const params = status ? [status] : [];
    return res.json(await all(`${rideSelection} ${where} ORDER BY r.created_at DESC, r.ride_id DESC`, params));
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Unable to retrieve ride requests.');
  }
});

app.patch('/api/admin/rides/:rideId', requireAuth, requireAdmin, async (req, res) => {
  const { status, tricycleId } = req.body;
  if (!RIDE_STATUSES.includes(status)) return sendError(res, 400, 'Invalid ride status.');

  let transactionStarted = false;
  try {
    const ride = await get('SELECT * FROM rides WHERE ride_id = ?', [req.params.rideId]);
    if (!ride) return sendError(res, 404, 'Ride not found.');

    let nextTricycleId = ride.tricycle_id;
    if (['Assigned', 'In Progress'].includes(status)) {
      nextTricycleId = tricycleId || ride.tricycle_id;
      if (!nextTricycleId) return sendError(res, 400, 'Select a tricycle for this status.');
      const tricycle = await get('SELECT * FROM tricycles WHERE tricycle_id = ?', [nextTricycleId]);
      if (!tricycle) return sendError(res, 404, 'Tricycle not found.');
      if (tricycle.status !== 'Available' && nextTricycleId !== ride.tricycle_id) {
        return sendError(res, 409, 'That tricycle is not available.');
      }
    } else if (['Pending', 'Accepted'].includes(status)) {
      nextTricycleId = null;
    }

    await exec('BEGIN IMMEDIATE;');
    transactionStarted = true;

    if (ride.tricycle_id && ride.tricycle_id !== nextTricycleId) {
      await run("UPDATE tricycles SET status = 'Available' WHERE tricycle_id = ?", [ride.tricycle_id]);
    }
    if (['Completed', 'Cancelled'].includes(status) && ride.tricycle_id) {
      await run("UPDATE tricycles SET status = 'Available' WHERE tricycle_id = ?", [ride.tricycle_id]);
    }
    if (['Assigned', 'In Progress'].includes(status) && nextTricycleId) {
      await run(
        'UPDATE tricycles SET status = ? WHERE tricycle_id = ?',
        [status === 'In Progress' ? 'On Trip' : 'Assigned', nextTricycleId],
      );
    }

    await run(
      'UPDATE rides SET status = ?, tricycle_id = ?, updated_at = CURRENT_TIMESTAMP WHERE ride_id = ?',
      [status, nextTricycleId, ride.ride_id],
    );
    await addNotification(ride.passenger_id, `Your ride status is now ${status}.`, ride.ride_id);
    await exec('COMMIT;');
    transactionStarted = false;
    return res.json(await findRide(ride.ride_id));
  } catch (error) {
    if (transactionStarted) await exec('ROLLBACK;');
    console.error(error);
    return sendError(res, 500, 'Unable to update the ride.');
  }
});

// Original messaging endpoints are retained, with ownership checks added to private inboxes.
app.post('/api/send-message', async (req, res) => {
  try {
    const senderId = typeof req.body.senderId === 'string' ? req.body.senderId : null;
    const recipientId = typeof req.body.recipientId === 'string' ? req.body.recipientId.trim() : '';
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!recipientId || !message) return sendError(res, 400, 'Recipient and message are required.');
    const recipient = await get('SELECT user_id FROM users WHERE user_id = ?', [recipientId]);
    if (!recipient) return sendError(res, 404, 'Recipient not found.');
    const result = await run(
      'INSERT INTO messages (sender_id, user_id, message) VALUES (?, ?, ?)',
      [senderId, recipientId, message],
    );
    return res.status(201).json({ success: true, messageId: result.id });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Unable to send the message.');
  }
});

app.get('/api/messages/:userId', requireAuth, async (req, res) => {
  if (req.user.user_id !== req.params.userId && req.user.role !== 'admin') {
    return sendError(res, 403, 'You cannot view another user\'s messages.');
  }
  try {
    return res.json(await all(
      'SELECT message, timestamp FROM messages WHERE user_id = ? ORDER BY timestamp DESC',
      [req.params.userId],
    ));
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Unable to retrieve messages.');
  }
});

app.get('/api/inbox/:userId', requireAuth, async (req, res) => {
  if (req.user.user_id !== req.params.userId && req.user.role !== 'admin') {
    return sendError(res, 403, 'You cannot view another user\'s inbox.');
  }
  try {
    return res.json(await all(`
      SELECT m.id, m.sender_id, m.user_id AS recipient_id, m.message, m.timestamp, m.is_read,
             u.username AS sender_username
      FROM messages m LEFT JOIN users u ON u.user_id = m.sender_id
      WHERE m.user_id = ? ORDER BY m.timestamp DESC, m.id DESC
    `, [req.params.userId]));
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Unable to retrieve the inbox.');
  }
});

app.delete('/api/messages/:id', requireAuth, async (req, res) => {
  try {
    const message = await get('SELECT * FROM messages WHERE id = ?', [req.params.id]);
    if (!message) return sendError(res, 404, 'Message not found.');
    if (message.user_id !== req.user.user_id && req.user.role !== 'admin') {
      return sendError(res, 403, 'You cannot delete another user\'s message.');
    }
    await run('DELETE FROM messages WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return sendError(res, 500, 'Unable to delete the message.');
  }
});

initialiseDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Sakay All API running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exitCode = 1;
  });
