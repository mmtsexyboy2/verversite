import React from 'react';

const TopicCardSkeleton = () => {
    return (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="w-full h-48 bg-gray-300 animate-pulse"></div> {/* Image Placeholder */}
            <div className="p-5">
                {/* Meta Info Placeholder */}
                <div className="flex items-center mb-3">
                    <div className="h-4 w-20 bg-gray-300 rounded animate-pulse mr-2"></div> {/* Category Placeholder */}
                    <div className="h-4 w-24 bg-gray-300 rounded animate-pulse"></div> {/* Date Placeholder */}
                </div>
                {/* Title Placeholder */}
                <div className="h-6 w-3/4 bg-gray-300 rounded animate-pulse mb-3"></div>
                {/* Author Info Placeholder */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="w-7 h-7 bg-gray-300 rounded-full animate-pulse"></div> {/* Avatar Placeholder */}
                        <div className="h-4 w-28 bg-gray-300 rounded animate-pulse"></div> {/* Username Placeholder */}
                    </div>
                    {/* Stats Placeholder */}
                    <div className="flex items-center space-x-3">
                        <div className="h-4 w-8 bg-gray-300 rounded animate-pulse"></div> {/* Likes Placeholder */}
                        <div className="h-4 w-8 bg-gray-300 rounded animate-pulse"></div> {/* Comments Placeholder */}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TopicCardSkeleton;
