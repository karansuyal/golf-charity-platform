# ⛳ Golf Charity Platform

A full-stack subscription-based golf platform combining performance tracking, monthly prize draws, and charitable giving. Built for the **Digital Heroes** Full-Stack Developer selection process.

---

## 🚀 Live Demo

🔗 **Live URL:** [https://golf-charity-platform-ivory.vercel.app](https://golf-charity-platform-ivory.vercel.app)

---

## 📋 Project Overview

The platform allows golfers to:
- Subscribe monthly or yearly
- Enter golf scores (Stableford format, 1-45)
- Participate in monthly draws (Random or Algorithmic)
- Support charities with minimum 10% contribution
- Win prizes based on score matches
- Upload proof for verification

---

## 👥 User Roles

| Role | Capabilities |
|------|--------------|
| **Public Visitor** | View concept, explore charities, understand draw mechanics |
| **Registered Subscriber** | Manage profile, enter scores, select charity, view winnings |
| **Administrator** | Manage users, run draws, verify winners, manage charities |

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 18 + Vite |
| **Styling** | Tailwind CSS |
| **Backend** | Supabase (PostgreSQL, Auth, Storage) |
| **Deployment** | Vercel |
| **Version Control** | Git + GitHub |

---

## ✨ Features Implemented

### ✅ User Features
- Signup / Login with email
- Dashboard with subscription status
- Score entry with 5-score rolling logic (auto replaces oldest)
- Charity selection (12+ charities, featured section)
- Winnings overview with proof upload
- Delete scores

### ✅ Admin Features
- Overview stats (users, subscriptions, scores, prize pool)
- User management (activate/deactivate, update charity %, change charity)
- Score management (view/edit/delete all scores)
- Charity management (add/edit/delete charities)
- Draw management (Random & Algorithmic draw types)
- Simulation mode before publishing
- Winner verification (approve & pay)
- Reports & analytics

### ✅ Draw System
- **Random Draw:** Lottery-style random number generation
- **Algorithmic Draw:** Based on most frequent player scores
- Prize distribution: 40% (5-match), 35% (4-match), 25% (3-match)
- Jackpot rollover for unclaimed 5-match winners

### ✅ Winner Verification
- Users upload proof screenshots
- Admin approves/rejects
- Payment status: Pending → Paid

---

## 🗄️ Database Schema

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles with subscription status and charity selection |
| `charities` | Charity listings with name, description, image, featured flag |
| `scores` | User golf scores (1-45) with dates |
| `draws` | Monthly draws with winning numbers and type |
| `winners` | Winners with match count, prize amount, payment status |

---

## 🔧 Local Development

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Supabase account

### Setup Instructions

1. **Clone the repository**
```bash
git clone https://github.com/karansuyal/golf-charity-platform.git