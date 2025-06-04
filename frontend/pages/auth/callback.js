import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

const AuthCallbackPage = () => {
  const router = useRouter();

  useEffect(() => {
    const { token, error } = router.query;

    if (error) {
      console.error('Authentication error:', error);
      // Redirect to login or show an error message
      router.push('/login?error=' + encodeURIComponent(error));
      return;
    }

    if (token) {
      if (typeof token === 'string') {
        localStorage.setItem('jwtToken', token);
        router.push('/profile'); // Redirect to profile page
      } else {
        console.error('Invalid token format:', token);
        router.push('/login?error=Invalid token format');
      }
    } else {
      // Handle cases where token is not present, though backend should always send it on success
      // This might run briefly before query params are available
      if (router.isReady && !token) {
          console.log('No token in query, redirecting to login');
          router.push('/login?error=Authentication failed, no token received');
      }
    }
  }, [router, router.isReady, router.query]); // Add router.isReady and router.query to dependencies

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
      <p>Processing authentication...</p>
    </div>
  );
};

export default AuthCallbackPage;
