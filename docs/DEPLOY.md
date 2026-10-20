# Deployment guide

## 1) Create the MongoDB Atlas cluster

1. Sign in to MongoDB Atlas.
2. Create a free cluster.
3. Build a database user with a password.
4. Add network access for `0.0.0.0/0` so Vercel and local development can reach the cluster.
5. Copy the connection string and keep it for the next step.

## 2) Prepare the application

1. Push this project to GitHub.
2. In Vercel, import the GitHub repo.
3. Select the Node.js project and deploy it.
4. Add each required environment variable from the `.env.example` file.
5. Run `npm run db:setup` locally with your Atlas connection string set in `.env.local`.
6. Re-deploy the app after the database indexes are initialized.

## 3) Environment variables in Vercel

Add the following names in the Vercel dashboard:

- MONGODB_URI
- MONGODB_DB
- APP_ORIGIN
- FILE_ENCRYPTION_KEY
- CRON_SECRET
- RESEND_API_KEY (optional)
- MAIL_FROM (optional)

## 4) Production validation checklist

- Log in with a new account.
- Complete onboarding and choose a work mode.
- Add, edit, and delete a few income and expense entries.
- Confirm the dashboard net position and any shortfall messaging appear correctly.
- Verify uploads work and that wrong file types are rejected.
- Check password reset flow.
- Test the cron routes with and without the secret.
- Verify the account deletion flow and export feature.

## 5) Troubleshooting

- 500 on `/login` is usually caused by a missing env var, a wrong MongoDB URL, or Atlas network access not being open.
- Read the Vercel function logs to inspect the exact error and digest.
- Use the error digest in the logs to match the issue to the current runtime error.
- If emails are not working, verify `RESEND_API_KEY` and `MAIL_FROM` are set correctly.
