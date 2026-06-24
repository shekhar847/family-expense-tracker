let currentUser = null;
const BASE_URL = "https://expense-tracker-backend-j2h7.onrender.com";
window.barChartInst = null;
window.pieChartInst = null;
const CHART_COLORS = [
    "#c8f135",
    "#5c9dff",
    "#ffb340",
    "#3dd9a4",
    "#ff5c5c",
    "#9b5cff"
];
// ---------------------------Section---------------------------
function showSection(id, el = null) {
    document.querySelectorAll(".section")
        .forEach(sec => sec.classList.remove("active"));
    document.getElementById(id)
        .classList.add("active");
    document.querySelectorAll(".nav-item")
        .forEach(nav => nav.classList.remove("active"));
    if (el) {
        el.classList.add("active");
    }
    // -----------------------Report Open-----------------------
    if (id === "reportSection") {
        setTimeout(() => {
            loadExpenses();
        }, 300);
    }
}

// ---------------------------Toast-----------------------------
function showToast(msg, type = "success") {
    const stack = document.getElementById("toastStack");
    const el = document.createElement("div");
    el.className = "toast-item";
    el.innerHTML = `
        <div class="toast-dot ${type === "danger" ? "danger" : ""}"></div>
        <span>${msg}</span>
    `;
    stack.appendChild(el);
    setTimeout(() => {
        el.remove();
    }, 3000);
}

// ---------------------------Login-----------------------------
async function loginUser() {
    try {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();
        const res = await fetch(`${BASE_URL}/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                email,
                password
            })
        });
        const data = await res.json();
        if (data.user) {
            currentUser = data.user;
            document.getElementById("userName").innerText = data.user.name;
            document.getElementById("userEmail").innerText = data.user.email;
            document.getElementById("userAvatar").innerText = data.user.name.charAt(0).toUpperCase();
            document.getElementById("loginCard").style.display = "none";
            document.getElementById("dashboardContent").style.display = "block";
            showToast("Login Successful");
            loadExpenses();
        } else {
            showToast(
                data.message || "Invalid Credentials",
                "danger"
            );
        }
    } catch (err) {
        console.log(err);
        showToast("Server Error", "danger");
    }
}

async function registerUser() {
    try {
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();
        if (!email || !password) {
            showToast("Email aur password bharo", "danger");
            return;
        }
        const res = await fetch(`${BASE_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Shekhar Kumar", email, password })
        });
        const data = await res.json();
        if (data.user) {
            showToast("Registered! Ab login karo");
        } else {
            showToast(data.error || "Error", "danger");
        }
    } catch (err) {
        showToast("Server Error", "danger");
    }
}

// ---------------------------Logout----------------------------
function logout() {
    currentUser = null;
    document.getElementById("userName").innerText =
        "Guest User";
    document.getElementById("userEmail").innerText =
        "Not logged in";
    document.getElementById("userAvatar").innerText = "?";
    document.getElementById("dashboardContent").style.display =
        "none";
    document.getElementById("loginCard").style.display =
        "block";
    showToast("Logged out", "danger");
}

// ---------------------------Add Expense-----------------------
async function addExpense() {
    if (!currentUser) {
        showToast("Login first", "danger");
        return;
    }
    const title =
        document.getElementById("title").value.trim();
    const amount =
        document.getElementById("amount").value.trim();
    const category =
        document.getElementById("category").value;
    if (!title || !amount || !category) {
        showToast("Fill all fields", "danger");
        return;
    }
    try {
        await fetch(`${BASE_URL}/add-expense`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                user_id: currentUser.id,
                title,
                amount,
                category
            })
        });
        document.getElementById("title").value = "";
        document.getElementById("amount").value = "";
        document.getElementById("category").value = "";
        showToast("Expense Added");
        loadExpenses();
    } catch (err) {
        console.log(err);
        showToast("Failed", "danger");
    }
}

// ---------------------------Load Expense----------------------
async function loadExpenses() {
  try {
    const res = await fetch(`${BASE_URL}/expenses/${currentUser.id}`);
    const data = await res.json();
    renderExpenseList(data);
    updateStats(data);
    renderCharts(data);
    renderReportTable(data);
  } catch (err) {
    console.log(err);
  }
}

// ---------------------------Expense List----------------------
function renderExpenseList(data) {
    const container =
        document.getElementById("expenseListContainer");
    if (!container) return;
    if (data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📊</div>
                <p>No expenses found</p>
            </div>
        `;
        return;
    }
    container.innerHTML = data.map(e => `
        <div class="expense-item">
            <span class="expense-cat-badge">
                ${e.category}
            </span>
            <span class="expense-title">
                ${e.title}
            </span>
            <span class="expense-amount">
                ₹${Number(e.amount).toFixed(2)}
            </span>
            <button class="btn-del"
                onclick="deleteExpense(${e.id})">
                ✕
            </button>
        </div>
    `).join("");
}

// ---------------------------Delete----------------------------
async function deleteExpense(id) {
    try {
        await fetch(
            `${BASE_URL}/delete-expense/${id}`,
            {
                method: "DELETE"
            }
        );
        showToast("Expense Deleted", "danger");
        loadExpenses();
    } catch (err) {
        console.log(err);
    }
}

// ---------------------------Filter----------------------------
function filterExpenses() {
    const q = document
        .getElementById("searchExpense")
        .value
        .toLowerCase();
    const items =
        document.querySelectorAll(".expense-item");
    items.forEach(item => {
        item.style.display =
            item.innerText.toLowerCase().includes(q)
                ? ""
                : "none";
    });
}

// ---------------------------State-----------------------------
function updateStats(data) {
    let total = 0;
    data.forEach(e => {
        total += Number(e.amount);
    });
    const avg =
        data.length > 0
            ? total / data.length
            : 0;
    document.getElementById("statTotal").innerText = total.toFixed(2);
    document.getElementById("statMonth").innerText = total.toFixed(2);
    document.getElementById("statCount").innerText = data.length;
    document.getElementById("statAvg").innerText = avg.toFixed(2);
}

// ---------------------------Chart-----------------------------
function renderCharts(data) {
    const cats = {};
    data.forEach(e => {
        const cat = e.category || "Other";
        cats[cat] =
            (cats[cat] || 0) + Number(e.amount);
    });
    const labels = Object.keys(cats);
    const values = Object.values(cats);
    // -----------------------Bar Chart------------------------
    const barCanvas =
        document.getElementById("expenseChart");
    if (barCanvas) {
        if (window.barChartInst) {
            window.barChartInst.destroy();
        }
        window.barChartInst = new Chart(barCanvas, {
            type: "bar",
            data: {
                labels: labels,
                datasets: [{
                    label: "Expenses ₹",
                    data: values,
                    backgroundColor: CHART_COLORS,
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
    // -----------------------Pai Chart---------------------------
    const pieCanvas =
        document.getElementById("pieChart");
    if (pieCanvas) {
        if (window.pieChartInst) {
            window.pieChartInst.destroy();
        }
        window.pieChartInst = new Chart(pieCanvas, {
            type: "doughnut",
            data: {
                labels: labels,
                datasets: [{
                    data: values,
                    backgroundColor: CHART_COLORS
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "55%"
            }
        });
    }
}

// ---------------------------Report Table----------------------
function renderReportTable(data) {
    const tbody =
        document.getElementById("reportTableBody");
    if (!tbody) return;
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">
                    No Data
                </td>
            </tr>
        `;
        return;
    }
    tbody.innerHTML = data.map((e, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${e.title}</td>
            <td>${e.category}</td>
            <td style="text-align:right;">
                ₹${Number(e.amount).toFixed(2)}
            </td>
            <td>
                ${e.created_at || "-"}
            </td>
        </tr>
    `).join("");
}

// ---------------------------Save Profile ---------------------
function saveProfile() {
    const name = document.getElementById("profileName").value.trim();
    const email = document.getElementById("profileEmail").value.trim();
    if (!name || !email) {
        showToast("Please fill both fields", "danger");
        return;
    }
    if (currentUser) {
        currentUser.name = name;
        currentUser.email = email;
        document.getElementById("userName").innerText = name;
        document.getElementById("userEmail").innerText = email;
        document.getElementById("userAvatar").innerText = name.charAt(0).toUpperCase();
        showToast("Profile saved ✓");
    } else {
        showToast("Login first", "danger");
    }
}

// ---------------------------Toggle Theme ---------------------
function toggleTheme() {
    document.body.classList.toggle('light');
    const isDark = !document.body.classList.contains('light');
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.textContent = isDark ? '☀' : '🌙';
}

// --------------------------- Reset App ------------------------
async function resetApp() {
    if (!currentUser) { showToast("Login first", "danger"); return; }
    if (!confirm("Delete ALL expenses from database? This cannot be undone.")) return;
    try {
        const res = await fetch(`${BASE_URL}/expenses`);
        const data = await res.json();
        await Promise.all(
            data.map(e => fetch(`${BASE_URL}/delete-expense/${e.id}`, { method: "DELETE" }))
        );
        loadExpenses();
        showToast("All expenses cleared", "danger");
    } catch (err) {
        console.log(err);
        showToast("Error clearing expenses", "danger");
    }
}

// ---------------------------PDF Download----------------------
function downloadReport() {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        // -------------------Title-----------------------------
        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.text("ExpenseIQ Report", 20, 20);
        // -------------------Date------------------------------
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        const today = new Date().toLocaleDateString("en-IN");
        doc.text(`Generated On: ${today}`, 20, 30);
        // -------------------Header----------------------------
        let y = 45;
        doc.setFont("helvetica", "bold");
        doc.text("No", 20, y);
        doc.text("Title", 35, y);
        doc.text("Category", 100, y);
        doc.text("Amount", 150, y);
        y += 5;
        doc.line(20, y, 190, y);
        y += 10;
        // -------------------Table Row-------------------------
        const rows = document.querySelectorAll("#reportTableBody tr");
        let total = 0;
        doc.setFont("helvetica", "normal");
        rows.forEach((row, index) => {
            const cols = row.querySelectorAll("td");
            if (cols.length < 4) return;
            const title =
                cols[1].innerText;
            const category =
                cols[2].innerText;
            const amountText =
                cols[3].innerText;
            // -------------------Clean Number------------------
            const amount =
                parseFloat(
                    amountText.replace(/[^\d.]/g, "")
                ) || 0;
            total += amount;
            /// -------------------Print Row--------------------
            doc.text(String(index + 1), 20, y);
            doc.text(
                title.substring(0, 25),
                35,
                y
            );
            doc.text(
                category.substring(0, 15),
                100,
                y
            );
            doc.text(
                `Rs. ${amount.toFixed(2)}`,
                150,
                y
            );
            y += 10;
            // -------------------New Page-----------------------
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
        });
        // -------------------Total------------------------------
        y += 5;
        doc.line(20, y, 190, y);
        y += 12;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.text(
            `Total Expense: Rs. ${total.toFixed(2)}`,
            20, y
        );
        // -------------------Save-------------------------------
        doc.save("Expense_Report.pdf");
        showToast("PDF Downloaded");
    } catch (err) {
        console.log(err);
        showToast("PDF Error", "danger");
    }
}