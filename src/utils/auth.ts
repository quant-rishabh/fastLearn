// Simple authentication utility
export interface User {
  username: string;
  password: string;
  dateOfBirth: string;
  height: number; // in cm
  currentWeight: number; // in kg
  targetWeight: number; // in kg
  weeklyGoal: number; // kg per week
  createdAt: string;
}

export interface UserProfile {
  username: string;
  age: number;
  height: number;
  currentWeight: number;
  targetWeight: number;
  weeklyGoal: number;
  monthsToGoal: number;
}

const STORAGE_KEYS = {
  USERS: 'workout_users',
  CURRENT_USER: 'workout_current_user'
};

// Get all users from localStorage
const getUsers = (): User[] => {
  try {
    const users = localStorage.getItem(STORAGE_KEYS.USERS);
    return users ? JSON.parse(users) : [];
  } catch (error) {
    console.error('Error getting users:', error);
    return [];
  }
};

// Save users to localStorage
const saveUsers = (users: User[]) => {
  try {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch (error) {
    console.error('Error saving users:', error);
  }
};

// Register new user
export const registerUser = (userData: Omit<User, 'createdAt'>): { success: boolean; message: string } => {
  const users = getUsers();
  
  // Check if username already exists
  const existingUser = users.find(user => user.username === userData.username);
  if (existingUser) {
    return { success: false, message: 'Username already exists' };
  }
  
  // Create new user
  const newUser: User = {
    ...userData,
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  saveUsers(users);
  
  return { success: true, message: 'User registered successfully' };
};

// Login user
export const loginUser = (username: string, password: string): { success: boolean; message: string; user?: User } => {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  
  if (user) {
    // Set current user
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    return { success: true, message: 'Login successful', user };
  } else {
    return { success: false, message: 'Invalid username or password' };
  }
};

// Get current logged-in user
export const getCurrentUser = (): User | null => {
  try {
    const currentUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return currentUser ? JSON.parse(currentUser) : null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Update user profile
export const updateUserProfile = (updates: Partial<User>): { success: boolean; message: string } => {
  const currentUser = getCurrentUser();
  if (!currentUser) {
    return { success: false, message: 'No user logged in' };
  }
  
  const users = getUsers();
  const userIndex = users.findIndex(u => u.username === currentUser.username);
  
  if (userIndex === -1) {
    return { success: false, message: 'User not found' };
  }
  
  // Update user data
  const updatedUser = { ...currentUser, ...updates };
  users[userIndex] = updatedUser;
  
  saveUsers(users);
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(updatedUser));
  
  return { success: true, message: 'Profile updated successfully' };
};

// Calculate age from date of birth
export const calculateAge = (dateOfBirth: string): number => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

// Calculate months to reach goal weight
export const calculateMonthsToGoal = (currentWeight: number, targetWeight: number, weeklyGoal: number): number => {
  const totalWeightLoss = currentWeight - targetWeight;
  if (totalWeightLoss <= 0 || weeklyGoal <= 0) return 0;
  
  const weeksToGoal = totalWeightLoss / weeklyGoal;
  const monthsToGoal = weeksToGoal / 4.33; // Average weeks per month
  
  return Math.round(monthsToGoal * 10) / 10; // Round to 1 decimal
};

// Get user profile with calculated values
export const getUserProfile = (): UserProfile | null => {
  const user = getCurrentUser();
  if (!user) return null;
  
  const age = calculateAge(user.dateOfBirth);
  const monthsToGoal = calculateMonthsToGoal(user.currentWeight, user.targetWeight, user.weeklyGoal);
  
  return {
    username: user.username,
    age,
    height: user.height,
    currentWeight: user.currentWeight,
    targetWeight: user.targetWeight,
    weeklyGoal: user.weeklyGoal,
    monthsToGoal
  };
};

// Logout user
export const logoutUser = () => {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
};

// Check if user is logged in
export const isLoggedIn = (): boolean => {
  return getCurrentUser() !== null;
};