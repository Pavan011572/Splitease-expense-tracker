# Full-Stack Deployment Guide for SplitEase

This guide outlines the steps to deploy **SplitEase** to production hosts so it is publicly accessible on the web.

---

## ─── STEP 1: Deploy the Database (MongoDB Atlas) ──────────────────────

Since your local database (`mongodb://127.0.0.1:27017/splitease`) is host-locked to your machine, you need a cloud-hosted MongoDB instance:

1. Go to [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas-database) and register a free account.
2. Create a new project and build a database cluster using the **M0 Free Tier**.
3. In the Database Access configuration, add a new database user (keep note of the username and password).
4. In Network Access configuration, select **Allow Access from Anywhere** (`0.0.0.0/0`) so cloud hosts can query it.
5. In your Database cluster overview, click **Connect** -> **Drivers** -> Node.js, and copy your connection string:
   ```text
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   *(Make sure to replace `<username>` and `<password>` with your created database credentials).*

---

## ─── STEP 2: Deploy the Backend (Render) ─────────────────────────────

Render is a free, modern platform ideal for Express API deployments:

1. Sign up on [Render](https://render.com/).
2. Push your project to a remote **GitHub** or **GitLab** repository.
3. On the Render Dashboard, click **New +** -> **Web Service**.
4. Connect your GitHub account and choose the `splitease-expense-tracker` repository.
5. Set these configurations:
   * **Root Directory**: `expense-tracker/backend`
   * **Runtime**: `Node`
   * **Build Command**: `npm install`
   * **Start Command**: `node src/index.js`
6. Expand **Advanced** -> **Environment Variables** and add the following:
   * `PORT`: `5000`
   * `JWT_SECRET`: Any random alphanumeric string (e.g., `sOmErAnDoMsEcReTkEy123!`)
   * `MONGODB_URI`: *Your MongoDB Atlas connection URL from Step 1*
7. Click **Create Web Service**.
8. Once built and running, Render will give you a public URL (e.g., `https://splitease-backend.onrender.com`). Copy this address.

---

## ─── STEP 3: Deploy the Frontend (Vercel) ───────────────────────────

Vercel is the easiest, fastest free hosting provider for static/React applications:

1. Create a free account at [Vercel](https://vercel.com/).
2. Click **Add New** -> **Project**.
3. Select the same GitHub repository from Step 2.
4. Set these configurations:
   * **Framework Preset**: `Vite` (automatically detected)
   * **Root Directory**: `expense-tracker/frontend`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
5. Expand **Environment Variables** and add:
   * `VITE_API_URL`: `https://your-backend-url.onrender.com/api` *(Your Render backend URL from Step 2, appending `/api` at the end)*
6. Click **Deploy**.
7. Once finished, Vercel will give you a production-ready public website link (e.g., `https://splitease-expense-tracker.vercel.app`)!

---

## ─── STEP 4: Test Your Live App ─────────────────────────────────────

1. Open your live frontend URL in your browser or phone browser.
2. Sign Up, create a room, write down the room code, and share the link with your roommates.
3. They will be able to join, input transactions, and resolve balances in real-time from their own devices!
