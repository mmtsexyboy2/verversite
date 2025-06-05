import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';
import TopicCard from '../../components/TopicCard'; // Assuming TopicCard can be reused
import { UserIcon, CalendarIcon, UsersIcon, CheckCircleIcon, PlusCircleIcon, NewspaperIcon } from '@heroicons/react/outline';

const UserProfilePage = () => {
    const router = useRouter();
    const { username } = router.query;
    const { user: currentUser, api, loading: authLoading } = useAuth();
    const [profileUser, setProfileUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isFollowing, setIsFollowing] = useState(false);

    const fetchProfileData = useCallback(async () => {
        if (!username || !api) return;
        setIsLoading(true);
        setError('');
        try {
            const res = await api.get(`/users/profile/${username}`);
            setProfileUser(res.data);

            // If current user is viewing someone else's profile, check follow status
            if (currentUser && res.data && currentUser.id !== res.data.id) {
                const followStatusRes = await api.get(`/users/${res.data.id}/follow_status`);
                setIsFollowing(followStatusRes.data.is_following);
            }

        } catch (err) {
            console.error("Failed to fetch profile:", err);
            setError(err.response?.data?.message || 'Failed to load profile.');
            if (err.response?.status === 404) setProfileUser(null);
        } finally {
            setIsLoading(false);
        }
    }, [username, api, currentUser]);

    useEffect(() => {
        if (router.isReady) { // Ensure username is available
            fetchProfileData();
        }
    }, [router.isReady, username, fetchProfileData]); // fetchProfileData is stable due to useCallback

    const handleFollowToggle = async () => {
        if (!currentUser || !profileUser || currentUser.id === profileUser.id || !api) {
            // Should not happen if button is correctly disabled/hidden
            return;
        }
        try {
            const response = await api.post(`/users/${profileUser.id}/follow`);
            setIsFollowing(response.data.is_following);
            // Optionally update follower count on profileUser, or re-fetch profile for consistency
            setProfileUser(prev => ({
                ...prev,
                follower_count: response.data.is_following ? prev.follower_count + 1 : prev.follower_count - 1
            }));
        } catch (err) {
            console.error("Failed to follow/unfollow:", err);
            alert(err.response?.data?.message || "Could not update follow status.");
        }
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

    if (isLoading || authLoading && !profileUser) { // Show loading if auth is loading and we don't have profile yet
        return <div className="text-center py-20">Loading profile...</div>;
    }

    if (error && !profileUser) {
         return <div className="text-center py-20 text-red-500">Error: {error} <Link href="/" legacyBehavior><a className="text-blue-500 hover:underline">Go Home</a></Link></div>;
    }

    if (!profileUser) {
         return <div className="text-center py-20 text-gray-500">User profile not found. <Link href="/" legacyBehavior><a className="text-blue-500 hover:underline">Go Home</a></Link></div>;
    }

    const isOwnProfile = currentUser?.id === profileUser.id;

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="bg-white shadow-xl rounded-lg p-6 md:p-8">
                {/* Profile Header */}
                <div className="flex flex-col md:flex-row items-center md:items-start">
                    <img
                        src={profileUser.avatar_url || `https://ui-avatars.com/api/?name=${profileUser.username}&size=128&background=random`}
                        alt={profileUser.username}
                        className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-gray-200 object-cover"
                    />
                    <div className="mt-4 md:mt-0 md:ml-6 text-center md:text-left">
                        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">{profileUser.full_name || profileUser.username}</h1>
                        <p className="text-md text-gray-500">@{profileUser.username}</p>
                        <div className="flex items-center justify-center md:justify-start text-sm text-gray-500 mt-2">
                            <CalendarIcon className="w-4 h-4 mr-1.5"/>
                            Joined: {formatDate(profileUser.date_joined)}
                        </div>

                        {/* Follow/Unfollow Button or Edit Profile Button */}
                        <div className="mt-4">
                            {isOwnProfile ? (
                                <button className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-md text-sm transition duration-150">
                                    Edit Profile (Not Implemented)
                                </button>
                            ) : currentUser && ( // Only show follow if a user is logged in
                                <button
                                    onClick={handleFollowToggle}
                                    className={`font-semibold py-2 px-4 rounded-md text-sm transition duration-150
                                        ${isFollowing
                                            ? 'bg-red-100 hover:bg-red-200 text-red-600 border border-red-300'
                                            : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                                >
                                    {isFollowing ? (
                                        <><CheckCircleIcon className="w-5 h-5 inline mr-1"/> Following</>
                                    ) : (
                                        <><PlusCircleIcon className="w-5 h-5 inline mr-1"/> Follow</>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats: Followers, Following */}
                <div className="mt-6 pt-6 border-t border-gray-200 flex justify-center md:justify-start space-x-6">
                    <div className="text-center">
                        <p className="text-xl font-semibold text-gray-800">{profileUser.follower_count || 0}</p>
                        <p className="text-sm text-gray-500">Followers</p>
                        {/* TODO: Link to followers list page/modal */}
                    </div>
                    <div className="text-center">
                        <p className="text-xl font-semibold text-gray-800">{profileUser.following_count || 0}</p>
                        <p className="text-sm text-gray-500">Following</p>
                        {/* TODO: Link to following list page/modal */}
                    </div>
                     <div className="text-center">
                        <p className="text-xl font-semibold text-gray-800">{profileUser.topics?.length || 0}</p>
                        <p className="text-sm text-gray-500">Topics</p>
                    </div>
                </div>
            </div>

            {/* User's Topics */}
            <div className="mt-10">
                <h2 className="text-xl md:text-2xl font-semibold text-gray-700 mb-6 flex items-center">
                    <NewspaperIcon className="w-6 h-6 mr-2 text-gray-500"/>
                    Topics by {profileUser.username}
                </h2>
                {profileUser.topics && profileUser.topics.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {profileUser.topics.map(topic => (
                            // The backend currently sends limited topic info for profile.
                            // TopicCard might expect more (e.g. author_username, comment_count, like_count directly on topic object)
                            // For now, we'll adapt or show limited info.
                            // Let's assume TopicCard can handle a simplified topic object or we pass what we have.
                            <TopicCard key={topic.id} topic={{
                                ...topic,
                                author_username: profileUser.username, // Add this as backend doesn't nest it here
                                author_avatar: profileUser.avatar_url, // Add this
                                // comment_count and like_count are not provided by profile topic list currently
                                // We can fetch them separately if needed, or TopicCard can show N/A
                            }} />
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500">This user hasn't posted any topics yet.</p>
                )}
            </div>

            {/* TODO: User's Comments (Optional for now) */}
        </div>
    );
};

export default UserProfilePage;
