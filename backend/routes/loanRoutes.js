const express = require("express");
const router = express.Router();
const pool = require("../db");

// Get all loans for a user
router.get("/loans/:user_id", async (req, res) => {
    try {
        const { user_id } = req.params;
        const result = await pool.query(
            "SELECT * FROM public.loans WHERE user_id = $1 ORDER BY date DESC, id DESC",
            [user_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add a new loan
router.post("/add-loan", async (req, res) => {
    try {
        const { user_id, person_name, type, amount, date } = req.body;
        
        if (!user_id || !person_name || !type || !amount) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const loanDate = date ? date : new Date().toISOString().split("T")[0];

        const result = await pool.query(
            "INSERT INTO public.loans (user_id, person_name, type, amount, date) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [user_id, person_name, type, amount, loanDate]
        );

        res.json({ message: "Loan added successfully", loan: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update loan status (e.g., mark as Settled)
router.put("/update-loan-status/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({ message: "Status is required" });
        }

        const result = await pool.query(
            "UPDATE public.loans SET status = $1 WHERE id = $2 RETURNING *",
            [status, id]
        );

        res.json({ message: "Loan status updated", loan: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete a loan
router.delete("/delete-loan/:id", async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM public.loans WHERE id = $1", [id]);
        res.json({ message: "Loan deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
