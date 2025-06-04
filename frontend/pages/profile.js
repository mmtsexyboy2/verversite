import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import axios from 'axios';

import Link from 'next/link';

const ProfilePage = () => {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      const token = localStorage.getItem('jwtToken');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const response = await axios.get(`${backendUrl}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setUser(response.data);
      } catch (err) {
        console.error('Error fetching profile:', err);
        if (err.response && err.response.status === 401) {
          localStorage.removeItem('jwtToken'); // Token might be invalid or expired
          router.push('/login?error=Session expired or invalid');
        } else {
          setError('Failed to load profile. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('jwtToken');
    router.push('/login');
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>Loading profile...</p></div>;
  }

  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={() => router.push('/login')} style={{ padding: '10px 20px', fontSize: '16px', marginTop: '10px' }}>
          Go to Login
        </button>
      </div>
    );
  }

  if (!user) {
    // Should be handled by loading or error states, but as a fallback:
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><p>No user data.</p></div>;
  }

  return (
    <div style={{ padding: '20px', maxWidth: '600px', margin: 'auto' }}>
      <nav style={{ marginBottom: '20px' }}>
        <Link href="/">Home</Link>
      </nav>
      <h1>User Profile</h1>
      <p><strong>Name:</strong> {user.name}</p>
      <p><strong>Email:</strong> {user.email}</p>
      {user.profile ? (
        <>
          <p><strong>Bio:</strong> {user.profile.bio || 'Not set'}</p>
          <p><strong>Avatar URL:</strong> {user.profile.avatar_url || 'Not set'}</p>
        </>
      ) : (
        <p>No profile information set up.</p>
      )}
      <button onClick={handleLogout} style={{ padding: '10px 20px', fontSize: '16px', marginTop: '20px' }}>
        Logout
      </button>
      {/* Basic form to update profile - for simplicity, not fully implemented here but shows structure */}
      <div style={{marginTop: '30px'}}>
        <h2>Update Profile</h2>
        <p><i>(PUT /api/users/me endpoint is available but form UI is minimal for this step)</i></p>
        <input type="text" placeholder="New Bio" defaultValue={user.profile?.bio || ''} style={{display: 'block', margin: '5px 0'}}/>
        <input type="text" placeholder="New Avatar URL" defaultValue={user.profile?.avatar_url || ''} style={{display: 'block', margin: '5px 0'}}/>
        <button style={{ padding: '8px 15px', fontSize: '14px', marginTop: '10px' }}>Update Profile (Not Implemented)</button>
      </div>
    </div>
  );
};

export default ProfilePage;
