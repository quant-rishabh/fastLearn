import { NextRequest, NextResponse } from 'next/server';

// Demo users that should always work
const DEMO_USERS = [
  { id: '1', username: 'demo', password: 'demo123' },
  { id: '2', username: 'admin', password: 'admin123' }
];

export async function POST(request: NextRequest) {
  try {
    const { action, username, password } = await request.json();

    if (action === 'login') {
      // Check demo users first
      const demoUser = DEMO_USERS.find(
        user => user.username.toLowerCase() === username.toLowerCase() && 
                user.password === password
      );

      if (demoUser) {
        return NextResponse.json({
          success: true,
          user: {
            id: demoUser.id,
            username: demoUser.username
          }
        });
      }

      // In a real app, you would check against a database here
      // For now, just return invalid credentials for non-demo users
      return NextResponse.json({
        success: false,
        message: 'Invalid username or password'
      }, { status: 401 });

    } else if (action === 'register') {
      // Basic validation
      if (!username || username.trim().length < 3) {
        return NextResponse.json({
          success: false,
          message: 'Username must be at least 3 characters long'
        }, { status: 400 });
      }

      if (!password || password.length < 6) {
        return NextResponse.json({
          success: false,
          message: 'Password must be at least 6 characters long'
        }, { status: 400 });
      }

      // Check if username conflicts with demo users
      const isDemoUsername = DEMO_USERS.some(
        user => user.username.toLowerCase() === username.toLowerCase()
      );

      if (isDemoUsername) {
        return NextResponse.json({
          success: false,
          message: 'Username already exists. Please choose a different username.'
        }, { status: 409 });
      }

      // In a real app, you would save to database here
      // For demo purposes, we'll just return success
      return NextResponse.json({
        success: true,
        message: 'Registration successful'
      });
    }

    return NextResponse.json({
      success: false,
      message: 'Invalid action'
    }, { status: 400 });

  } catch (error) {
    console.error('Authentication error:', error);
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}