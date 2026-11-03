# 🚀 LeadFlow CRM – Enterprise B2B SaaS & Revenue Platform

LeadFlow CRM is an enterprise-grade, multi-tenant B2B revenue and sales pipeline management platform inspired by HubSpot and Salesforce. It is built to streamline customer relationship management with real-time analytics, algorithmic lead scoring, multi-currency support, and robust team collaboration tools.

---

## ✨ Core Features

* **🏢 Multi-Tenant Workspaces & RBAC**: Secure organization isolation with 3-tier Role-Based Access Control (*Admin, Manager, Sales Representative*).
* **📊 Dual View Modes**: Seamless toggle between an interactive **Kanban Drag-and-Drop Board** and a full-screen **Spreadsheet Data Table**.
* **🤖 Algorithmic Lead Scoring Engine**: Automated `0–100` scoring based on deal value, stage progression, and engagement activity.
* **📈 Revenue Forecasting & Analytics**: Real-time KPI cards tracking gross pipeline volume, weighted forecast revenue, win velocity, and visual stage retention funnels using `Recharts`.
* **💬 HubSpot-Style Slide-Over Drawer**: Detailed lead hub featuring 4 interactive tabs:
  * *Slack-Style Team Chat & Comments*
  * *Call Logging & Interaction Outcomes (Connected, Voicemail, Meeting Booked)*
  * *Follow-up Tasks & Reminders Checklist*
  * *In-App Direct Email Sender with 1-Click Templates*
* **📥 CSV Data Management**: Built-in bulk CSV lead importer with automated duplicate email detection and 1-click CSV data export.
* **⚠️ SLA Stale Lead Alerts**: Automated warning banners for deals untouched for 3+ days in early sales stages.

---

## 🛠️ Tech Stack

* **Frontend**: React, Vite, Tailwind CSS, Lucide Icons, Recharts, Axios
* **Backend**: Node.js, Express.js, Mongoose ODM
* **Database**: MongoDB Atlas (Cloud NoSQL)
* **Deployment & Cloud**: Vercel (Frontend), Render (Backend)

---

## 📂 Project Directory Structure

```text
leadflow-crm/
├── backend/
│   ├── models/        # Mongoose Schemas (Lead, User, Workspace)
│   ├── routes/        # API Endpoints (Auth, Leads, Analytics)
│   ├── middleware/    # JWT Authentication & RBAC
│   └── server.js      # Express Server Entry Point
├── frontend/
│   ├── src/
│   │   ├── api.js     # Axios Client Configuration
│   │   └── App.jsx    # Complete Enterprise UI & Dashboard
│   └── package.json
└── README.md
