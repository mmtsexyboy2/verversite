import React from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

const LoginPage = () => {
    const router = useRouter();
    const { user } = useAuth();

    if (user) {
        router.push('/'); // Redirect if already logged in
        return null;
    }

    const handleGoogleLogin = () => {
        // Redirect to backend Google auth endpoint
        window.location.href = `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/google`;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
                <h1 className="text-2xl font-bold mb-6">Login to VerVerSite</h1>
                {router.query.error && (
                    <p className="text-red-500 mb-4">Login failed. Please try again.</p>
                )}
                <button
                    onClick={handleGoogleLogin}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded w-full flex items-center justify-center space-x-2"
                >
                    {/* Basic Google Icon (SVG or FontAwesome can be better) */}
                    <svg className="w-5 h-5" viewBox="0 0 48 48">
                       <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                       <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6.04C45.37 39.63 48 32.66 48 24c0-.99-.07-1.95-.22-2.9z" opacity=".3"></path>
                       <path fill="#34A853" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                       <path fill="#FBBC05" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6.04c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                       <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                    <span>Login with Google</span>
                </button>
            </div>
        </div>
    );
};

export default LoginPage;
