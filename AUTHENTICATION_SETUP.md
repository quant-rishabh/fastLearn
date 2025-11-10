# Authentication System Setup

## Overview
This authentication system provides:
- Demo credentials that always work
- Basic username/password registration
- Client-side authentication using localStorage
- Protected routes functionality

## Demo Credentials
The following demo accounts are always available:
- Username: `demo` | Password: `demo123`
- Username: `admin` | Password: `admin123`

## Files Modified/Created

### Core Authentication Files
1. **`src/utils/authHelpers.ts`** - Main authentication logic
2. **`src/app/api/auth/route.ts`** - Server-side authentication API
3. **`src/hooks/useAuth.tsx`** - React authentication hooks
4. **`src/middleware.ts`** - Route protection middleware

### Updated Login Page
- **`src/app/login/login-page-improved.tsx`** - Enhanced login/register page

## How to Use

### 1. Replace the existing login page
Replace the content of `src/app/login/page.tsx` with the content from `src/app/login/login-page-improved.tsx`

### 2. Add AuthProvider to your app layout
Update your `src/app/layout.tsx` to include the AuthProvider:

```tsx
import { AuthProvider } from '@/hooks/useAuth';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### 3. Protect pages that require authentication
Use the `useRequireAuth` hook in components that need authentication:

```tsx
'use client';
import { useRequireAuth } from '@/hooks/useAuth';

export default function ProtectedPage() {
  const { user, isLoading } = useRequireAuth();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!user) {
    return null; // Will redirect to login
  }
  
  return <div>Welcome, {user.username}!</div>;
}
```

### 4. Add logout functionality
Use the `useAuth` hook to add logout functionality:

```tsx
'use client';
import { useAuth } from '@/hooks/useAuth';

export default function Header() {
  const { user, logout } = useAuth();
  
  return (
    <header>
      {user && (
        <div>
          Welcome, {user.username}!
          <button onClick={logout}>Logout</button>
        </div>
      )}
    </header>
  );
}
```

## Features

### Demo Credentials
- Always available, cannot be overridden
- Automatically included in authentication checks
- Listed on the login page for easy access

### Registration System
- Username must be at least 3 characters
- Password must be at least 6 characters
- Usernames must be unique (including demo users)
- Uses localStorage for persistence

### Security Notes
- This is a basic authentication system for development/demo purposes
- Passwords are stored in plain text (not recommended for production)
- Uses localStorage instead of secure server-side sessions
- For production, implement proper password hashing, secure sessions, and server-side validation

## Troubleshooting

### Demo credentials not working
1. Clear localStorage: `localStorage.clear()`
2. Refresh the page
3. Try logging in with `demo` / `demo123`

### Registration not working
1. Check that username doesn't conflict with demo users
2. Ensure username is at least 3 characters
3. Ensure password is at least 6 characters
4. Check browser console for errors

### Users not persisting
1. Check if localStorage is enabled in browser
2. Check if running in incognito/private mode
3. Clear localStorage and try again