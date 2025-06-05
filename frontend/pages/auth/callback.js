import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

const AuthCallbackPage = () => {
    const router = useRouter();
    const { login, loading } = useAuth(); // Use loading from useAuth

    useEffect(() => {
        const { token, refreshToken, error } = router.query;

        if (error) {
            console.error('OAuth Error:', error);
            router.push('/login?error=true'); // Redirect to login with error
            return;
        }

        if (token && refreshToken) {
            login(token, refreshToken); // Store tokens and fetch user
            // Redirect to home or intended page after login
            router.push('/');
        } else if (!loading && (!token || !refreshToken) && router.isReady) { // router.isReady ensures query is populated
            // If tokens are not present and not still loading initial auth state, and query is ready
            console.warn('Token or refreshToken missing in callback query.');
            router.push('/login?error=missing_tokens');
        }
    }, [router, login, loading]); // Add loading to dependency array

    return (
        <div className="min-h-screen flex items-center justify-center">
            <p className="text-lg">Processing authentication...</p>
            {/* Optional: Add a spinner here */}
        </div>
    );
};

export default AuthCallbackPage;
