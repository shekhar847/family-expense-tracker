const express = require("express");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const pool = require("./db");

const authRoutes = require("./authRoutes");
const expenseRoutes = require("./expenseRoutes");

const app = express();

// -------------------Cloudinary Config---------------
cloudinary.config({
  cloud_name: "dsa7qrchz",
  api_key: "674292933575328",
  api_secret: "SYeGO96IWZZfWE9r_u4Rs-abl5o"
});

// -------------------Middleware----------------------
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// -------------------Create Tables-------------------
pool.query(`CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY, name TEXT, email TEXT UNIQUE, password TEXT
)`).then(() => console.log("users table ready"))
  .catch(err => console.log("users table error:", err.message));

pool.query(`CREATE TABLE IF NOT EXISTS public.expenses (
  id SERIAL PRIMARY KEY, user_id INTEGER, title TEXT,
  amount NUMERIC(10,2), category TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`).then(() => console.log("expenses table ready"))
  .catch(err => console.log("expenses table error:", err.message));

pool.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar TEXT`)
  .then(() => console.log("avatar column ready"))
  .catch(err => console.log("avatar column error:", err.message));

// -------------------Family Members Table------------
pool.query(`CREATE TABLE IF NOT EXISTS public.family_members (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  name TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`).then(() => console.log("family_members table ready"))
  .catch(err => console.log("family_members table error:", err.message));

pool.query(`ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS member_id INTEGER`)
  .then(() => console.log("member_id column ready"))
  .catch(err => console.log("member_id column error:", err.message));

pool.query(`ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS member_name TEXT DEFAULT 'Self'`)
  .then(() => console.log("member_name column ready"))
  .catch(err => console.log("member_name column error:", err.message));

// -------------------Routes--------------------------
app.get("/", (req, res) => res.send("Backend running"));
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.use("/", authRoutes);
app.use("/", expenseRoutes);

// -------------------Start Server--------------------
app.listen(5000, () => console.log("Server started on port 5000"));