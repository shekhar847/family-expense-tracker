# 💰 ExpenseIQ — Smart Family Expense Tracker (PERN Stack)

<p align="center">
  <img src="frontend/Image/ExpenseIQ-logo.png" alt="ExpenseIQ Logo" width="120" />
</p>

<p align="center">
  <b>A modern, AI-powered PERN stack web application designed to manage personal and family expenses, visualize spending trends, and scan receipts using Gemini AI.</b>
</p>

<p align="center">
  <a href="https://family-expense-tracker-orcin.vercel.app"><img src="https://img.shields.io/badge/Live-Frontend-success?style=for-the-badge&logo=vercel" alt="Live App" /></a>
  <a href="https://expense-tracker-backend-j2h7.onrender.com"><img src="https://img.shields.io/badge/Live-Backend-blue?style=for-the-badge&logo=render" alt="Live API" /></a>
  <img src="https://img.shields.io/badge/Stack-PERN-darkgreen?style=for-the-badge&logo=postgresql" alt="PERN Stack" />
  <img src="https://img.shields.io/badge/AI-Google_Gemini-orange?style=for-the-badge&logo=google" alt="Gemini AI" />
</p>

---

## 🌐 Live Demos

* **Frontend Application**: [family-expense-tracker-orcin.vercel.app](https://family-expense-tracker-orcin.vercel.app)
* **Backend API**: [expense-tracker-backend-j2h7.onrender.com](https://expense-tracker-backend-j2h7.onrender.com)

---

## ✨ Features

- 🤖 **Gemini AI Receipt Scanner**: Upload receipts (JPEG, PNG, WebP) or PDF invoices, and Google's Gemini AI (`gemini-3.6-flash`) automatically extracts transaction title, amount, category, and notes.
- 🤖 **AI Spending Advice**: Receive personalized spending insights and financial advice powered by AI based on your expense history.
- 🔐 **Secure Authentication & OAuth**: Full authentication workflow supporting standard Email/Password registration, bcrypt password hashing, Password Reset, and **Google One-Tap OAuth 2.0 login**.
- 👨‍👩‍👧‍👦 **Family Member Management**: Add and assign specific expenses to individual family members or track personal (`Self`) transactions seamlessly.
- 📊 **Analytics & Visual Dashboards**: Interactive charts built with Chart.js displaying:
  - Category-wise Expense Distribution
  - 6-Month Monthly Spending Trends
  - Month-over-Month Category Comparison
- 💸 **Complete Expense Management**: Create, Edit, Delete, Tag, Filter, and Search transactions with category tagging (`Food`, `Travel`, `Shopping`, `Rent`, `Medicine`, `Other`).
- 🤝 **Udhar (Loan) Tracker**: Manage personal debts, track money lent or borrowed, and update settlement statuses.
- 🏛️ **EMI Tracker**: Monitor Equated Monthly Installments, track principal, interest, and payment progress for active loans.
- 🖼️ **Cloudinary Avatar Uploads**: Profile picture upload integrated with Cloudinary cloud storage.
- 🌙 **Modern Dark Theme UI**: Sleek dark aesthetic (`#0e0f11` with neon `#c8f135` accents) with responsive design for desktop, tablet, and mobile devices.
- 📱 **Progressive Web App (PWA)**: Web Manifest configuration ready for standalone installation.

---

## 🛠️ Tech Stack

### **Frontend**
* **HTML5 & Modern CSS3**: Custom styles, responsive grid/flex layouts, CSS animations, glassmorphism.
* **JavaScript (ES6+)**: Async/Await, Fetch API, dynamic DOM manipulation.
* **Chart.js**: Dynamic data visualization for financial metrics.
* **Google Identity Services API**: Seamless Google Login.

### **Backend**
* **Node.js & Express.js**: RESTful API web server framework.
* **PostgreSQL (`pg` Pool)**: Relational database for transactional integrity and persistence.
* **Google Generative AI SDK**: Intelligent receipt and invoice document parsing (`@google/generative-ai`).
* **Cloudinary SDK**: Cloud image storage for user avatars.
* **Bcryptjs & JWT / OAuth2**: Encryption and authentication library.
* **Multer**: Memory storage middleware for file uploads.

---

## 📂 Project Structure

```
Family-Expense-Tracker
│
├── 📂 frontend
│   ├── 📂 css
│   │   └── style.css            # Main stylesheet (Dark theme & layout)
│   ├── 📂 js
│   │   └── script.js           # Client logic, API requests & chart rendering
│   ├── 📂 Image
│   │   └── ExpenseIQ-logo.png  # Brand identity assets
│   ├── index.html              # Main single-page interface
│   └── manifest.json           # PWA configuration
│
└── 📂 backend
    ├── 📂 controllers
    │   ├── authController.js    # Authentication & user profile handlers
    │   └── expenseController.js # CRUD handlers for expenses
    ├── 📂 middleware
    ├── 📂 routes
    │   ├── authRoutes.js       # Auth & Profile routes
    │   └── expenseRoutes.js    # Expense routes
    ├── .env                    # Environment variables configuration
    ├── db.js                   # PostgreSQL pool connection
    ├── server.js               # Express app, tables init & Gemini AI scan endpoint
    └── package.json            # Backend dependencies
```

---

## ⚙️ Environment Variables

Create a `.env` file in the `backend/` directory with the following variables:

```env
PORT=5000
DATABASE_URL=postgresql://<user>:<password>@<host>:<port>/<database>?sslmode=require
GEMINI_API_KEY=your_google_gemini_api_key
CLOUDINARY_CLOUD_NAME=dsa7qrchz
CLOUDINARY_API_KEY=674292933575328
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
```

---

## 🗄️ Database Schema

The database automatically initializes the following tables upon server startup (`server.js`):

### `public.users`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` |
| `name` | `TEXT` | `NOT NULL` |
| `email` | `TEXT` | `UNIQUE NOT NULL` |
| `password` | `TEXT` | `NOT NULL` |
| `avatar` | `TEXT` | `DEFAULT NULL` |

### `public.family_members`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` |
| `user_id` | `INTEGER` | `REFERENCES users(id)` |
| `name` | `TEXT` | `NOT NULL` |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` |

### `public.expenses`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` |
| `user_id` | `INTEGER` | `REFERENCES users(id)` |
| `title` | `TEXT` | `NOT NULL` |
| `amount` | `NUMERIC(10,2)` | `NOT NULL` |
| `category` | `TEXT` | `NOT NULL` |
| `member_name` | `TEXT` | `DEFAULT 'Self'` |
| `member_id` | `INTEGER` | `DEFAULT NULL` |
| `tag` | `TEXT` | `DEFAULT ''` |
| `notes` | `TEXT` | `DEFAULT ''` |
| `date` | `DATE` | `DEFAULT CURRENT_DATE` |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` |

### `public.loans`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` |
| `user_id` | `INTEGER` | `REFERENCES users(id)` |
| `person_name` | `TEXT` | |
| `type` | `TEXT` | |
| `amount` | `NUMERIC(10,2)` | |
| `status` | `TEXT` | `DEFAULT 'Pending'` |
| `date` | `DATE` | `DEFAULT CURRENT_DATE` |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` |

### `public.emis`
| Column | Type | Constraints |
| :--- | :--- | :--- |
| `id` | `SERIAL` | `PRIMARY KEY` |
| `user_id` | `INTEGER` | `REFERENCES users(id)` |
| `title` | `TEXT` | |
| `principal` | `NUMERIC(10,2)` | |
| `interest_rate`| `NUMERIC(5,2)` | |
| `tenure_months`| `INTEGER` | |
| `emi_amount` | `NUMERIC(10,2)` | |
| `total_payable`| `NUMERIC(10,2)` | |
| `amount_paid` | `NUMERIC(10,2)` | `DEFAULT 0` |
| `status` | `TEXT` | `DEFAULT 'Active'` |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` |

---

## ⚡ Installation & Local Setup

### 1. Clone the Repository

```bash
git clone https://github.com/shekhar847/family-expense-tracker.git
cd family-expense-tracker
```

### 2. Setup Backend

```bash
cd backend
npm install
```

Configure your environment variables in `backend/.env`, then run:

```bash
# Development server (with hot-reload)
npm run dev

# Production server
npm start
```
*Backend server will start at `http://localhost:5000`.*

### 3. Setup Frontend

Simply serve the `frontend` folder or open `frontend/index.html` in your browser. Alternatively, use VS Code Live Server or Vite/http-server:

```bash
cd ../frontend
npx http-server -p 3000
```
*Frontend application will be accessible at `http://localhost:3000`.*

---

## 📡 API Endpoints Reference

### **Authentication**
- `POST /register` — Register a new account
- `POST /login` — Authenticate user credentials
- `POST /google-login` — Verify Google OAuth credential token
- `POST /upload-avatar` — Upload profile photo to Cloudinary
- `PUT /update-profile` — Update user profile details
- `PUT /change-password` — Change account password
- `POST /reset-password` — Reset account password

### **Expenses & Family**
- `GET /expenses/:user_id` — Fetch user's expense list
- `POST /add-expense` — Create a new expense entry
- `PUT /edit-expense/:id` — Update an existing expense entry
- `DELETE /delete-expense/:id` — Remove an expense entry
- `GET /family-members/:user_id` — Fetch registered family members
- `POST /add-family-member` — Add a new family member
- `DELETE /delete-family-member/:id` — Remove a family member

### **Loans & EMIs**
- `GET /api/loans/:user_id` — Fetch user's Udhar/Loans
- `POST /api/add-loan` — Create a new Udhar/Loan entry
- `PUT /api/update-loan-status/:id` — Update loan settlement status
- `DELETE /api/delete-loan/:id` — Delete a loan record
- `GET /api/emis/:user_id` — Fetch user's EMIs
- `POST /api/emis` — Create a new EMI tracker
- `PUT /api/emis/:id/pay` — Log an EMI payment
- `DELETE /api/emis/:id` — Delete an EMI tracker

### **Analytics & AI**
- `GET /monthly-trend/:user_id` — Fetch 6-month historical spending totals
- `GET /monthly-comparison/:user_id` — Compare current month vs last month by category
- `POST /scan-receipt` — Scan receipt/PDF using Gemini AI (`gemini-3.6-flash`)

---

## 👨‍💻 Author

**Shekhar Kumar**  
- **GitHub**: [@shekhar847](https://github.com/shekhar847)  
- **Project Repository**: [family-expense-tracker](https://github.com/shekhar847/family-expense-tracker)

---

## 📜 License

This project is licensed under the [ISC License](LICENSE).
