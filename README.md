# Grey Finance

Grey Finance is a mobile-first personal finance dashboard for income and expenses, category budgets, savings goals, and cash-flow reports.

## Backend

- Vercel Functions for the API
- Vercel Blob **Private Storage** for account data
- bcryptjs password hashing
- Signed HttpOnly session cookies

The private Blob store is connected to the Vercel project. Its read/write credential is injected into the server environment by Vercel and is never shipped to the browser.

## Free usage

Vercel Hobby includes monthly Blob allowances (currently 1 GB storage, 10 GB data transfer, 10,000 simple operations, and 2,000 advanced operations). If the free quota is exceeded, access pauses until the quota resets; Hobby does not charge overage. See the official [Vercel Blob pricing](https://vercel.com/docs/vercel-blob/usage-and-pricing).

## Security and limitations

- Account JSON is stored in a private Blob store, not a public URL.
- Passwords are hashed with bcryptjs.
- Session cookies are HttpOnly and SameSite=Lax.
- Per-account records use opaque UUIDs and hashed email indexes.
- Conditional writes protect updates from silently overwriting a concurrent change.
- This is a personal record-keeping app, not a bank or financial institution.
