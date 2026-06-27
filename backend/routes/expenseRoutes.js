const express = require("express");
const router = express.Router();
const { addExpense, getExpenses, deleteExpense, editExpense } = require("./expenseController");

router.post("/add-expense", addExpense);
router.get("/expenses/:user_id", getExpenses);
router.delete("/delete-expense/:id", deleteExpense);
router.put("/edit-expense/:id", editExpense);

module.exports = router;