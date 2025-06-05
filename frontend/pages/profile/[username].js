import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';
import Link from 'next/link';
import TopicCard from '../../components/TopicCard';
import { UserIcon as UserIconOutline, CalendarIcon as CalendarIconOutline, UsersIcon as UsersIconOutline, CheckCircleIcon as CheckCircleIconOutline, PlusCircleIcon as PlusCircleIconOutline, NewspaperIcon as NewspaperIconOutline } from '@heroicons/react/outline'; // Keep old ones if used elsewhere temporarily
import { UserIcon, CalendarIcon, UsersIcon, CheckCircleIcon, PlusCircleIcon, NewspaperIcon, CollectionIcon } from '@heroicons/react/solid'; // Import solid versions

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
        return <div className="text-center py-20 text-text_secondary">Loading profile...</div>;
    }

    if (error && !profileUser) {
         return <div className="text-center py-20 text-error">Error: {error} <Link href="/" legacyBehavior><a className="text-primary hover:text-primary-dark hover:underline transition-colors duration-150">Go Home</a></Link></div>;
    }

    if (!profileUser) {
         return <div className="text-center py-20 text-text_secondary">User profile not found. <Link href="/" legacyBehavior><a className="text-primary hover:text-primary-dark hover:underline transition-colors duration-150">Go Home</a></Link></div>;
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
                        className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-gray-200 object-cover flex-shrink-0"
                    />
                    <div className="mt-4 md:mt-0 md:ml-6 flex-grow text-center md:text-left">
                        <div className="md:flex md:items-start md:justify-between">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-text_default">{profileUser.full_name || profileUser.username}</h1>
                                <p className="text-md text-text_secondary mt-1">@{profileUser.username}</p>
                                <div className="flex items-center justify-center md:justify-start text-sm text-text_secondary mt-2.5">
                                    <CalendarIcon className="w-4 h-4 mr-1.5 text-gray-400"/> {/* Icon color kept lighter */}
                                    <span>Joined: {formatDate(profileUser.date_joined)}</span>
                                </div>
                            </div>
                            {/* Follow/Unfollow Button or Edit Profile Button */}
                            <div className="mt-4 md:mt-1 md:ml-4 flex-shrink-0">
                                {isOwnProfile ? (
                                    <button className="bg-gray-200 hover:bg-gray-300 text-text_default font-semibold py-2 px-4 rounded-md text-sm transition duration-150">
                                        Edit Profile (Not Implemented)
                                    </button>
                                ) : currentUser && (
                                    <button
                                        onClick={handleFollowToggle}
                                        className={`font-semibold py-2 px-5 rounded-md text-sm transition duration-150 flex items-center justify-center
                                            ${isFollowing
                                                ? 'bg-red-100 hover:bg-red-200 text-red-600 border border-red-300' // Semantic error color for "following" state can be different
                                                : 'bg-primary hover:bg-primary-dark text-white'}`}
                                    >
                                        {isFollowing ? (
                                            <><CheckCircleIcon className="w-5 h-5 mr-1.5"/> Following</>
                                        ) : (
                                            <><PlusCircleIcon className="w-5 h-5 mr-1.5"/> Follow</>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats: Followers, Following, Topics */}
                <div className="mt-8 pt-6 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="text-2xl font-bold text-text_default">{profileUser.follower_count || 0}</p>
                        <div className="flex items-center justify-center text-sm text-text_secondary mt-1">
                            <UsersIcon className="w-4 h-4 mr-1.5 text-gray-400" /> {/* Icon color kept lighter */}
                            <span>Followers</span>
                        </div>
                        {/* TODO: Link to followers list page/modal */}
                    </div>
                    <div>
                        <p className="text-2xl font-bold text-text_default">{profileUser.following_count || 0}</p>
                        <div className="flex items-center justify-center text-sm text-text_secondary mt-1">
                            <UsersIcon className="w-4 h-4 mr-1.5 text-gray-400" /> {/* Icon color kept lighter */}
                            <span>Following</span>
                        </div>
                        {/* TODO: Link to following list page/modal */}
                    </div>
                     <div>
                        <p className="text-2xl font-bold text-text_default">{profileUser.topics?.length || 0}</p>
                        <div className="flex items-center justify-center text-sm text-text_secondary mt-1">
                            <CollectionIcon className="w-4 h-4 mr-1.5 text-gray-400" /> {/* Icon color kept lighter */}
                            <span>Topics</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* User's Topics */}
            <div className="mt-10">
                <h2 className="text-xl md:text-2xl font-semibold text-text_default mb-6 flex items-center">
                    <NewspaperIcon className="w-6 h-6 mr-2 text-text_secondary"/> {/* Icon color updated */}
                    Topics by {profileUser.username}
                </h2>
                {profileUser.topics && profileUser.topics.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {profileUser.topics.map(topic => (
                            <TopicCard key={topic.id} topic={{
                                ...topic,
                                author_username: profileUser.username,
                                author_avatar: profileUser.avatar_url,
                            }} />
                        ))}
                    </div>
                ) : (
                    <p className="text-text_secondary">This user hasn't posted any topics yet.</p>
                )}
            </div>

            {/* TODO: User's Comments (Optional for now) */}
        </div>
    );
};

export default UserProfilePage;
