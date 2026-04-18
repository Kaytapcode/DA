# 🚀 TINY-LMS PROJECT - SETUP SCRIPTS DOCUMENTATION

Complete documentation for all environment setup scripts created for the TINY-LMS project.

---

## 📋 Overview

This document explains all available setup scripts and guides for configuring your development environment on a new computer.

### What's Included?

✅ **Automated Setup Scripts** - One-command environment setup  
✅ **Development Task Helpers** - Quick shortcuts for common tasks  
✅ **Comprehensive Setup Guide** - Manual setup instructions  
✅ **Documentation** - All necessary reference materials  

---

## 📁 Files Created

### 1. **setup-environment.ps1** (PowerShell - RECOMMENDED)
**File Location:** `d:\Github\DA-BE\setup-environment.ps1`

**What it does:**
- ✓ Checks all prerequisites (.NET 9, Node.js 18+, npm, Git)
- ✓ Verifies project folder structure
- ✓ Restores and builds .NET Backend
- ✓ Installs and builds Frontend
- ✓ Provides next steps instructions

**How to use:**
```powershell
# Navigate to project root
cd D:\Github\DA-BE

# Run the setup script (PowerShell 7+)
.\setup-environment.ps1
```

**If you get permission errors:**
```powershell
# Run PowerShell as Administrator first
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
# Then run the script
.\setup-environment.ps1
```

**Duration:** 5-8 minutes  
**Recommended:** YES - Most feature-rich with colored output

---

### 2. **setup-environment.bat** (Command Prompt)
**File Location:** `d:\Github\DA-BE\setup-environment.bat`

**What it does:**
- ✓ Checks prerequisites (simpler version)
- ✓ Verifies project structure
- ✓ Restores and builds .NET Backend
- ✓ Installs and builds Frontend
- ✓ Provides instructions

**How to use:**
```cmd
# Navigate to project root
cd D:\Github\DA-BE

# Run the setup script
setup-environment.bat
```

**Duration:** 5-8 minutes  
**Recommended:** For Command Prompt users

---

### 3. **dev-tasks.ps1** (PowerShell Development Helper)
**File Location:** `d:\Github\DA-BE\dev-tasks.ps1`

**What it does:**
Provides convenient PowerShell functions for common development tasks

**Available Commands:**

#### Backend Tasks:
```powershell
be-build          # Build backend solution
be-run            # Run Auth.Api on port 7000
be-clean          # Clean build files
be-migrate        # Run database migrations
be-restore        # Restore NuGet packages
```

#### Frontend Tasks:
```powershell
fe-install        # Install npm dependencies
fe-dev            # Start dev server on port 5173
fe-build          # Build for production
fe-lint           # Run ESLint
fe-clean          # Clean node_modules and reinstall
```

#### Project Tasks:
```powershell
dev-start         # Start ALL services (opens new terminals)
dev-kill-ports    # Kill processes on dev ports
dev-status        # Check which ports are in use
dev-docs          # Open documentation files
```

**How to use:**

First time setup:
```powershell
# Load the functions into current PowerShell session
. .\dev-tasks.ps1

# Now use any command
be-build
fe-dev
dev-status
```

Or use directly with ampersand:
```powershell
& .\dev-tasks.ps1 be-build
```

**Duration:** Instant loading, fast task execution  
**Recommended:** Daily development use

---

### 4. **dev-tasks.bat** (Command Prompt Development Helper)
**File Location:** `d:\Github\DA-BE\dev-tasks.bat`

**What it does:**
Provides convenient batch commands for common development tasks

**Available Commands:**

#### Backend Tasks:
```cmd
dev-tasks.bat be-build
dev-tasks.bat be-run
dev-tasks.bat be-clean
dev-tasks.bat be-migrate
dev-tasks.bat be-restore
```

#### Frontend Tasks:
```cmd
dev-tasks.bat fe-install
dev-tasks.bat fe-dev
dev-tasks.bat fe-build
dev-tasks.bat fe-lint
dev-tasks.bat fe-clean
```

#### Project Tasks:
```cmd
dev-tasks.bat status
dev-tasks.bat kill-ports
```

**How to use:**
```cmd
# No setup needed, just run directly
dev-tasks.bat be-build
dev-tasks.bat fe-dev
dev-tasks.bat status
```

**Duration:** Instant task execution  
**Recommended:** Command Prompt users

---

### 5. **SETUP.md** (Comprehensive Guide)
**File Location:** `d:\Github\DA-BE\SETUP.md`

**What it contains:**
- Overview of prerequisites
- Step-by-step manual setup instructions
- Troubleshooting guide
- Project structure explanation
- How to run the project
- Default ports and URLs
- FAQ and additional help

**When to use:**
- Manual setup reference
- Troubleshooting specific issues
- Understanding what the scripts do
- Finding detailed explanations

---

## 🚀 Quick Start Decision Tree

Choose the right setup method for you:

```
New Computer Setup?
│
├─► Want Automated? (YES)
│   │
│   ├─► Windows PowerShell? ──► Use setup-environment.ps1 ⭐ BEST
│   │
│   └─► Windows CMD? ──────────► Use setup-environment.bat
│
└─► Want Manual? (NO)
    │
    └─► Read: SETUP.md (Manual Setup section)
```

---

## ⚡ Recommended Setup Workflow

### Fresh Computer Setup

**Step 1: Install Prerequisites** (10 minutes)
```
✓ .NET 9 SDK: https://dotnet.microsoft.com/download
✓ Node.js 18+: https://nodejs.org
✓ PostgreSQL 8.0+: https://www.postgresql.org/download/
✓ (Optional) Git: https://git-scm.com
```

**Step 2: Run Automated Setup** (5-8 minutes)
```powershell
cd D:\Github\DA-BE
.\setup-environment.ps1
```

**Step 3: Setup Database** (2 minutes)
```powershell
# After PostgreSQL is running
cd BE\Auth.Api
dotnet ef database update
```

**Step 4: Run Applications** (3 different terminals)
```powershell
# Terminal 1
cd BE\Auth.Api
dotnet run

# Terminal 2
cd FE
npm run dev

# Terminal 3
# Keep for database commands, migrations, etc.
```

**Step 5: Access & Test** (0 minutes)
```
Frontend: http://localhost:5173
Backend:  http://localhost:7000
```

**Total Time:** ~30-40 minutes (including downloads)

---

## 📊 Script Comparison

| Feature | setup-environment.ps1 | setup-environment.bat | dev-tasks.ps1 | dev-tasks.bat |
|---------|:---------------------:|:---------------------:|:-------------:|:-------------:|
| Full setup automation | ✓ | ✓ | ✗ | ✗ |
| Colored output | ✓ | ✗ | ✓ | ✗ |
| Error handling | ✓ | ✓ | ✓ | ✓ |
| Daily development | ✗ | ✗ | ✓ | ✓ |
| One-command tasks | ✗ | ✗ | ✓ | ✓ |
| Easy learning curve | ✗ | ✓ | ~ | ~ |
| Windows Compatible | ✓ | ✓ | ✓ | ✓ |

---

## 🔧 Common Scenarios

### Scenario 1: Fresh Computer - First Time Setup

```powershell
# Step 1: Install prerequisites first
# (Download and install .NET, Node.js, PostgreSQL)

# Step 2: Clone/navigate to project
cd D:\Github\DA-BE

# Step 3: Run setup
.\setup-environment.ps1

# Step 4: Follow on-screen instructions
# - Start PostgreSQL
# - Run migrations
# - Start services
```

### Scenario 2: Daily Development - Backend Changes

```powershell
# Load dev-tasks functions
. .\dev-tasks.ps1

# Quick rebuild
be-build

# Run backend
be-run
```

### Scenario 3: Daily Development - Frontend Changes

```powershell
# Load dev-tasks functions
. .\dev-tasks.ps1

# Frontend dev server with hot reload
fe-dev
```

### Scenario 4: Check if Services Running

```powershell
# Load dev-tasks functions
. .\dev-tasks.ps1

# Check all ports
dev-status

# Kill if needed
dev-kill-ports
```

### Scenario 5: Database Migration Issues

```powershell
# Using dev-tasks
. .\dev-tasks.ps1
be-migrate

# Or manual
cd BE\Auth.Api
dotnet ef database update
```

### Scenario 6: Clean Installation (Remove and Reinstall)

```powershell
# Load dev-tasks
. .\dev-tasks.ps1

# Clean backend
be-clean
be-restore

# Clean frontend
fe-clean
```

---

## 📞 Troubleshooting

### Problem: Script won't run

**Solution:**
```powershell
# If using PowerShell script, allow execution:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or use batch file instead:
setup-environment.bat
```

### Problem: .NET not found

**Solution:**
1. Download from https://dotnet.microsoft.com/download
2. Install .NET 9.0 SDK (not runtime)
3. Restart PowerShell/CMD
4. Verify: `dotnet --version`

### Problem: PostgreSQL connection fails

**Solution:**
1. Ensure PostgreSQL service is running (Windows Services)
2. Check connection in `BE/Auth.Api/appsettings.json`
3. Default: `Host=127.0.0.1;Port=5432;Database=tiny_lms;Username=postgres;Password=postgres;`

### Problem: npm install hangs

**Solution:**
```powershell
# Clear cache and retry
npm cache clean --force
npm install
```

See **[SETUP.md](SETUP.md)** for more troubleshooting.

---

## 📚 Documentation Map

| Document | Purpose |
|----------|---------|
| [SETUP.md](SETUP.md) | Complete manual setup guide with troubleshooting |
| [QUICK_START_TESTING.md](QUICK_START_TESTING.md) | Quick start for testing |
| [claude.md](claude.md) | Complete project specifications |
| [TESTING_README.md](TESTING_README.md) | Testing procedures |
| [TEST_CASES.md](TEST_CASES.md) | Test cases documentation |

---

## 💡 Pro Tips

1. **Save dev-tasks to your PowerShell profile** for always-available commands:
   ```powershell
   . .\dev-tasks.ps1
   ```

2. **Use multiple terminals** - Keep one terminal per service for easier debugging:
   - Terminal 1: Backend
   - Terminal 2: Frontend
   - Terminal 3: Database/Operations

3. **Check port status frequently** during development:
   ```powershell
   . .\dev-tasks.ps1
   dev-status
   ```

4. **Clean build before committing**:
   ```powershell
   . .\dev-tasks.ps1
   be-clean
   be-build
   fe-build
   ```

5. **Use SQL tools to inspect database**:
   - pgAdmin (Free)
   - DBeaver (Free)
   - VSCode SQL extension

---

## 🎯 What Gets Installed?

### Backend
- ✓ Entity Framework Core 9.0
- ✓ Npgsql.EntityFrameworkCore.PostgreSQL 9.0
- ✓ Microsoft.AspNetCore.Authentication.JwtBearer 9.0
- ✓ All other NuGet packages (see Auth.Api.csproj)

### Frontend
- ✓ React 18.2
- ✓ Vite 7.3
- ✓ TypeScript 5.2
- ✓ Tailwind CSS 3.4
- ✓ React Router 6.20
- ✓ All other npm packages (see package.json)

---

## ✅ Verification Checklist

After setup completes, verify:

- [ ] All 3 projects are built (Auth.Api, Gateway.Api, Shared.Contracts)
- [ ] npm installed without errors
- [ ] No missing NuGet packages
- [ ] PostgreSQL service can be started
- [ ] Database credentials work
- [ ] Ports 5173, 7000, 7001 are available
- [ ] Frontend builds successfully (dist folder created)
- [ ] Backend can start without errors

---

## 🚀 Next Steps

1. **Run the setup**: Execute appropriate setup script
2. **Read the docs**: Review QUICK_START_TESTING.md
3. **Start services**: Use dev-tasks helpers
4. **Access frontend**: Open http://localhost:5173
5. **Begin development**: Start coding!

---

## 📝 Version Information

- **Setup Scripts Version:** 1.0
- **Project:** TINY-LMS
- **Created:** April 2026
- **Last Updated:** April 2026

---

## 🤝 Need Help?

1. Check [SETUP.md](SETUP.md) - Comprehensive manual guide
2. Review [QUICK_START_TESTING.md](QUICK_START_TESTING.md) - Quick reference
3. Check [TEST_CASES.md](TEST_CASES.md) - For testing scenarios
4. Review [claude.md](claude.md) - Project specifications

---

**Happy coding! 🎉**


