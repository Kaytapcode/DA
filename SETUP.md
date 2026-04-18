# 🚀 TINY-LMS PROJECT - ENVIRONMENT SETUP GUIDE

Complete guide to setting up the development environment for TINY-LMS (Backend + Frontend) on a new computer.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Quick Start (Automated)](#quick-start-automated)
3. [Manual Setup (Step-by-Step)](#manual-setup-step-by-step)
4. [Verify Installation](#verify-installation)
5. [Running the Project](#running-the-project)
6. [Troubleshooting](#troubleshooting)
7. [Folder Structure](#folder-structure)

---

## 📦 Prerequisites

Before running setup, ensure you have these installed on your computer:

### Required Software

| Software | Version | Download Link |
|----------|---------|---------------|
| **.NET SDK** | 9.0+ | [https://dotnet.microsoft.com/download](https://dotnet.microsoft.com/download) |
| **Node.js** | 18.0+ | [https://nodejs.org](https://nodejs.org) |
| **PostgreSQL** | 8.0+ | [https://www.postgresql.org/download/](https://www.postgresql.org/download/) |
| **Git** | Latest | [https://git-scm.com](https://git-scm.com) (optional but recommended) |

### Verify Prerequisites

Open **PowerShell** or **Command Prompt** and run:

```bash
dotnet --version      # Should show .NET 9.x.x
node --version        # Should show v18.x.x
npm --version         # Should show v9.x.x or higher
```

---

## 🚀 Quick Start (Automated)

### Option 1: PowerShell (Recommended for Windows)

This is the most feature-rich option with colored output and detailed logging.

```powershell
# Navigate to project root
cd D:\Github\DA-BE

# Run the setup script
.\setup-environment.ps1
```

**If you get a permission error:**

```powershell
# Run PowerShell as Administrator first
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Then run the script again
.\setup-environment.ps1
```

### Option 2: Batch File (Simple)

Simpler alternative for Command Prompt:

```cmd
# Navigate to project root
cd D:\Github\DA-BE

# Run the setup script
setup-environment.bat
```

### What the Scripts Do Automatically

✅ Checks all prerequisites (.NET, Node.js, npm)  
✅ Verifies project folder structure  
✅ Restores .NET packages (Backend)  
✅ Builds the Backend solution  
✅ Installs npm dependencies (Frontend)  
✅ Builds Frontend (TypeScript compilation)  
✅ Provides next steps for database setup  

**Expected Duration:** 5-8 minutes (depending on internet speed)

---

## 📝 Manual Setup (Step-by-Step)

If you prefer to set up manually or the scripts fail, follow these steps:

### Step 1: Clone the Repository (if needed)

```bash
git clone <repository-url>
cd DA-BE
```

### Step 2: Backend Setup

#### 2.1 Restore .NET Packages

```powershell
cd BE
dotnet restore
```

#### 2.2 Build Backend Solution

```powershell
dotnet build
```

#### 2.3 Install Entity Framework Core Tools (if needed)

```powershell
dotnet tool install --global dotnet-ef
```

### Step 3: Database Setup

#### 3.1 Ensure PostgreSQL is Running

**Windows:**
- Open **Services** (press `Win + R`, type `services.msc`)
- Find **postgresql-x64-*** (or your PostgreSQL version)
- Right-click → **Start** (if not already running)

**macOS:**
```bash
brew services start postgresql
```

**Linux:**
```bash
sudo systemctl start postgresql
```

#### 3.2 Create/Migrate Database

```powershell
cd BE\Auth.Api
dotnet ef database update
```

This creates the database schema based on Entity Framework migrations.

### Step 4: Frontend Setup

```powershell
cd FE
npm install
```

### Step 5: Verify Frontend Build

```powershell
npm run build
```

---

## ✅ Verify Installation

After setup completes, verify everything is installed correctly:

### Backend Check

```powershell
cd BE\Auth.Api
dotnet build
```

**Expected Output:** Should show "Build succeeded"

### Frontend Check

```powershell
cd FE
npm run build
```

**Expected Output:** Should show build files in `dist/` folder

### Check Ports

Ensure these ports are available (not used by other applications):
- **5173** - Frontend (Vite dev server)
- **7000** - Backend (Auth.Api)
- **7001** - Gateway (Reverse proxy)

Check with:

```powershell
netstat -ano | findstr "5173\|7000\|7001"
```

---

## 🏃 Running the Project

Once setup is complete, here's how to run the application:

### Terminal 1: Start PostgreSQL Server

**Windows:**
- Open Services → Start postgresql-x64-*
- Or use PostgreSQL Command Line Client

### Terminal 2: Run Backend

```powershell
cd BE\Auth.Api
dotnet run
```

**Expected Output:**
```
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://localhost:7000
```

### Terminal 3: Run Frontend

```powershell
cd FE
npm run dev
```

**Expected Output:**
```
VITE v7.3.1 ready in 123 ms

➜ Local:   http://localhost:5173/
```

### Access the Application

Open your browser and visit:

```
http://localhost:5173
```

---

## 🔧 Project Structure

```
DA-BE/
├── BE/                          # Backend (.NET Core)
│   ├── Auth.Api/               # Authentication & Main API
│   │   ├── Controllers/        # API endpoints
│   │   ├── Models/             # Data models
│   │   ├── Services/           # Business logic
│   │   ├── Data/               # Database & repositories
│   │   ├── Middleware/         # Custom middlewares
│   │   ├── Migrations/         # EF Core migrations
│   │   ├── appsettings.json    # Database configuration
│   │   └── Program.cs          # Application startup
│   ├── Gateway.Api/            # API Gateway (YARP reverse proxy)
│   ├── Shared.Contracts/       # DTOs & shared contracts
│   └── BEDoAn.sln              # Visual Studio solution
│
├── FE/                          # Frontend (React + Vite)
│   ├── src/
│   │   ├── pages/              # Page components
│   │   ├── components/         # Reusable components
│   │   ├── layouts/            # Layout components
│   │   ├── hooks/              # Custom React hooks
│   │   ├── utils/              # Utility functions
│   │   ├── types/              # TypeScript types
│   │   ├── constants/          # Constants
│   │   ├── App.tsx             # Main App component
│   │   └── main.tsx            # Entry point
│   ├── package.json            # NPM dependencies
│   ├── vite.config.ts          # Vite configuration
│   └── tsconfig.json           # TypeScript configuration
│
└── Documentation/              # Project documentation
    ├── setup-environment.ps1   # This setup script (PowerShell)
    ├── setup-environment.bat   # This setup script (Batch)
    ├── SETUP.md               # This guide
    ├── QUICK_START_TESTING.md # Quick start for testing
    ├── claude.md              # Project specifications
    └── TESTING_README.md      # Testing procedures
```

---

## 🐛 Troubleshooting

### Problem: ".NET SDK not found"

**Solution:**
1. Download from [https://dotnet.microsoft.com/download](https://dotnet.microsoft.com/download)
2. Install .NET 9.0 SDK (not runtime)
3. Restart PowerShell/Command Prompt
4. Run `dotnet --version` to verify

### Problem: "Node.js not found"

**Solution:**
1. Download from [https://nodejs.org](https://nodejs.org)
2. Install Node.js 18+ (includes npm)
3. Restart PowerShell/Command Prompt
4. Run `node --version` and `npm --version` to verify

### Problem: "PostgreSQL connection refused"

**Solution:**
1. Ensure PostgreSQL service is running (Windows Services)
2. Check connection string in `BE/Auth.Api/appsettings.json`
3. Default: `Host=127.0.0.1;Port=5432;Database=tiny_lms;Username=postgres;Password=postgres;`
4. Verify PostgreSQL credentials are correct
5. Try: `psql -U postgres -d tiny_lms -h 127.0.0.1 -p 5432` in Command Prompt to test manually

### Problem: "dotnet restore fails"

**Solution:**
1. Check internet connection
2. Clear NuGet cache: `dotnet nuget locals all --clear`
3. Try again: `dotnet restore`
4. If still failing, try: `dotnet restore --disable-parallel`

### Problem: "npm install hangs or fails"

**Solution:**
1. Clear npm cache: `npm cache clean --force`
2. Try again: `npm install`
3. If still failing, try: `npm install --legacy-peer-deps`

### Problem: "Port 5173 already in use"

**Solution:**
1. Find what's using the port:
   ```powershell
   netstat -ano | findstr "5173"
   ```
2. Kill the process:
   ```powershell
   taskkill /PID <PID> /F
   ```
3. Or start Vite on a different port:
   ```powershell
   npm run dev -- --port 5174
   ```

### Problem: "TypeScript compilation errors in Frontend"

**Solution:**
1. Ensure all dependencies are installed: `npm install`
2. Check TypeScript version: `npm list typescript`
3. Try: `npm run lint --fix` to auto-fix issues
4. Clear node_modules and reinstall:
   ```powershell
   rm -r node_modules
   npm install
   ```

### Problem: "Database migration fails"

**Solution:**
1. Verify PostgreSQL is running
2. Verify database connection in `appsettings.json`
3. Try creating database manually:
   ```sql
   CREATE DATABASE IF NOT EXISTS Test;
   ```
4. Then run migration:
   ```powershell
   dotnet ef database update
   ```

---

## 📞 Additional Help

### Documentation Files

- **[QUICK_START_TESTING.md](QUICK_START_TESTING.md)** - Quick start for testing
- **[claude.md](claude.md)** - Complete project specifications
- **[TESTING_README.md](TESTING_README.md)** - Testing procedures
- **[TEST_CASES.md](TEST_CASES.md)** - Test cases documentation

### Tech Stack Overview

**Backend:**
- ASP.NET Core 9.0
- Entity Framework Core 9.0
- PostgreSQL 8.0
- JWT Authentication
- YARP Reverse Proxy

**Frontend:**
- React 18.2
- TypeScript 5.2
- Vite 7.3
- Tailwind CSS 3.4
- React Router 6.20

### Default Ports

| Service | Port | URL |
|---------|------|-----|
| Frontend (Vite) | 5173 | http://localhost:5173 |
| Backend (Auth.Api) | 7000 | http://localhost:7000 |
| Gateway (Reverse Proxy) | 7001 | http://localhost:7001 |
| PostgreSQL | 5432 | localhost:5432 |

---

## ✨ What's Next?

After successful setup:

1. **Run the application** - Follow [Running the Project](#running-the-project)
2. **Read the docs** - Check [claude.md](claude.md) for project specifications
3. **Explore the code** - Review the project structure and architecture
4. **Run tests** - See [TESTING_README.md](TESTING_README.md) for testing guide
5. **Start developing** - Make your changes and contribute!

---

## 📝 Notes

- This setup guide is for development environment
- For production deployment, additional configuration is required
- Database connection string can be customized in `appsettings.json`
- Frontend API URL can be configured in environment variables
- Ensure you have adequate disk space (~5GB recommended)

---

**Last Updated:** April 2026  
**Version:** 1.0  
**Created:** Automated Setup Guide for TINY-LMS Project


