# Grey Finance storage

Grey Finance uses a Vercel Blob Private store connected directly to the Vercel project. The `BLOB_READ_WRITE_TOKEN` environment variable is provisioned by Vercel and available only to server-side functions.

No GitHub token, Neon database, Supabase project, or manual database setup is needed.

The Vercel Hobby plan includes a monthly free Blob quota. If the free quota is exceeded, Blob access is paused until reset rather than billing Hobby overages. Check the Vercel dashboard usage page for current consumption.
