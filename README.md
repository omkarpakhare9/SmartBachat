# Expense Management Web App

A full-stack expense tracker with JWT auth, SQL.js persistence, budgets, reports, receipts, expense splits, email notifications, and multi-currency display conversion.

## Tech Stack

### Backend
- Node.js and Express
- SQL.js file database (`backend/expense-tracker.db` by default)
- JWT authentication
- Nodemailer email delivery
- Exchange-rate provider integration
- Helmet, CORS, rate limiting, and request validation

### Frontend
- React 18 with Vite
- React Router
- TailwindCSS
- Recharts
- Axios
- CSV and PDF exports

## Features

- Register, login, and protected profile management
- Income and expense transactions
- Category management
- Budgets and budget alert emails
- Expense splits and split reminder emails
- Reports with charts and CSV/PDF export
- Receipt uploads
- User currency preference
- Cached currency exchange rates and converted display amounts

## Local Setup

Requirements:
- Node.js 18 or higher
- npm

Install dependencies in each app:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Create backend environment config:

```bash
cd backend
copy .env.example .env
```

Create frontend environment config:

```bash
cd frontend
copy .env.example .env
```

Start both apps:

```bash
cd backend
npm run dev
```

```bash
cd frontend
npm run dev
```

Local URLs:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

## Environment Variables

### Backend

`PORT`: API server port. Defaults to `5000`.

`NODE_ENV`: Use `development` locally and `production` in hosted environments.

`JWT_SECRET`: Required. Secret used to sign JWT tokens.

`JWT_EXPIRE`: JWT lifetime. Defaults to `7d`.

`DATABASE_PATH`: Optional SQL.js database file path. Defaults to `backend/expense-tracker.db`.

`FRONTEND_URL`: Public frontend URL used in email links.

`APP_URL`: App URL used by invitation links.

`CORS_ORIGIN`: Allowed frontend origin in production.

`EMAIL_SERVICE`: `gmail`, `smtp`, or `sendgrid`.

`EMAIL_FROM`: Sender address shown in outgoing email.

`GMAIL_USER`, `GMAIL_PASSWORD`: Gmail SMTP credentials when `EMAIL_SERVICE=gmail`.

`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`: Generic SMTP settings when `EMAIL_SERVICE=smtp`.

`SENDGRID_API_KEY`: SendGrid key when `EMAIL_SERVICE=sendgrid`.

`BASE_CURRENCY`: Stored/base currency. Defaults to `USD`.

`EXCHANGE_RATE_API_KEY`: Optional exchangerate-api.com key. If omitted, the app uses the compatible public endpoint configured by `EXCHANGE_RATE_API_URL`.

`EXCHANGE_RATE_API_URL`: Compatible exchange-rate endpoint. Defaults to `https://api.exchangerate-api.com/v4/latest`.

### Frontend

`VITE_API_URL`: API base URL. Use `/api` for local Vite proxy or a full backend URL in production.

## Currency API

- `GET /api/currencies`: list cached currencies and rates.
- `POST /api/currencies/refresh`: refresh rates from the exchange-rate provider.
- `POST /api/currencies/convert`: convert an amount.
- `GET /api/currencies/preference`: read the signed-in user's display currency.
- `PUT /api/currencies/preference`: update the signed-in user's display currency.

Stored amounts remain in `BASE_CURRENCY`; API responses add `displayAmount`, `displayCurrency`, and related display fields for UI rendering.

## Email Notification API

- `GET /api/notifications/settings`: get notification preferences.
- `PUT /api/notifications/settings`: update notification preferences.
- `POST /api/notifications/test/budget-alert`: send a test budget alert.
- `POST /api/notifications/test/split-reminder`: send a test split reminder.
- `GET /api/notifications/logs`: list recent email logs.

Configure a real email provider before using test or production notification endpoints.

## Deployment

### Vercel Frontend

1. Import the repository in Vercel.
2. Use `vercel.json` from the repo root.
3. Set `VITE_API_URL` to the deployed backend API URL, for example `https://your-api.railway.app/api`.
4. Deploy. Vercel builds `frontend` and serves `frontend/dist`.

### Railway Backend

1. Create a Railway project from this repository.
2. Railway will use `railway.json`.
3. Set backend environment variables, especially `JWT_SECRET`, `NODE_ENV=production`, `FRONTEND_URL`, `CORS_ORIGIN`, email settings, and currency settings.
4. Deploy the backend service.

SQL.js stores data in a file. For production persistence on Railway, configure a persistent volume and point `DATABASE_PATH` at that volume.

### Render

1. Connect the repository in Render.
2. Use the included `render.yaml` blueprint.
3. Fill secret env vars marked `sync: false`.
4. Deploy the API web service and static frontend service.

For persistent SQL.js data on Render, use a disk and set `DATABASE_PATH` to a path on that disk.

## Production Commands

Backend:

```bash
cd backend
npm start
```

Frontend:

```bash
cd frontend
npm run build
npm run preview
```

## Verification

Run the backend smoke test to verify the main user flow:

```bash
cd backend
npm run test:e2e
```

The test starts the API with a temporary SQL.js database and verifies Register, Login, Add Expense, Edit, Delete, Dashboard summary, transaction filtering, and Logout.

## API Overview

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/profile`
- `PUT /api/profile`
- `PUT /api/profile/password`
- `GET /api/transactions`
- `POST /api/transactions`
- `PUT /api/transactions/:id`
- `DELETE /api/transactions/:id`
- `GET /api/categories`
- `POST /api/categories`
- `GET /api/budgets`
- `POST /api/budgets`
- `GET /api/reports/summary`
- `GET /api/reports/by-category`
- `GET /api/reports/monthly`
- `GET /api/splits`
- `POST /api/splits`

## Notes

This project no longer uses MongoDB or Mongoose. The backend persists through SQL.js and writes the database file after mutations.
