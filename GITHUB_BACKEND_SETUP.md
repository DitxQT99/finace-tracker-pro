# Grey Finance — free private backend

The app stores account data in a separate **private GitHub repository**. Do not use the public source repository for private financial records.

## One-time setup
1. Create an empty private GitHub repository named \`grey-finance-data\`.
2. GitHub Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token.
3. Restrict the token to only that private repository and grant only **Contents: Read and write**.
4. Vercel → Grey Finance → Settings → Environment Variables:
   - \`GITHUB_DATA_REPO\` = \`YOUR_GITHUB_USERNAME/grey-finance-data\`
   - \`GITHUB_TOKEN\` = the fine-grained token (Encrypted/Sensitive)
   - Keep existing \`JWT_SECRET\` (at least 32 characters).
5. Apply to Production and redeploy.

Never put GITHUB_TOKEN in frontend JavaScript. Passwords are bcrypt-hashed; sessions use HttpOnly cookies. GitHub commit history retains prior versions, so this is a free small-project backend, not a bank-grade/high-volume database.
