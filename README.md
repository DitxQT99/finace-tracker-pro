# Grey Finance

Grey Finance is a personal finance dashboard for recording income and expenses, tracking category budgets, planning savings goals, and reviewing cash flow.

## Stack

- Static, mobile-first HTML/CSS/JavaScript interface
- Vercel serverless API functions
- Neon PostgreSQL via the Vercel Marketplace
- bcryptjs password hashing and JWT sessions stored in HttpOnly cookies

## Deploy

1. Use the Vercel project named grey-finance connected to this repository.
2. In Vercel Marketplace, add the Neon PostgreSQL integration and connect it to the grey-finance project. The integration supplies DATABASE_URL.
3. JWT_SECRET is already stored as a sensitive Vercel environment variable.
4. Redeploy after the database integration is connected. The API creates the application tables idempotently on its first request.

## Local development

- Copy .env.example to .env.local.
- Add a Neon connection string as DATABASE_URL.
- Set a random JWT_SECRET with at least 32 characters.
- Install dependencies with npm install.
- Run locally with vercel dev.

## Security notes

- There is no seeded default account or hard-coded password.
- Passwords are hashed with bcryptjs.
- Session tokens are stored in HttpOnly, SameSite=Lax cookies; no JWT is stored in browser localStorage.
- Every transaction, budget, and saving goal query is scoped to the authenticated user.
- Amounts are stored in a single currency chosen by the account owner. Changing the display currency only changes formatting; it does not convert stored values.
- Grey Finance is a record-keeping tool, not a bank or financial institution.