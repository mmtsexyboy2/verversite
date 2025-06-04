import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/router';
import React, { useEffect } from 'react';

const ProtectedRoute = ({ children }) => {
  const { user, loading, accessToken } = useAuth(); // Added accessToken to check
  const router = useRouter();

  useEffect(() => {
    if (!loading) { // Only run check once auth state is determined
      if (!user || !accessToken) { // Check for user object and accessToken
        // Store the current path to redirect back after login
        localStorage.setItem('redirectAfterLogin', router.asPath);
        router.push('/login?redirected=true');
      }
    }
  }, [user, loading, accessToken, router]);

  // If still loading, or no user/accessToken, show loading or nothing
  if (loading || !user || !accessToken) {
    return <p>Loading user...</p>; // Or a spinner component
  }

  // If user is authenticated, render the children components
  return <>{children}</>;
};

export default ProtectedRoute;
