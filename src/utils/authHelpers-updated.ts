// Authentication helper functions
import { STORAGE_KEYS, storage } from './storageKeys';

export interface User {
  id: string;
  username: string;
  password: string; // In production, this should be hashed
  createdAt: Date;
}

// Demo users that should always work
const DEMO_USERS: User[] = [
  {
    id: '1',
    username: 'demo',
    password: 'demo123',
    createdAt: new Date()
  },
  {
    id: '2', 
    username: 'admin',
    password: 'admin123',
    createdAt: new Date()
  }
];

// Get users from localStorage or return demo users
export function getStoredUsers(): User[] {
  if (typeof window === 'undefined') return DEMO_USERS;
  
  try {
    const registeredUsers = storage.get(STORAGE_KEYS.REGISTERED_USERS) || [];
    
    // Always include demo users
    const allUsers = [...DEMO_USERS];
    
    // Add registered users if they don't conflict with demo users
    registeredUsers.forEach((user: User) => {
      if (!allUsers.find(u => u.username === user.username)) {
        allUsers.push(user);
      }
    });
    
    return allUsers;
  } catch (error) {
    console.error('Error reading stored users:', error);
    return DEMO_USERS;
  }
}

// Save users to localStorage (excluding demo users)
export function saveUser(user: User): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    // Check if username already exists (including demo users)
    const existingUsers = getStoredUsers();
    if (existingUsers.find(u => u.username === user.username)) {
      return false; // Username already exists
    }
    
    const registeredUsers = storage.get(STORAGE_KEYS.REGISTERED_USERS) || [];
    
    registeredUsers.push({
      ...user,
      id: Date.now().toString(),
      createdAt: new Date()
    });
    
    return storage.set(STORAGE_KEYS.REGISTERED_USERS, registeredUsers);
  } catch (error) {
    console.error('Error saving user:', error);
    return false;
  }
}

// Authenticate user
export function authenticateUser(username: string, password: string): User | null {
  const users = getStoredUsers();
  const user = users.find(u => 
    u.username.toLowerCase() === username.toLowerCase() && 
    u.password === password
  );
  
  if (user) {
    // Store current user session
    storage.set(STORAGE_KEYS.CURRENT_USER, {
      id: user.id,
      username: user.username
    });
    return user;
  }
  
  return null;
}

// Check if user is logged in
export function getCurrentUser(): { id: string; username: string } | null {
  if (typeof window === 'undefined') return null;
  
  try {
    return storage.get(STORAGE_KEYS.CURRENT_USER);
  } catch (error) {
    console.error('Error reading current user:', error);
    return null;
  }
}

// Logout user
export function logoutUser(): void {
  storage.remove(STORAGE_KEYS.CURRENT_USER);
}

// Validate username and password
export function validateCredentials(username: string, password: string): { isValid: boolean; message: string } {
  if (!username || username.trim().length < 3) {
    return { isValid: false, message: 'Username must be at least 3 characters long' };
  }
  
  if (!password || password.length < 6) {
    return { isValid: false, message: 'Password must be at least 6 characters long' };
  }
  
  if (username.trim() !== username) {
    return { isValid: false, message: 'Username cannot have leading or trailing spaces' };
  }
  
  return { isValid: true, message: '' };
}