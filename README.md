# Fintarg

Fintarg is a personal finance and life-management web app for Sri Lanka. This project is a migration from the Vite prototype into a Next.js app intended for Vercel + MongoDB Atlas deployment.

## Local development

1. Install dependencies:
   npm install
2. Copy the environment template:
   cp .env.example .env.local
3. Fill in the required values for MongoDB, app origin, and the encryption key.
4. Start the app:
   npm run dev

## Required environment variables

- MONGODB_URI: MongoDB Atlas connection string with the database name in the URL.
- MONGODB_DB: Database name to use for the app.
- APP_ORIGIN: Public application URL, typically your Vercel domain.
- FILE_ENCRYPTION_KEY: 32-byte base64 key used to encrypt uploaded files.
- CRON_SECRET: Secret used to protect maintenance and reminder cron routes.
- RESEND_API_KEY: Optional. Enables email sending through Resend.
- MAIL_FROM: Optional. Sender address for Resend mail.

## Secret generation examples

- FILE_ENCRYPTION_KEY: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`
- CRON_SECRET: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- APP_ORIGIN: `https://your-domain.vercel.app`

## Deployment

This app is intended to be deployed to Vercel with MongoDB Atlas. The project expects a MongoDB cluster to be configured, the app origin to be set, and the DB indexes initialized once with `npm run db:setup` before using the app.

## Upload limit

Uploads are limited to 4 MB in the app for compatibility with Vercel serverless limits.

## Notes

- The app stores file contents encrypted before saving them to MongoDB.
- Password reset emails require either Resend credentials or a configured mailer. Without configuration, the app logs a development message and surfaces a friendly failure in production.
