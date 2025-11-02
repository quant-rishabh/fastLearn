# LearnFast Frontend

A Next.js application for the LearnFast platform with PostgreSQL database integration via Railway.

## 📋 Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- Git installed
- Railway account (for database)

## 🚀 Quick Setup

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd learnfast_frontend
npm install
```

### 2. Environment Setup
```bash
# Copy example environment file
cp .env.example .env.local

# Edit environment variables
nano .env.local
```

Required environment variables:
```env
DATABASE_URL="postgresql://username:password@host:port/database"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key"
```

### 3. Database Setup (Railway PostgreSQL)
1. Go to [Railway.app](https://railway.app)
2. Create new project → Add PostgreSQL
3. Copy connection string from Railway dashboard
4. Paste into `DATABASE_URL` in `.env.local`

### 4. Run Development Server
```bash
npm run dev
# or
pnpm dev
```

Visit: `http://localhost:3000`

## 🛠️ Development Workflow

### Daily Development
```bash
# Start development
npm run dev

# In another terminal - watch for changes
npm run lint

# Before committing
npm run build  # Test production build
```

### Code Structure
```
├── src/
│   ├── app/           # Next.js 13+ app router
│   ├── components/    # Reusable UI components
│   ├── utils/         # Utilities & helpers
│   └── types/         # TypeScript definitions
├── public/            # Static assets & data files
└── prisma/            # Database schema (if using Prisma)
```

## 🗃️ Database Operations

### Connect to Railway PostgreSQL
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Connect to your database
railway connect
```

### Common Database Tasks
```bash
# Run migrations (if using Prisma)
npx prisma migrate dev

# View database
npx prisma studio

# Reset database
npx prisma migrate reset
```

## 🌐 Deploy Online (Multiple Options)

### Option 1: Vercel (Recommended - Free)
**Best for Next.js apps - Zero config deployment**

1. **Connect GitHub to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub
   - Click "New Project" → Import your GitHub repo

2. **Configure Environment Variables:**
   ```
   DATABASE_URL=your_railway_postgres_url
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=your-secret-key
   ```

3. **Auto-Deploy Setup:**
   ```bash
   git push origin main  # Vercel auto-deploys on push
   ```

### Option 2: Railway (Full-Stack)
**Good if you want database + frontend together**

1. **Deploy to Railway:**
   ```bash
   # Install Railway CLI
   npm install -g @railway/cli
   
   # Login
   railway login
   
   # Deploy
   railway up
   ```

2. **Set Environment Variables in Railway Dashboard**

### Option 3: Netlify (Alternative)
1. Go to [netlify.com](https://netlify.com)
2. Connect GitHub repo
3. Build settings: `npm run build`
4. Publish directory: `.next`

### 📤 Complete Deployment Workflow

#### For Vercel (Easiest):
```bash
# 1. Push to GitHub
git add .
git commit -m "ready for deployment"
git push origin main

# 2. Vercel auto-builds and deploys
# 3. Your app is live at: https://your-app.vercel.app
```

#### Environment Variables for Production:
```env
DATABASE_URL="your_railway_postgres_connection_string"
NEXTAUTH_URL="https://your-deployed-app-url.com"
NEXTAUTH_SECRET="generate-a-strong-secret"
NODE_ENV="production"
```

### 🔄 Update Live App (Push Changes)

#### 1. Code Changes
```bash
# Check status
git status

# Add changes
git add .

# Commit with message
git commit -m "feat: add new feature"

# Push to repository
git push origin main

# ✅ Vercel/Railway auto-deploys your changes
```

#### 2. Database Changes
```bash
# Create migration (if schema changed)
npx prisma migrate dev --name describe_your_change

# Push schema to Railway database
npx prisma db push
```

#### 3. Manual Deploy (if needed)
```bash
# Build for production locally
npm run build

# Test production build
npm run start
```

## 🔧 Troubleshooting

### Environment Issues
```bash
# Check if .env.local exists
ls -la .env.local

# Verify environment variables are loaded
echo $DATABASE_URL
```

### Database Connection Issues
```bash
# Test database connection
npx prisma db pull

# Check Railway database status
railway status
```

### Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

## 📝 Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Fix ESLint issues |

## 🔄 Complete Workflow Example

```bash
# 1. Start working
git pull origin main
npm run dev

# 2. Make changes to code
# Edit files...

# 3. Test changes
npm run build

# 4. Update database (if needed)
npx prisma migrate dev

# 5. Commit and push
git add .
git commit -m "feat: your change description"
git push origin main

# 6. Changes auto-deploy to production
```

## 🌍 Environment Variables Guide

### Development (.env.local)
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/learnfast_dev"
NEXTAUTH_URL="http://localhost:3000"
NODE_ENV="development"
```

### Production (Railway/Vercel)
```env
DATABASE_URL="postgresql://user:pass@railway.host:5432/railway"
NEXTAUTH_URL="https://your-domain.com"
NODE_ENV="production"
```

## 🆘 Need Help?

1. Check console for errors: `F12` → Console
2. Check server logs: Terminal running `npm run dev`
3. Verify environment: `cat .env.local`
4. Test database: `npx prisma studio`

## 📁 Important Files

- `next.config.ts` - Next.js configuration
- `package.json` - Dependencies and scripts
- `.env.local` - Environment variables (never commit!)
- `tsconfig.json` - TypeScript configuration
- `eslint.config.mjs` - ESLint configuration
- `postcss.config.mjs` - PostCSS configuration

## 🏗️ Project Structure

```
learnfast_frontend/
├── src/
│   ├── app/
│   │   ├── admin/          # Admin panel
│   │   ├── api/            # API routes
│   │   ├── learn/          # Learning modules
│   │   ├── progress/       # Progress tracking
│   │   ├── quiz/           # Quiz functionality
│   │   └── settings/       # User settings
│   ├── components/
│   │   └── ui/             # UI components
│   └── utils/
│       ├── fuzzyMatch.ts   # Search utilities
│       ├── getQuizData.ts  # Quiz data handling
│       └── supabase.ts     # Database client
├── public/
│   └── data/               # Static data files
│       ├── computer_network.json
│       ├── english.json
│       └── subjects.json
└── Configuration files
```