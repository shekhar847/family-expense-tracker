const pool = require("../db");

// -------------------Add Expense---------------------
const addExpense = async (req, res) => {
  try {
    const { user_id, title, amount, category, member_name, notes, tag } = req.body;
    if (!user_id || !title || !amount) {
      return res.status(400).json({ message: "All fields required" });
    }
    const userCheck = await pool.query("SELECT * FROM public.users WHERE id = $1", [user_id]);
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ message: "User not found" });
    }
    const result = await pool.query(
      `INSERT INTO public.expenses (user_id, title, amount, category, member_name, notes, tag) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [user_id, title, amount, category, member_name || 'Self', notes || '', tag || '']
    );
    res.json({ message: "Expense added successfully", expense: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// -------------------Get Expenses--------------------
const getExpenses = async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await pool.query(
      "SELECT id, user_id, title, amount, category, date, member_name, notes, tag FROM public.expenses WHERE user_id = $1 ORDER BY id DESC",
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// -------------------Delete Expense------------------
const deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM public.expenses WHERE id = $1", [id]);
    res.json({ message: "Expense deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
// -------------------Edit Expense--------------------
const editExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, amount, category } = req.body;
    const result = await pool.query("UPDATE public.expenses SET title = $1, amount = $2, category = $3 WHERE id = $4 RETURNING *", [title, amount, category, id]);
    res.json({ message: "Expense updated", expense: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { addExpense, getExpenses, deleteExpense, editExpense };