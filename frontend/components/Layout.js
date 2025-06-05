import React from 'react';
import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children }) => {
    const { user, logout, loading } = useAuth();

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800">
            <nav className="bg-white shadow-sm sticky top-0 z-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <Link href="/" legacyBehavior>
                                <a className="text-2xl font-bold text-blue-600 hover:text-blue-700">VerVerSite</a>
                            </Link>
                        </div>
                        <div className="flex items-center space-x-3">
                            {!loading && user && (
                                <Link href="/topics/new" legacyBehavior>
                                    <a className="bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-1">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                        </svg>
                                        <span>New Topic</span>
                                    </a>
                                </Link>
                            )}
                            {!loading && user ? (
                                <>
                                    <span className="text-sm text-gray-600 hidden sm:block">Hi, {user.username}!</span>
                                    {user.avatar_url && (
                                        <img src={user.avatar_url} alt={user.username} className="w-8 h-8 rounded-full" />
                                    )}
                                    <button
                                        onClick={logout}
                                        className="text-gray-600 hover:bg-gray-100 hover:text-gray-800 px-3 py-2 rounded-md text-sm font-medium"
                                    >
                                        Logout
                                    </button>
                                </>
                            ) : !loading && (
                                <Link href="/login" legacyBehavior>
                                    <a className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium">
                                        Login
                                    </a>
                                </Link>
                            )}
                            {loading && <div className="text-sm text-gray-500">Loading...</div>}
                        </div>
                    </div>
                </div>
            </nav>
            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                {children}
            </main>
            <footer className="bg-white border-t mt-auto">
                <div className="container mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} VerVerSite. All rights reserved.
                </div>
            </footer>
        </div>
    );
};
export default Layout;
