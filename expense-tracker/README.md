# SplitEase – Group Expense Tracker

A full-stack expense splitting app with UPI verification, room management, and balance tracking.

## Features
- 🏠 **Rooms** – Create/join expense rooms with 6-char invite codes
- ⚖️ **Balances** – Real-time net balance per member (who owes whom)
- ✅ **Verify** – UPI payment verification with UTR tracking
- 👤 **Profile** – Edit email/UPI ID, delete recent expenses
- 🔐 **Auth** – JWT-based login/register

## Stack
- **Backend**: Node.js + Express (in-memory store, JWT auth)
- **Frontend**: React 18 + Vite, no UI library (custom CSS)

## Run Locally

### Backend (Terminal 1)
```bash
cd backend
npm install
node src/index.js
# → http://localhost:5000
```

### Frontend (Terminal 2)
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## API Endpoints
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | /api/auth/register | No | Register user |
| POST | /api/auth/login | No | Login |
| GET | /api/profile | Yes | Get profile |
| PATCH | /api/profile | Yes | Update email/UPI |
| GET | /api/rooms | Yes | List my rooms |
| POST | /api/rooms | Yes | Create room |
| POST | /api/rooms/join | Yes | Join with code |
| GET | /api/rooms/:id | Yes | Room details + members |
| GET | /api/rooms/:id/expenses | Yes | List expenses |
| POST | /api/rooms/:id/expenses | Yes | Add expense |
| DELETE | /api/expenses/:id | Yes | Delete (within 6h) |
| GET | /api/rooms/:id/balances | Yes | Net balances |
| GET | /api/verifications | Yes | My verifications |
| POST | /api/verifications | Yes | Request verification |
| PATCH | /api/verifications/:id | Yes | Confirm/reject |

## Notes
- Data is in-memory; restart clears all data
- To persist: replace in-memory arrays with SQLite or MongoDB
- For production: add HTTPS, env vars for JWT_SECRET
