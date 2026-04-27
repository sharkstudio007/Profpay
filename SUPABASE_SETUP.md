# ProfPay - Supabase Integration Guide

## ✅ What's Been Set Up

### Database Schema
Your Supabase project now has the following tables with full Row-Level Security (RLS):

- **groups** - Teacher's student groups
- **students** - Individual students with group association
- **attendance_records** - Session attendance tracking
- **payment_records** - Payment transactions (4-session blocks)
- **user_settings** - User preferences (price per block, etc.)

All tables have indexes for optimal performance and secure RLS policies ensuring users can only access their own data.

### Authentication
- Sign in/out with email and password via Supabase Auth
- Session management handled automatically
- User data is protected with RLS policies

### React Integration
Three new files have been created:
- `src/lib/supabase.ts` - Supabase client initialization
- `src/lib/hooks.ts` - Custom React hooks for data operations
- `src/AppWithSupabase.tsx` - Updated app with Supabase integration

## 🚀 Getting Started

### 1. Environment Variables
Your `.env.local` file contains your Supabase credentials:
```
VITE_SUPABASE_URL=https://zuwqfapvhijlvgdicvsq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Never commit `.env.local` to version control!** It's already in `.gitignore`.

### 2. Create Your Account
Visit [your Supabase dashboard](https://supabase.com/dashboard) and:
1. Create a new account (or use existing)
2. Create a password (you'll use this to log into ProfPay)
3. Start using the app!

### 3. Run the App
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 📊 Project Credentials

- **Project ID**: zuwqfapvhijlvgdicvsq
- **Region**: eu-central-2
- **Postgres Version**: 17.6.1.111

## 🔐 Security Features

✅ Row-Level Security (RLS) enabled on all tables
✅ User data isolation - teachers only see their own students
✅ Automatic JWT authentication via Supabase Auth
✅ No public access to data - all operations require authentication

## 💾 Data Migration

Your app now stores data in Supabase instead of localStorage. The first time you sign in:
1. Your data will be empty (fresh start)
2. All new groups and students will sync to Supabase
3. Data persists across devices and browser clears

To migrate old localStorage data:
1. Export your groups as CSV (still available in the old App.tsx)
2. Manually recreate them in ProfPay (this is one-time setup)

## 📱 Available Features

- ✅ Create/manage groups
- ✅ Add students to groups
- ✅ Track attendance sessions
- ✅ Record payments (4-session blocks)
- ✅ View payment status and due amounts
- ✅ Search for students across groups
- ✅ Export data as CSV
- ✅ Responsive design (mobile + desktop)

## 🔧 Helpful Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Supabase Database Guide](https://supabase.com/docs/guides/database)
- Your project: https://supabase.com/dashboard/project/zuwqfapvhijlvgdicvsq

## 📝 Next Steps

1. **Test locally**: Run `npm run dev` and create a test account
2. **Deploy**: Push to GitHub and deploy to Vercel, Netlify, or any hosting
3. **Share**: Give the URL to other teachers (they'll create their own accounts)

## ⚠️ Important Notes

- The old `App.tsx` still exists but is not used. You can delete it after confirming the new version works.
- All user data is stored server-side in Supabase (no browser sync needed)
- Prices and settings are saved per user in the `user_settings` table

---

Made with ❤️ - Powered by Supabase
