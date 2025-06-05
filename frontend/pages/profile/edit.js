import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';

const EditProfilePage = () => {
    const { user: currentUser, api, loading: authLoading } = useAuth();
    const router = useRouter();
    const [fullName, setFullName] = useState('');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!authLoading && !currentUser) {
            router.push('/login');
        }
        if (currentUser) {
            setFullName(currentUser.full_name || '');
        }
    }, [currentUser, authLoading, router]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setIsSubmitting(true);

        if (!fullName.trim()) {
            setError('Full name cannot be empty.');
            setIsSubmitting(false);
            return;
        }

        if (fullName.trim().length > 100) { // Basic length validation
            setError('Full name cannot exceed 100 characters.');
            setIsSubmitting(false);
            return;
        }

        try {
            const response = await api.put('/users/me', { full_name: fullName.trim() });
            // The backend should return the updated user object.
            // For now, we don't have a context update function like `updateUserInContext`.
            // The profile page will refetch user data upon navigation.
            setSuccess('Profile updated successfully! Redirecting...');
            // Wait a bit for the user to see the message, then redirect.
            setTimeout(() => {
                router.push(`/profile/${currentUser.username}`);
            }, 1500);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update profile. Please try again.');
            setIsSubmitting(false);
        }
    };

    if (authLoading || !currentUser) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <p className="text-lg text-text_secondary">Loading...</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-lg">
            <div className="bg-white shadow-xl rounded-lg p-6 md:p-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-text_default mb-6 text-center">Edit Profile</h1>

                <form onSubmit={handleSubmit}>
                    {error && <p className="bg-red-100 text-red-700 p-3 rounded-md mb-4 text-sm">{error}</p>}
                    {success && <p className="bg-green-100 text-green-700 p-3 rounded-md mb-4 text-sm">{success}</p>}

                    <div className="mb-6">
                        <label htmlFor="fullName" className="block text-sm font-medium text-text_secondary mb-1">Full Name</label>
                        <input
                            type="text"
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            className="mt-1 block w-full px-4 py-2.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-text_default"
                            placeholder="Enter your full name"
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                        <button
                            type="submit"
                            className="w-full sm:w-auto flex-grow bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 px-6 rounded-md transition duration-150 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Saving...' : 'Save Changes'}
                        </button>
                        <Link href={`/profile/${currentUser.username}`} legacyBehavior>
                            <a className="w-full sm:w-auto text-center bg-gray-200 hover:bg-gray-300 text-text_default font-semibold py-2.5 px-6 rounded-md transition duration-150 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed">
                                Cancel
                            </a>
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfilePage;
