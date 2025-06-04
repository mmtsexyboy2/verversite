import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function LoginPage() {
  const router = useRouter();
  const { error, message } = router.query; // For displaying messages from backend redirect

  const handleGoogleLogin = () => {
    // Redirect to the backend Google authentication route
    // The backend will handle the Google OAuth flow and then redirect back to the frontend
    window.location.href = 'http://localhost:8080/api/v1/auth/google'; // Backend URL
  };

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <Head>
        <title>Login</title>
      </Head>
      <h1>Login</h1>
      {error && <p style={{ color: 'red' }}>Error: {decodeURIComponent(error)}</p>}
      {message && <p style={{ color: 'green' }}>{decodeURIComponent(message)}</p>}
      <button
        onClick={handleGoogleLogin}
        style={{ padding: '10px 20px', fontSize: '16px', cursor: 'pointer' }}
      >
        Sign in with Google
      </button>
      <p style={{ marginTop: '20px' }}>
        <a href="/">Go to Home</a>
      </p>
    </div>
  );
}
