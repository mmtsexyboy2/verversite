import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext'; // Adjust path based on actual location

const GoogleCallbackPage = () => {
  const router = useRouter();
  const { login, loading: authLoading } = useAuth(); // Get login and authLoading state

  useEffect(() => {
    // This page handles query parameters passed by the backend redirect.
    // Example: /auth/google/callback?accessToken=xxx&refreshToken=yyy&user={...}

    // Only proceed if router.query is populated and auth is not already loading (to avoid race conditions)
    if (router.isReady && !authLoading) {
      const { accessToken, refreshToken, user: userString, error } = router.query;

      if (error) {
        console.error("OAuth error from callback:", error);
        router.push(`/login?error=${encodeURIComponent(error)}`);
        return;
      }

      if (accessToken && refreshToken && userString) {
        try {
          // It's crucial that the 'user' query param is properly URI encoded by the backend
          // and properly decoded here.
          const userData = JSON.parse(userString); // No need for decodeURIComponent if Next.js router handles it
          login(accessToken, refreshToken, userData);
          // login() in AuthContext should handle redirecting to '/' or intended page
        } catch (e) {
          console.error("Error processing auth callback params:", e);
          router.push('/login?error=callback_processing_failed');
        }
      } else if (!accessToken && !refreshToken && !userString && !error) {
        // If no params and no error, it could be that the page is still loading query params
        // or it was navigated to incorrectly. If it persists, it's an issue.
        console.log("Callback page opened without expected parameters.");
        // Optional: redirect to login if params are definitely not coming
        // setTimeout(() => {
        //    if (!router.query.accessToken) router.push('/login?error=invalid_callback_state');
        // }, 2000);
      }
    }
  }, [router.isReady, router.query, login, authLoading, router]);

  return <p>Processing authentication, please wait...</p>;
};

export default GoogleCallbackPage;
