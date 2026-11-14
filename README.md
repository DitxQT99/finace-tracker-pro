# Grey Finance

Grey Finance is a mobile-first personal finance dashboard for recording income and expenses, tracking budgets, planning savings goals, and reviewing cash flow.

## Stack

- Static HTML/CSS/JavaScript interface
- Vercel serverless API functions
- Separate private GitHub repository as a small-project JSON data store
- bcryptjs password hashing and JWT sessions in HttpOnly cookies

## Backend setup (free tier)

Follow [GITHUB_BACKEND_SETUP.md](./GITHUB_BACKEND_SETUP.md). Create a separate **private** repository for data and a fine-grained GitHub token with only Contents read/write permission. Add `GITHUB_DATA_REPO` and `GITHUB_TOKEN` as encrypted Vercel environment variables. Keep the existing `JWT_SECRET` configured.

Do not use this public source repository as the data store. Never expose `GITHUB_TOKEN` in frontend code.

## Local development

Copy `.env.example` to `.env.local`, fill in the private repository and token, set a strong `JWT_SECRET`, install dependencies, and run with `vercel dev`.

## Security and limitations

- Passwords are hashed with bcryptjs.
- Sessions use HttpOnly, SameSite=Lax cookies.
- User records are stored separately under hashed email index and user ID JSON paths.
- GitHub commit history retains previous data versions. This is a free option for a small personal project, not a bank-grade or high-volume database.
- Grey Finance is a record-keeping tool, not a bank or financial institution.
