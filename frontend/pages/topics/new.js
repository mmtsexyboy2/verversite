import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../contexts/AuthContext';

const NewTopicPage = () => {
    const { user, api, loading: authLoading } = useAuth();
    const router = useRouter();
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [imageUrl, setImageUrl] = useState('');
    const [categories, setCategories] = useState([]);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login?redirect=/topics/new'); // Redirect if not logged in
        }
        const fetchCategories = async () => {
            if (!api) return;
            try {
                const response = await api.get('/categories');
                setCategories(response.data || []);
            } catch (err) {
                console.error('Failed to fetch categories:', err);
                setError('Could not load categories. Please try refreshing the page.'); // Modified error message slightly
            }
        };
        if (api) fetchCategories();
    }, [user, authLoading, router, api]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !body.trim()) {
            setError('Title and body are required.');
            return;
        }
        setError('');
        setSubmitting(true);
        try {
            const response = await api.post('/topics', {
                title,
                body,
                category_id: categoryId || null, // Send null if no category selected
                image_url: imageUrl || null,
            });
            router.push(`/topics/${response.data.id}`);
        } catch (err) {
            console.error('Failed to create topic:', err);
            setError(err.response?.data?.message || 'Failed to create topic. Please try again.');
            setSubmitting(false);
        }
    };

    if (authLoading || (!user && !authLoading)) {
         return <div className="text-center py-10">Loading or redirecting...</div>;
    }

    return (
        <div className="max-w-2xl mx-auto bg-white p-6 sm:p-8 rounded-lg shadow-md">
            <h1 className="text-2xl sm:text-3xl font-bold text-text_default mb-6">Create New Topic</h1>
            <form onSubmit={handleSubmit}>
                {error && <p className="text-error mb-4 bg-red-100 p-3 rounded">{error}</p>} {/* Use semantic error color */}
                <div className="mb-4">
                    <label htmlFor="title" className="block text-sm font-medium text-text_default mb-1">Title</label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                        maxLength={150} // Example max length
                        required
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="body" className="block text-sm font-medium text-text_default mb-1">Body</label>
                    <textarea
                        id="body"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        rows="8"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                        required
                    ></textarea>
                </div>
                <div className="mb-4">
                    <label htmlFor="category" className="block text-sm font-medium text-text_default mb-1">Category (Optional)</label>
                    <select
                        id="category"
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 bg-white"
                    >
                        <option value="">Select a category</option>
                        {categories.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>
                <div className="mb-6">
                    <label htmlFor="imageUrl" className="block text-sm font-medium text-text_default mb-1">Image URL (Optional)</label>
                    <input
                        type="url"
                        id="imageUrl"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
                    />
                </div>
                <button
                    type="submit"
                    disabled={submitting || authLoading || !user}
                    className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 px-4 rounded-md shadow-sm disabled:opacity-50 transition duration-150"
                >
                    {submitting ? 'Submitting...' : 'Create Topic'}
                </button>
            </form>
        </div>
    );
};
export default NewTopicPage;
