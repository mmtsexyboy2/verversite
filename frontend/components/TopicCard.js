import React from 'react';
import Link from 'next/link';
import { ChatAlt2Icon, ThumbUpIcon, CalendarIcon } from '@heroicons/react/solid';

const TopicCard = ({ topic }) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'Some time ago';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out">
            {topic.image_url && (
                <img src={topic.image_url} alt={topic.title} className="w-full h-48 object-cover" />
            )}
            <div className="p-5">
                <div className="flex items-center text-xs text-text_secondary mb-2">
                    {topic.category_name && (
                        <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{topic.category_name}</span>
                        {/* Category text color can be specific (e.g., blue) for distinction. */}
                    )}
                    {topic.category_name && topic.created_at && (
                        <span className="mx-1.5">•</span>
                    )}
                    {topic.created_at && (
                        <>
                            <CalendarIcon className="w-4 h-4 mr-1" /> {/* Icon color will inherit from parent text-text_secondary */}
                            <span>{formatDate(topic.created_at)}</span>
                        </>
                    )}
                </div>
                <Link href={`/topics/${topic.id}`} legacyBehavior>
                    <a className="block text-xl font-semibold text-text_default hover:text-primary-dark mb-2 truncate transition-colors duration-150" title={topic.title}>
                        {topic.title}
                    </a>
                </Link>
                <div className="flex items-center justify-between text-sm text-text_secondary">
                    <div className="flex items-center space-x-1">
                        <Link href={`/profile/${topic.author_username}`} legacyBehavior>
                            <a className="flex items-center space-x-1 hover:underline">
                                <img src={topic.author_avatar || `https://ui-avatars.com/api/?name=${topic.author_username}&background=random&size=40`} alt={topic.author_username} className="w-7 h-7 rounded-full" />
                                <span>{topic.author_username || 'Anonymous'}</span>
                            </a>
                        </Link>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className="flex items-center">
                            <ThumbUpIcon className="w-4 h-4 mr-1" /> {topic.like_count || 0}
                        </span>
                        <span className="flex items-center">
                            <ChatAlt2Icon className="w-4 h-4 mr-1" /> {topic.comment_count || 0}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default TopicCard;
