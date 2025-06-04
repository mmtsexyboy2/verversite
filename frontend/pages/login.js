import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';

const LoginPage = () => {
  const { googleLogin, user, loading } = useAuth(); // Added loading
  const router = useRouter();

  // If loading, or if user is already logged in, redirect.
  // Added loading check to prevent premature redirect before auth state is known.
  useEffect(() => {
    if (!loading && user) {
      router.push(router.query.redirectedFrom || '/'); // Redirect if already logged in
    }
  }, [user, loading, router]);


  if (loading || user) { // If still loading or user exists, don't render login button
    return <p>Loading...</p>; // Or some other loading indicator
  }

  return (
    <div style={{ textAlign: 'center', marginTop: '50px' }}>
      <h1>Login</h1>
      <p>Please log in to continue.</p>
      {router.query.error && <p style={{color: 'red'}}>Error: {router.query.error}</p>}
      {router.query.redirected && <p style={{color: 'orange'}}>Please login to view that page.</p>}
      {router.query.logged_out && <p style={{color: 'green'}}>You have been successfully logged out.</p>}
      <button onClick={googleLogin} style={{padding: '10px 20px', fontSize: '1.2rem', cursor: 'pointer'}}>
        Login with Google
      </button>
    </div>
  );
};
export default LoginPage;
