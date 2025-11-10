# Quick Setup Guide

## 🚀 Your app is working in LOCAL MODE!

Your workout tracker is currently working with **local storage** - all your data is saved in your browser. This means:

✅ **Working now:**
- Add food and exercises
- Track daily calories
- View analytics
- Use basic AI chat
- All calculations work perfectly

## 📱 Want Full Database Features?

To unlock the complete experience with cloud storage, AI chat, and advanced analytics:

### 1. Create a `.env.local` file in your project root:

```env
# Supabase Configuration (get these from supabase.com)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI Configuration (for AI food calculations - you already have this)
OPENAI_API_KEY=your_openai_api_key
```

### 2. Set up Supabase (free):
1. Go to [supabase.com](https://supabase.com) and create a free account
2. Create a new project
3. Go to Settings > API to get your URL and anon key
4. Go to SQL Editor and run the schema from `/database/schema.sql`
5. Add the credentials to your `.env.local` file

### 3. Install dependencies (if not already done):
```bash
npm install @supabase/supabase-js openai
```

### 4. Restart your development server:
```bash
npm run dev
```

## 🎯 What You Get With Full Setup:

- **Cloud Storage**: Data synced across devices
- **Advanced AI Chat**: Personalized coaching based on your data
- **Rich Analytics**: Detailed progress tracking
- **Data Export**: Backup and export capabilities
- **Multi-user Support**: Each person gets their own data

## 💡 Current Local Features:

Even without the database, you have a fully functional tracker:
- ✅ BMR and calorie calculations
- ✅ Food and exercise logging
- ✅ Daily deficit tracking
- ✅ Progress analytics
- ✅ Weight loss projections
- ✅ Basic AI chat responses

Your data is safely stored in your browser's local storage!

## 🔄 Migration:

When you set up the database later, you can migrate your local data by exporting/importing or simply start fresh with the enhanced features.

---

**Need help?** The app works perfectly as-is! The yellow notification will disappear once you set up the database, but everything functions without it.