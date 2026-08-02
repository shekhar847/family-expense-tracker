const express = require("express");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const { OAuth2Client } = require("google-auth-library");
const pool = require("./db");
const authRoutes = require("./routes/authRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const bcrypt = require('bcryptjs');

const app = express();
const googleClient = new OAuth2Client("716678461904-1kul91j20k4v9jql1e1ao88p8ev1acg9.apps.googleusercontent.com");

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
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// -------------------Google Login-------------------
app.post("/google-login", async (req, res) => {
    try {
        const { credential } = req.body;
        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: "716678461904-1kul91j20k4v9jql1e1ao88p8ev1acg9.apps.googleusercontent.com"
        });
        const payload = ticket.getPayload();
        const { name, email, picture } = payload;

        let userResult = await pool.query(
            "SELECT * FROM public.users WHERE email = $1", [email]
        );

        if (userResult.rows.length === 0) {
            userResult = await pool.query(
                "INSERT INTO public.users (name, email, password, avatar) VALUES ($1, $2, $3, $4) RETURNING *",
                [name, email, "google-oauth", picture]
            );
        }

        const user = userResult.rows[0];
        res.json({
            message: "Google Login successful",
            user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar || picture }
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Google Login failed", error: err.message });
    }
});

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

// -------------------Reset Password API-------------------
app.post("/reset-password", async (req, res) => {
    try {
        const { email, new_password } = req.body;
        if (!email || !new_password) {
            return res.status(400).json({ message: "All fields required" });
        }
        const userResult = await pool.query(
            "SELECT * FROM public.users WHERE email = $1", 
            [email.trim().toLowerCase()]
        );
        if (userResult.rows.length === 0) {
            return res.status(400).json({ message: "Email not found" });
        }        
        const hashedPassword = await bcrypt.hash(new_password, 10);
        await pool.query(
            "UPDATE public.users SET password = $1 WHERE email = $2",
            [hashedPassword, email.trim().toLowerCase()]
        );        
        res.json({ message: "Password reset successful" });
    } catch (err) {
        console.error("SERVER RESET ERROR:", err);
        res.status(500).json({ error: err.message });
    }
});

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

// -------------------Receipt Scan Route (OpenRouter Vision Free)-------------------
app.post("/scan-receipt", async (req, res) => {
    try {
        const { image_data, media_type } = req.body;
        if (!image_data) {
            return res.status(400).json({ error: "Image/PDF data missing" });
        }

        const apiKey = process.env.OPENROUTER_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: "OPENROUTER_API_KEY missing in server variables" });
        }

        const mimeType = media_type || "image/jpeg";
        const base64Data = image_data.startsWith("data:") 
            ? image_data 
            : `data:${mimeType};base64,${image_data}`;

        const models = [
            "google/gemini-2.0-flash-exp:free",
            "meta-llama/llama-3.2-11b-vision-instruct:free",
            "qwen/qwen-2-vl-72b-instruct:free"
        ];

        let responseData = null;
        let isSuccess = false;

        for (const model of models) {
            try {
                const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://expense-tracker-backend-j2h7.onrender.com",
                        "X-Title": "Expense Tracker"
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            {
                                role: "user",
                                content: [
                                    {
                                        type: "text",
                                        text: `Analyze this receipt or expense document and respond ONLY in valid JSON format without markdown code blocks:
                                        { "title": "item or store name (max 30 chars)", "amount": "total amount as number only", "category": "one of: Food, Travel, Shopping, Rent, Medicine, Other", "notes": "brief description (max 50 chars)" }`
                                    },
                                    {
                                        type: "image_url",
                                        image_url: { url: base64Data }
                                    }
                                ]
                            }
                        ],
                        temperature: 0.1,
                        response_format: { type: "json_object" }
                    })
                });

                const data = await response.json();

                if (response.ok && data.choices && data.choices[0]?.message?.content) {
                    responseData = data;
                    isSuccess = true;
                    console.log(`✅ Scan successful using OpenRouter model: ${model}`);
                    break;
                } else {
                    console.log(`⚠️ Model ${model} failed:`, data.error?.message || JSON.stringify(data));
                }
            } catch (err) {
                console.log(`⚠️ Error calling ${model}:`, err.message);
            }
        }

        if (!isSuccess || !responseData) {
            return res.status(400).json({ error: "Vision API failed with available models." });
        }

        const rawContent = responseData.choices[0].message.content;
        const cleanedJson = rawContent.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanedJson);
        return res.json(parsed);

    } catch (err) {
        console.error("Server Scan Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});
app.use("/", authRoutes);
app.use("/", expenseRoutes);

// -------------------Start Server--------------------
app.listen(5000, () => console.log("Server started on port 5000"));
