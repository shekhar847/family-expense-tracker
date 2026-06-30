const express = require("express");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const pool = require("./db");

const authRoutes = require("./routes/authRoutes");
const expenseRoutes = require("./routes/expenseRoutes");

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

pool.query(`ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''`)
  .then(() => console.log("notes column ready"))
  .catch(err => console.log("notes column error:", err.message));
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

pool.query(`ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS tag TEXT DEFAULT ''`)
  .then(() => console.log("tag column ready"))
  .catch(err => console.log("tag column error:", err.message));

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
// -------------------Family Members API-------------------
app.get("/family-members/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;
        const result = await pool.query(
            "SELECT * FROM public.family_members WHERE user_id = $1 ORDER BY id ASC",
            [user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post("/add-family-member", async (req, res) => {
    try {
        const { user_id, name } = req.body;
        if (!user_id || !name) {
            return res.status(400).json({ message: "All fields required" });
        }
        const result = await pool.query("INSERT INTO public.family_members (user_id, name) VALUES ($1, $2) RETURNING *", [user_id, name]);
        res.json({ message: "Member added", member: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.delete("/delete-family-member/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM public.family_members WHERE id = $1", [id]);
        res.json({ message: "Member deleted" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// -------------------Monthly Trend-------------------
app.get("/monthly-trend/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;
        const result = await pool.query(
            `SELECT 
                TO_CHAR(date, 'Mon YYYY') as month,
                TO_CHAR(date, 'YYYY-MM') as month_key,
                SUM(amount) as total
            FROM public.expenses 
            WHERE user_id = $1 
            AND date >= NOW() - INTERVAL '6 months'
            GROUP BY month, month_key
            ORDER BY month_key ASC`,
            [user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// -------------------Monthly Comparison-------------------
app.get("/monthly-comparison/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;
        const result = await pool.query(
            `SELECT 
                category,
                SUM(CASE WHEN date >= date_trunc('month', CURRENT_DATE) THEN amount ELSE 0 END) as this_month,
                SUM(CASE WHEN date >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month') 
                    AND date < date_trunc('month', CURRENT_DATE) THEN amount ELSE 0 END) as last_month
            FROM public.expenses 
            WHERE user_id = $1 
            GROUP BY category
            ORDER BY this_month DESC`,
            [user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.use("/", authRoutes);
app.use("/", expenseRoutes);

// -------------------Start Server--------------------
app.listen(5000, () => console.log("Server started on port 5000"));