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

function toggleSidebar() {
    const sidebar = document.querySelector(".sidebar");
    sidebar.classList.toggle("open");
}
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

        // Spinner show karo
        document.getElementById("loginCard").style.display = "none";
        document.getElementById("loadingSpinner").style.display = "block";

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

        // Spinner hide karo
        document.getElementById("loadingSpinner").style.display = "none";

        if (data.user) {
            currentUser = data.user;
            document.getElementById("userName").innerText = data.user.name;
            document.getElementById("userEmail").innerText = data.user.email;
            document.getElementById("userAvatar").innerText = data.user.name.charAt(0).toUpperCase();
            document.getElementById("dashboardContent").style.display = "block";
            document.getElementById("sidebarUser").style.display = "block";
            document.getElementById("footerBadges").style.display = "flex";
            showToast("Login Successful");
            loadExpenses();
        } else {
            // Login fail hone pe wapas login card dikhao
            document.getElementById("loginCard").style.display = "block";
            showToast(data.message || "Invalid Credentials", "danger");
        }
    } catch (err) {
        document.getElementById("loadingSpinner").style.display = "none";
        document.getElementById("loginCard").style.display = "block";
        console.log(err);
        showToast("Server Error", "danger");
    }
}

async function registerUser() {
    try {
        const name = document.getElementById("regName").value.trim();
        const email = document.getElementById("email").value.trim();
        const password = document.getElementById("password").value.trim();
        if (!name || !email || !password) {
            showToast("Sab fields bharo", "danger");
            return;
        }
        const res = await fetch(`${BASE_URL}/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, email, password })
        });
        const data = await res.json();
        if (data.user) {
            showToast("Registered! Ab login karo");
            document.getElementById("nameGroup").style.display = "none";
        } else {
            showToast(data.error || "Error", "danger");
        }
    } catch (err) {
        showToast("Server Error", "danger");
    }
}

function showRegisterForm() {
    const nameGroup = document.getElementById("nameGroup");
    if (nameGroup.style.display === "none") {
        nameGroup.style.display = "block";
    } else {
        registerUser();
    }
}

// ---------------------------Logout----------------------------
function logout() {
    currentUser = null;
    document.getElementById("userName").innerText = "Guest User";
    document.getElementById("userEmail").innerText = "Not logged in";
    document.getElementById("userAvatar").innerText = "?";
    document.getElementById("dashboardContent").style.display = "none";
    document.getElementById("loginCard").style.display = "block";
    document.getElementById("sidebarUser").style.display = "none";
    document.getElementById("footerBadges").style.display = "none";
    showToast("Logged out", "danger");
}

// ---------------------------Add Expense-----------------------
async function addExpense() {
    if (!currentUser) {
        showToast("Login first", "danger");
        return;
    }
    const title = document.getElementById("title").value.trim();
    const amount = document.getElementById("amount").value.trim();
    const category = document.getElementById("category").value;

    if (!title || !amount || !category) {
        showToast("Fill all fields", "danger");
        return;
    }
    // Amount validation
    if (Number(amount) <= 0) {
        showToast("Amount 0 se zyada hona chahiye", "danger");
        return;
    }
    if (Number(amount) > 1000000) {
        showToast("Amount bahut zyada hai", "danger");
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
        document.getElementById("loadingSpinner").style.display = "block";
        const res = await fetch(`${BASE_URL}/expenses/${currentUser.id}`);
        const data = await res.json();
        document.getElementById("loadingSpinner").style.display = "none";
        renderExpenseList(data);
        updateStats(data);
        renderCharts(data);
        renderReportTable(data);
        renderRecentExpenses(data);
        checkBudget();
    } catch (err) {
        document.getElementById("loadingSpinner").style.display = "none";
        showToast("Server se connect nahi ho pa raha, please wait...", "danger");
        console.log(err);
    }
}

// ---------------------------Expense List----------------------
function renderExpenseList(data) {
    const container =
        document.getElementById("expenseListContainer");
    if (!container) return;
    const badge = document.getElementById("expenseCountBadge");
    if (badge) badge.innerText = `${data.length} entries`;
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
            <span class="expense-date" style="font-size:11px;color:var(--text3);">
                ${e.date ? new Date(e.date).toLocaleDateString("en-IN") : "-"}
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

function renderRecentExpenses(data) {
    const container = document.getElementById("recentExpenses");
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🗒</div>
                <p>No expenses yet</p>
            </div>
        `;
        return;
    }

    const recent = data.slice(0, 5);
    container.innerHTML = recent.map(e => `
        <div class="expense-item">
            <span class="expense-cat-badge">${e.category}</span>
            <span class="expense-title">${e.title}</span>
            <span class="expense-date" style="font-size:11px;color:var(--text3);">
                ${e.date ? new Date(e.date).toLocaleDateString("en-IN") : "-"}
            </span>
            <span class="expense-amount">₹${Number(e.amount).toFixed(2)}</span>
        </div>
    `).join("");
}

// ---------------------------Delete----------------------------
async function deleteExpense(id) {
    if (!confirm("Are you sure you want to delete this expense?")) return;
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

// ---------------------------Filter Expenses-------------------
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

function filterByMonth() {
    const filter = document.getElementById("filterMonth").value;
    const items = document.querySelectorAll(".expense-item");

    // Pehle sab show karo
    items.forEach(item => item.style.display = "");

    if (filter === "all") return;

    const now = new Date();
    items.forEach(item => {
        const dateText = item.querySelector(".expense-date")?.innerText?.trim();
        if (!dateText) return;

        const parts = dateText.split("/");
        const itemDate = new Date(parts[2], parts[1] - 1, parts[0]);

        if (filter === "this") {
            item.style.display = (
                itemDate.getMonth() === now.getMonth() &&
                itemDate.getFullYear() === now.getFullYear()
            ) ? "" : "none";
        } else if (filter === "last") {
            const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
            const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
            item.style.display = (
                itemDate.getMonth() === lastMonth &&
                itemDate.getFullYear() === lastYear
            ) ? "" : "none";
        }
    });
}

function filterReport() {
    const filter = document.getElementById("reportFilter").value;
    const rows = document.querySelectorAll("#reportTableBody tr");
    const now = new Date();

    rows.forEach(row => {
        if (filter === "all") {
            row.style.display = "";
            return;
        }
        const dateText = row.querySelectorAll("td")[4]?.innerText?.trim();
        if (!dateText) return;

        const parts = dateText.split("/");
        const rowDate = new Date(parts[2], parts[1] - 1, parts[0]);

        if (filter === "this") {
            row.style.display = (
                rowDate.getMonth() === now.getMonth() &&
                rowDate.getFullYear() === now.getFullYear()
            ) ? "" : "none";
        } else if (filter === "last") {
            const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
            const lastYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
            row.style.display = (
                rowDate.getMonth() === lastMonth &&
                rowDate.getFullYear() === lastYear
            ) ? "" : "none";
        }
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

    // -----------------------Mini Chart (Dashboard)---------------------------
    const miniCanvas = document.getElementById("miniChart");
    if (miniCanvas) {
        if (window.miniChartInst) {
            window.miniChartInst.destroy();
        }
        window.miniChartInst = new Chart(miniCanvas, {
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
    const tbody = document.getElementById("reportTableBody");
    if (!tbody) return;
    if (data.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5">No Data</td>
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
                ${e.date ? new Date(e.date).toLocaleDateString("en-IN") : "-"}
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

function saveBudget() {
    const budget = Number(document.getElementById("budgetInput").value);
    if (!budget || budget <= 0) {
        showToast("Valid budget daalo", "danger");
        return;
    }
    localStorage.setItem("monthlyBudget", budget);
    showToast("Budget saved!");
    checkBudget();
}

function checkBudget() {
    const budget = Number(localStorage.getItem("monthlyBudget"));
    if (!budget) return;

    const total = Number(document.getElementById("statMonth").innerText);
    const status = document.getElementById("budgetStatus");
    const remaining = budget - total;

    if (remaining < 0) {
        status.innerHTML = `<span style="color:var(--red);">⚠ Budget exceed ho gaya! ₹${Math.abs(remaining).toFixed(2)} zyada kharch kiya</span>`;
        showToast(`⚠ Budget exceed! ₹${Math.abs(remaining).toFixed(2)} zyada`, "danger");
    } else {
        status.innerHTML = `<span style="color:#3dd9a4;">✓ ₹${remaining.toFixed(2)} remaining this month</span>`;
    }

    // Budget input mein saved value dikhao
    document.getElementById("budgetInput").value = budget;
}