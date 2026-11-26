# Sakay All

Sakay All is a local full-stack tricycle booking school project for Kalibo, Aklan. It preserves the supplied Create React App and Express/SQLite project structure.

## Requirements

- Node.js 20 or later (tested with Node.js 24)
- npm

No cloud account, map key, payment account, or internet-hosted database is required. Bootstrap, icons, and fonts are bundled locally through the existing dependencies and assets.

## 1. Start the backend

Open a terminal in the `ngilo-api` folder:

```bash
npm install
npm start
```

The API runs at **http://localhost:3001** and creates/opens `ngilo.db` in the same folder.

## 2. Start the frontend

Keep the backend terminal open. Open a second terminal in the `ngilo-app` folder:

```bash
npm install
npm start
```

Open **http://localhost:3000**.

## Administrator demo

- Username: `admin`
- Password: `admin`

Passengers create their own accounts from **Create Account**. For the requested relaxed school-project validation, a one-character username and password are accepted. Full name, nonempty credentials, matching password confirmation, and unique usernames are still required. Passwords are hashed with bcrypt.

## Demonstration boundaries

- Tricycle assignment and availability are simulated using six local records.
- The map is illustrative and does not provide live GPS tracking.
- Estimated fares use **₱50 base + ₱10 per demonstration kilometer**; they are not official Kalibo fares.
- **Simulate payment** only changes a database status. It never transfers money or connects to GCash, a bank, or another payment provider.

## Build the frontend

```bash
npm run build
```

The original anonymous-message database table and API endpoints remain available for compatibility with the reference project.
