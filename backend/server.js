const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "DELETE", "PUT", "OPTIONS"],
  allowedHeaders: ["Content-Type"]
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const cloudinary = require("cloudinary").v2;
const multer = require("multer");

cloudinary.config({
  cloud_name: "dsa7qrchz",
  api_key: "674292933575328",
  api_secret: "SYeGO96IWZZfWE9r_u4Rs-abl5o"
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

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
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`)
  .then(() => console.log("expenses table ready"))
  .catch(err => console.log("expenses table error:", err.message));

pool.query(`ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar TEXT`)
  .then(() => console.log("avatar column ready"))
  .catch(err => console.log("avatar column error:", err.message));
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
// -------------------Upload Profile Image------------
app.post("/upload-avatar", upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { folder: "expense-tracker-avatars", transformation: [{ width: 150, height: 150, crop: "fill" }] },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });
    const { user_id } = req.body;
    await pool.query("UPDATE public.users SET avatar = $1 WHERE id = $2", [result.secure_url, user_id]);
    res.json({ avatar_url: result.secure_url });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
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
    //---------------Email already exists check-------
    const existing = await pool.query("SELECT * FROM public.users WHERE email = $1", [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Email already registered! Please login." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO public.users (name, email, password) VALUES ($1, $2, $3) RETURNING *",
      [name, cleanEmail, hashedPassword]
    );
    res.json({ message: "User registered", user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// -------------------Login---------------------------
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log("LOGIN REQUEST:", req.body);
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const userResult = await pool.query("SELECT * FROM public.users WHERE email = $1", [cleanEmail]);
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
        email: user.email,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.log("LOGIN ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});
// -------------------Add Expenses--------------------
app.post("/add-expense", async (req, res) => {
  try {
    console.log("ADD EXPENSE BODY:", req.body);
    const { user_id, title, amount, category } = req.body;
    if (!user_id || !title || !amount) {
      return res.status(400).json({ message: "All fields required" });
    }
    // -------------------Check User----------------------
    const userCheck = await pool.query("SELECT * FROM public.users WHERE id = $1", [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ message: "User not found" });
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
// -------------------Get Expense---------------------
app.get("/expenses/:user_id", async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await pool.query("SELECT id, user_id, title, amount, category, date FROM public.expenses WHERE user_id = $1 ORDER BY id DESC", [user_id]);
    res.json(result.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});
// -------------------Delete Expense------------------
app.delete("/delete-expense/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM public.expenses WHERE id = $1", [id]);
    res.json({ message: "Expense deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// -------------------Edit Expense-------------------
app.put("/edit-expense/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, category } = req.body;
    const result = await pool.query(
      "UPDATE public.expenses SET title = $1, amount = $2, category = $3 WHERE id = $4 RETURNING *",
      [title, amount, category, id]
    );
    res.json({ message: "Expense updated", expense: result.rows[0] });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});
// -------------------Update Profile-------------------
app.put("/update-profile", async (req, res) => {
  try {
    const { user_id, name, email } = req.body;
    if (!user_id || !name || !email) {
      return res.status(400).json({ message: "All fields required" });
    }
    const result = await pool.query(
      "UPDATE public.users SET name = $1, email = $2 WHERE id = $3 RETURNING *",
      [name, email.trim().toLowerCase(), user_id]
    );
    res.json({ message: "Profile updated", user: result.rows[0] });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------Change Password-------------------
app.put("/change-password", async (req, res) => {
  try {
    const { user_id, old_password, new_password } = req.body;
    if (!user_id || !old_password || !new_password) {
      return res.status(400).json({ message: "All fields required" });
    }
    const userResult = await pool.query(
      "SELECT * FROM public.users WHERE id = $1", [user_id]
    );
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }
    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(old_password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password galat hai" });
    }
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await pool.query(
      "UPDATE public.users SET password = $1 WHERE id = $2",
      [hashedPassword, user_id]
    );
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: err.message });
  }
});
// -------------------Start Server--------------------
app.listen(5000, () => {
  console.log("Server started on port 5000");
});