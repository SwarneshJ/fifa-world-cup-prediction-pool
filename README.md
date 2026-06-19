# World Cup 2026 Prediction Pool

A mobile-first private web application built for a group of 6 friends to predict the matches of the FIFA World Cup 2026.

## Tech Stack
- **Next.js** (App Router, Turbopack, TypeScript)
- **Tailwind CSS** (Mobile-First styling, max-width centered container)
- **Drizzle ORM** with **Postgres via Neon** (accessed via Serverless HTTP driver)
- **Auth.js (NextAuth v5)** with Credentials provider (secure httpOnly JWT cookies)
- **Bcryptjs** for password hashing

---

## Getting Started

### 1. Configure Environment Variables
Create a `.env` or `.env.local` file in the root of the project:
```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
NEXTAUTH_SECRET=a_very_long_secure_random_string_here
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=a_very_long_secure_random_string_here  # Used by Auth.js v5 (keep it identical to NEXTAUTH_SECRET)
```

> [!TIP]
> You can generate a random secret command-line using:
> `openssl rand -base64 32`

### 2. Install Dependencies
```bash
npm install
```

### 3. Generate and Run Database Migrations
Generate the migrations SQL files using Drizzle Kit:
```bash
npm run db:generate
```
Push the schema to your Neon/Postgres database:
```bash
npm run db:migrate
```

### 4. Seed the Database (6 Friends & 104 Matches)
> [!NOTE]
> If you are running in local **Zero-Config Mode** (using `local_db.json`), the file database will **automatically seed itself** on the very first page load. You do **not** need to run database migrations or the seed script locally!

If you are using a real Postgres database (or preparing for Vercel production), you can optionally open **[seed.ts](file:///Users/swarnesh/AntiGravity/Fifa%20World%20Cup%20Prediction%20Pool/scripts/seed.ts)** and edit the initial names and starting passwords inside the `usersToSeed` array.

Then run the seed script:
```bash
npm run db:seed
```
This will clear any old tables and seed exactly 6 friend accounts (including one admin) and all 104 official UTC matches.

### 5. Run the Local Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your browser (or toggle mobile emulator mode) to interact with the app.

---

## Deployment to Vercel

### Step 1: Initialize Database on Vercel / Neon
1. Create a new project on Vercel.
2. In the Vercel dashboard, go to the **Storage** tab and create a **Vercel Postgres** database (which is powered by Neon).
3. Connect the Postgres database to your project. This automatically injects the `DATABASE_URL` environment variable into your project settings.

### Step 2: Set Auth Secrets
In your Vercel project's **Settings** ➜ **Environment Variables**, add:
- `NEXTAUTH_SECRET` (generate a random 32-character key)
- `AUTH_SECRET` (set to the exact same value as `NEXTAUTH_SECRET`)
- `NEXTAUTH_URL` (set to your deployment production domain, e.g., `https://your-app-name.vercel.app`)

### Step 3: Run Database Migrations and Seeding on Deploy
You can run database migrations and seed the database on your deployed instance using the Vercel CLI or running the scripts:
1. Since we provided npm scripts, you can execute migrations and seed directly against the Neon production database from your local terminal:
   ```bash
   DATABASE_URL="your-production-neon-database-url" npm run db:migrate
   DATABASE_URL="your-production-neon-database-url" npm run db:seed
   ```
2. Alternatively, you can run migrations during Vercel's build command by editing the build script in `package.json` to `drizzle-kit migrate && next build`, but running it manually or via a pre-deployment step is recommended.

### Step 4: Deploy
Push your git repository to GitHub and import it on Vercel. Select the **Next.js** framework preset. Click **Deploy**, and Vercel will build and host your serverless application.

---

## 🏆 Scoring & Ranking Rules

- **Outcome Point**: **+3 points** for correctly predicting the match winner (Home, Away) or a Draw (group stage only).
- **Exact Score Bonus**: **+2 points** (if enabled in Admin Dashboard) for matching the exact scoreline.
- **Ties resolution order**:
  1. Total Points (descending)
  2. Number of Correct outcomes (descending)
  3. Earliest prediction submission timestamps sum (ascending - earlier votes win)
