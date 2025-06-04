import React from 'react';

const LoginPage = () => {
  const handleLogin = () => {
    // Ensure NEXT_PUBLIC_BACKEND_URL is set in .env.local
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    window.location.href = `${backendUrl}/auth/google`;
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <div>
        <h1>Login</h1>
        <button onClick={handleLogin} style={{ padding: '10px 20px', fontSize: '16px' }}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
};

export default LoginPage;
