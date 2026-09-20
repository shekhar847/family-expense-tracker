require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const { OAuth2Client } = require("google-auth-library");
const pool = require("./db");
const authRoutes = require("./routes/authRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const loanRoutes = require("./routes/loanRoutes");
const bcrypt = require('bcryptjs');

// ------------------- Gemini AI Setup -------------------
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

// -------------------Loans / Udhar Table-------------
pool.query(`CREATE TABLE IF NOT EXISTS public.loans (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  person_name TEXT,
  type TEXT,
  amount NUMERIC(10,2),
  status TEXT DEFAULT 'Pending',
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`).then(() => console.log("loans table ready"))
    .catch(err => console.log("loans table error:", err.message));

pool.query(`CREATE TABLE IF NOT EXISTS public.emis (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  title TEXT,
  principal NUMERIC(10,2),
  interest_rate NUMERIC(5,2),
  tenure_months INTEGER,
  emi_amount NUMERIC(10,2),
  total_payable NUMERIC(10,2),
  amount_paid NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`).then(() => console.log("emis table ready"))
    .catch(err => console.log("emis table error:", err.message));

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

// ------------------- Gemini-Powered Receipt Scan Route (PDF & Images) -------------------
app.post("/scan-receipt", async (req, res) => {
    try {
        const { image_data, media_type } = req.body;
        if (!image_data) {
            return res.status(400).json({ error: "Image or PDF data missing" });
        }

        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "GEMINI_API_KEY missing in server environment variables" });
        }

        // Updated Model Name to latest Gemini 3.6 Flash
        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });

        // Base64 cleaning
        const cleanBase64 = image_data.replace(/^data:(.*);base64,/, "");

        // Auto-detect MIME type
        let mimeType = media_type || "image/jpeg";
        if (image_data.startsWith("data:application/pdf") || cleanBase64.startsWith("JVBERi0")) {
            mimeType = "application/pdf";
        } else if (image_data.startsWith("data:image/png")) {
            mimeType = "image/png";
        } else if (image_data.startsWith("data:image/webp")) {
            mimeType = "image/webp";
        }

        console.log(`📄 Scanning document with Gemini (Type: ${mimeType})...`);

        const prompt = `Analyze this expense receipt or document and respond ONLY in valid JSON format with no markdown formatting or extra text:
        {
          "title": "item or store name (max 30 chars)",
          "amount": "total amount as number only",
          "category": "one of: Food, Travel, Shopping, Rent, Medicine, Other",
          "notes": "brief description (max 50 chars)"
        }`;

        const documentPart = {
            inlineData: {
                data: cleanBase64,
                mimeType: mimeType
            }
        };

        const result = await model.generateContent([prompt, documentPart]);
        const responseText = result.response.text();

        // Robust JSON extraction
        const cleanedJson = responseText.replace(/```json|```/g, "").trim();
        const firstBrace = cleanedJson.indexOf("{");
        const lastBrace = cleanedJson.lastIndexOf("}");

        if (firstBrace !== -1 && lastBrace !== -1) {
            const parsed = JSON.parse(cleanedJson.substring(firstBrace, lastBrace + 1));
            console.log("✅ Receipt parsed successfully with Gemini!");
            return res.json(parsed);
        } else {
            throw new Error("Could not parse valid JSON from AI response");
        }

    } catch (err) {
        console.error("Server Scan Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// ------------------- AI Spending Advice -------------------
app.get("/api/ai-advice/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;
        
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ error: "GEMINI_API_KEY missing in server environment variables" });
        }

        // Fetch user's expenses grouped by category for the current month
        const expensesResult = await pool.query(
            `SELECT category, SUM(amount) as total 
             FROM public.expenses 
             WHERE user_id = $1 
             AND date >= date_trunc('month', CURRENT_DATE) 
             GROUP BY category`,
            [user_id]
        );

        if (expensesResult.rows.length === 0) {
            return res.json({ advice: "You have no expenses recorded for this month yet. Start adding some to get personalized AI advice!" });
        }

        const expenseData = expensesResult.rows.map(row => `${row.category}: ₹${row.total}`).join(", ");
        
        const prompt = `You are an expert financial advisor. Here is a summary of a user's spending this month by category: ${expenseData}. 
        Provide a brief, encouraging, and actionable piece of advice (2-3 short paragraphs) on how they might optimize their spending or save money. Keep the tone friendly and use emojis. Format it beautifully with HTML tags like <b>, <br>, <ul><li> so it can be directly rendered.`;

        const model = genAI.getGenerativeModel({ model: "gemini-3.6-flash" });
        const result = await model.generateContent(prompt);
        const advice = result.response.text();
        
        res.json({ advice });
    } catch (err) {
        console.error("AI Advice Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});

app.use("/", authRoutes);
app.use("/", expenseRoutes);
app.use("/", loanRoutes);

// -------------------EMI Routes-------------------
app.post("/api/emis", async (req, res) => {
    try {
        const { user_id, title, principal, interest_rate, tenure_months } = req.body;
        // EMI Calculation
        const P = parseFloat(principal);
        const r = parseFloat(interest_rate) / (12 * 100);
        const n = parseInt(tenure_months);
        let emi = 0;
        if (r > 0) {
            emi = P * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
        } else {
            emi = P / n;
        }
        const total_payable = emi * n;
        
        const result = await pool.query(
            "INSERT INTO public.emis (user_id, title, principal, interest_rate, tenure_months, emi_amount, total_payable) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [user_id, title, P, parseFloat(interest_rate), n, emi, total_payable]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/emis/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;
        const result = await pool.query("SELECT * FROM public.emis WHERE user_id = $1 ORDER BY created_at DESC", [user_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/api/emis/:id/pay", async (req, res) => {
    try {
        const { id } = req.params;
        const emiResult = await pool.query("SELECT * FROM public.emis WHERE id = $1", [id]);
        if (emiResult.rows.length === 0) return res.status(404).json({ error: "EMI not found" });
        
        const emi = emiResult.rows[0];
        let newPaid = parseFloat(emi.amount_paid) + parseFloat(emi.emi_amount);
        let status = emi.status;
        
        if (newPaid >= parseFloat(emi.total_payable)) {
            newPaid = parseFloat(emi.total_payable);
            status = 'Completed';
        }
        
        const result = await pool.query(
            "UPDATE public.emis SET amount_paid = $1, status = $2 WHERE id = $3 RETURNING *",
            [newPaid, status, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/api/emis/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM public.emis WHERE id = $1", [id]);
        res.json({ message: "EMI deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// -------------------Start Server--------------------
app.listen(5000, () => console.log("Server started on port 5000"));