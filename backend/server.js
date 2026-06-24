const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const pool = require("./db");
// -------------------Create Table-----------------------
pool.query(`
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  password TEXT
)`)
  .then(() => console.log("users table ready"))
  .catch(err => console.log("users table error:", err.message));

pool.query(`
CREATE TABLE IF NOT EXISTS public.expenses (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  title TEXT,
  amount NUMERIC(10,2),
  category TEXT,
  date DATE DEFAULT CURRENT_DATE
)`)
  .then(() => console.log("expenses table ready"))
  .catch(err => console.log("expenses table error:", err.message));
// -------------------Home----------------------------
app.get("/", (req, res) => {
  res.send("Backend running");
});
// -------------------Test DB-------------------------
app.get("/test-db", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    res.status(500).send(err.message);
  }
});
// -------------------Register------------------------
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO public.users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
      [name, cleanEmail, hashedPassword]
    );
    res.json({
      message: "User registered",
      user: result.rows[0]
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// -------------------Login--------------------------
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("LOGIN REQUEST:", req.body);
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const userResult = await pool.query(
      "SELECT * FROM public.users WHERE email = $1",
      [cleanEmail]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }
    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }
    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (err) {
    console.log("LOGIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
// -------------------Add Expenses------------------------
app.post("/add-expense", async (req, res) => {
  try {
    console.log("ADD EXPENSE BODY:", req.body);
    const { user_id, title, amount, category } = req.body;
    if (!user_id || !title || !amount) {
      return res.status(400).json({
        message: "All fields required"
      });
    }
    // -------------------Check User----------------------
    const userCheck = await pool.query(
      "SELECT * FROM public.users WHERE id = $1",
      [user_id]
    );
    if (userCheck.rows.length === 0) {
      return res.status(400).json({
        message: "User not found"
      });
    }
    // -------------------Insert Expense-------------------
    const result = await pool.query(
      `INSERT INTO public.expenses
            (user_id, title, amount, category)
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
      [user_id, title, amount, category]
    );
    console.log("EXPENSE INSERTED:", result.rows[0]);
    res.json({
      message: "Expense added successfully",
      expense: result.rows[0]
    });
  } catch (err) {
    console.log("ADD EXPENSE ERROR:", err);
    res.status(500).json({
      error: err.message
    });
  }
});
// -------------------Get Expense-------------------
app.get("/expenses/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await pool.query(
      "SELECT * FROM public.expenses WHERE user_id = $1 ORDER BY id DESC",
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});
// -------------------Delete Expense----------------
app.delete("/delete-expense/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(
      "DELETE FROM public.expenses WHERE id = $1",
      [id]
    );
    res.json({ message: "Expense deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// -------------------Start Server-------------------
app.listen(5000, () => {
  console.log("Server started on port 5000");
});