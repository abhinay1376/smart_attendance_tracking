# Smart Attendance Tracking System

> A full-stack Progressive Web Application for automated, offline-capable attendance management in academic institutions — built with a role-based access model for Heads of Department, Faculty, and Students.

**Live Demo → [smart-attendance-tracking.vercel.app](https://smart-attendance-tracking.vercel.app)**

---

## Problem Statement

Traditional attendance systems in colleges rely on paper sheets or spreadsheets that are prone to errors, hard to audit, and offer no real-time visibility to students. Faculty often struggle to reconcile offline records when connectivity is poor, and administrators have no unified view of attendance trends across departments.

Smart Attendance solves this by providing:

- A **calendar-driven marking flow** that works offline and syncs automatically when connectivity is restored
- **Role-specific dashboards** so every stakeholder sees exactly what they need
- **Real-time risk indicators** that flag students who are at risk of attendance shortage before it becomes a problem
- A **ticket-based helpdesk** for raising and resolving attendance disputes end-to-end

---

## Features

### Head of Department (Admin)
- Approve or reject faculty signup requests
- Manage subjects, assign faculty, manage holiday calendar
- View attendance records across all subjects and students
- Add students individually or in bulk (Excel upload)
- View live helpdesk tickets raised by students

### Faculty
- Register and wait for HoD approval before access
- Mark attendance for assigned subjects on a calendar interface
- Modify attendance date inline without navigating back
- Export attendance reports to Excel
- View and respond to helpdesk tickets from students

### Student
- View subject-wise attendance summary with progress bars
- Risk indicator highlighting subjects below 75% threshold
- Raise helpdesk tickets directly to specific faculty members
- Fully functional in offline mode — syncs when reconnected

### System-Wide
- PWA — installable on mobile and desktop
- Offline attendance marking with IndexedDB queue and background sync
- Keep-alive mechanism to prevent Render cold starts
- Warming-up UX banner when the backend is waking up

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Client (Browser / PWA)                  │
│                                                          │
│   React 18 + Vite + TypeScript                          │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│   │  HoD UI  │ │Faculty UI│ │Student UI│               │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘               │
│        └────────────┼────────────┘                       │
│              React Router v6                             │
│              Custom Hooks + Context                      │
│              ┌──────────────────────┐                    │
│              │  Service Worker (PWA)│                    │
│              │  IndexedDB (offline) │                    │
│              └──────────────────────┘                    │
└───────────────────────┬─────────────────────────────────┘
                        │ HTTPS + JWT Bearer Token
┌───────────────────────▼─────────────────────────────────┐
│              Express API (Render — Node.js 18)           │
│                                                          │
│  /auth      → Login for all roles                        │
│  /admin     → Faculty/Student/Subject/Holiday management │
│  /faculty   → Attendance marking, reports, students      │
│  /student   → Own attendance, subjects, helpdesk         │
│  /health    → Keep-alive ping endpoint                   │
│                                                          │
│  Middleware: JWT auth · Role guard · Helmet · Morgan      │
└───────────────────────┬─────────────────────────────────┘
                        │ Mongoose ODM
┌───────────────────────▼─────────────────────────────────┐
│                   MongoDB Atlas (Cloud)                  │
│                                                          │
│  students · faculties · subjects · attendance            │
│  holidays · tickets                                      │
└─────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
| Category | Technology |
|----------|-----------|
| Framework | React 18 |
| Language | TypeScript 5.6 |
| Build Tool | Vite 5 |
| Routing | React Router DOM v6 |
| Styling | Tailwind CSS v3 + CSS custom properties |
| UI Components | shadcn/ui (Radix UI primitives) |
| Icons | Lucide React |
| Charts | Recharts |
| Excel Export | SheetJS (xlsx) |
| PWA | vite-plugin-pwa + Workbox |
| Offline Storage | IndexedDB (custom service layer) |
| State Management | React Hooks + Context (no external store) |

### Backend
| Category | Technology |
|----------|-----------|
| Runtime | Node.js ≥ 18 |
| Framework | Express 4 |
| Language | TypeScript 5.4 |
| Database | MongoDB Atlas via Mongoose 8 |
| Authentication | JWT (7-day expiry) |
| Password Hashing | bcryptjs |
| Security Headers | Helmet |
| Logging | Morgan |
| Environment Config | dotenv |

### Infrastructure
| Concern | Tool |
|---------|------|
| Frontend Hosting | Vercel |
| Backend Hosting | Render (free tier) |
| Database | MongoDB Atlas (free tier) |
| Version Control | Git + GitHub |

---

## Folder Structure

```
Smart_Attendance/
│
├── src/                          # Frontend source
│   ├── components/               # Reusable UI components
│   │   ├── attendance/           # AttendanceCalendar, session cards
│   │   ├── auth/                 # Login form, protected route wrappers
│   │   ├── faculty/              # Faculty-specific shared components
│   │   ├── layout/               # Sidebar, TopBar, Shell layout
│   │   ├── notifications/        # Toast triggers, notification bell
│   │   ├── sync/                 # Sync status indicator (online/offline)
│   │   └── ui/                   # shadcn/ui primitive components
│   │
│   ├── pages/                    # Route-level page components
│   │   ├── hod/                  # HoDDashboard, HodAttendance, Faculty mgmt
│   │   ├── faculty/              # MarkAttendance, Reports, Helpdesk
│   │   └── student/              # Dashboard, Attendance, Helpdesk
│   │
│   ├── hooks/                    # Custom React hooks
│   │   ├── useAttendance.ts      # HoD-level attendance data
│   │   ├── useMarkAttendance.ts  # Faculty marking logic
│   │   └── useStudentAttendance.ts # Student attendance + risk calc
│   │
│   ├── services/                 # External integrations
│   │   ├── api.ts                # All HTTP client calls + interfaces
│   │   ├── db.ts                 # IndexedDB operations (offline queue)
│   │   ├── sync.ts               # Background sync — offline → server
│   │   └── keepAlive.ts          # 14-min health ping (Render cold start)
│   │
│   ├── context/                  # React Context providers (auth state)
│   ├── config/                   # App-level constants and config
│   ├── types/                    # Shared TypeScript type definitions
│   ├── utils/                    # Pure utility functions
│   └── data/                     # Static seed/reference data
│
└── backend/                      # Backend source
    └── src/
        ├── models/               # Mongoose schemas
        │   ├── Student.ts        # name, email, regNo (hashed), rollNo (plain)
        │   ├── Faculty.ts        # name, email, password, approved, subjects
        │   ├── Subject.ts        # code, name, faculty reference
        │   ├── Attendance.ts     # studentId, subjectId, date, status, active
        │   ├── Holiday.ts        # date, name
        │   └── Ticket.ts         # helpdesk tickets (from, to, message, status)
        │
        ├── controllers/          # Business logic handlers
        │   ├── adminController.ts
        │   ├── facultyController.ts
        │   ├── studentController.ts
        │   └── authController.ts
        │
        ├── routes/               # Express route definitions
        │   ├── admin.ts
        │   ├── faculty.ts
        │   ├── student.ts
        │   └── auth.ts
        │
        ├── middleware/           # Auth guard, role check, error handler
        ├── config/               # DB connection, environment loader
        └── types/                # Backend TypeScript interfaces
```

---

## Setup Instructions

### Prerequisites
- Node.js ≥ 18
- A MongoDB Atlas cluster (free tier works)
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/abhinay1376/smart_attendance_tracking.git
cd smart_attendance_tracking
```

### 2. Backend Setup

```bash
cd backend
cp ../.env.example .env       # fill in your values
npm install
npm run build
npm start
```

For local development with hot reload:
```bash
npm run dev:local
```

### 3. Frontend Setup

```bash
cd ..                         # back to project root
cp .env.example .env.local    # fill in VITE_API_BASE_URL
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

### Backend — `backend/.env`

```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/smart_attendance
JWT_SECRET=your_super_secret_jwt_key_here
PORT=3000
```

### Frontend — `.env.local`

```env
VITE_API_BASE_URL=https://your-backend.onrender.com
```

See `.env.example` at the project root for the full template.

---

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Head of Department | `admin@gmail.com` | `admin123` |
| Faculty | `faculty@gmail.com` | `faculty123` |
| Student | `student@gmail.com` | `student123` |

> ⚠ These are seeded demo accounts only. Change credentials before any production use.

---

## Deployment

### Frontend — Vercel
1. Connect your GitHub repository to [vercel.com](https://vercel.com)
2. Set the **Root Directory** to `/` (project root)
3. Add environment variable: `VITE_API_BASE_URL` → your Render backend URL
4. Deploy — Vercel handles build and CDN automatically

### Backend — Render
1. Create a new **Web Service** on [render.com](https://render.com)
2. Set **Root Directory** to `backend`
3. **Build Command**: `npm install && npm run build`
4. **Start Command**: `node dist/index.js`
5. Add environment variables: `MONGO_URI`, `JWT_SECRET`, `PORT`

### Cold Start Mitigation
The free Render tier spins down after 15 minutes of inactivity. The frontend pings `/health` every 14 minutes to keep the server warm. Users also see a warming-up banner on the login screen if the server takes more than 4 seconds to respond.

---

## Offline Capability

When the device loses internet connectivity:
- Faculty can continue marking attendance — records are queued in **IndexedDB**
- A sync indicator in the UI shows pending records count
- On reconnection, the background sync service flushes queued records to the server automatically

---

## License

This project is for academic and demonstration purposes.
