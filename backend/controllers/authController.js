const bcrypt = require("bcryptjs");
const pool = require("./connection");
const cloudinary = require("cloudinary").v2;

// -------------------Register------------------------
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }
    const cleanEmail = email.trim().toLowerCase();
    const existing = await pool.query("SELECT * FROM public.users WHERE email = $1", [cleanEmail]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: "Email already registered! Please login." });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query("INSERT INTO public.users (name, email, password) VALUES ($1, $2, $3) RETURNING *", [name, cleanEmail, hashedPassword]);
    res.json({ message: "User registered", user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// -------------------Login---------------------------
const login = async (req, res) => {
  try {
    const { email, password } = req.body;
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
      user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// -------------------Upload Avatar-------------------
const uploadAvatar = async (req, res) => {
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
    res.status(500).json({ error: err.message });
  }
};
// -------------------Update Profile------------------
const updateProfile = async (req, res) => {
  try {
    const { user_id, name, email } = req.body;
    if (!user_id || !name || !email) {
      return res.status(400).json({ message: "All fields required" });
    }
    const result = await pool.query("UPDATE public.users SET name = $1, email = $2 WHERE id = $3 RETURNING *", [name, email.trim().toLowerCase(), user_id]);
    res.json({ message: "Profile updated", user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// -------------------Change Password-----------------
const changePassword = async (req, res) => {
  try {
    const { user_id, old_password, new_password } = req.body;
    if (!user_id || !old_password || !new_password) {
      return res.status(400).json({ message: "All fields required" });
    }
    const userResult = await pool.query("SELECT * FROM public.users WHERE id = $1", [user_id]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }
    const user = userResult.rows[0];
    const isMatch = await bcrypt.compare(old_password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Old password galat hai" });
    }
    const hashedPassword = await bcrypt.hash(new_password, 10);
    await pool.query("UPDATE public.users SET password = $1 WHERE id = $2", [hashedPassword, user_id]);
    res.json({ message: "Password changed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { register, login, uploadAvatar, updateProfile, changePassword };