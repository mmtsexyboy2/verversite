import React, { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { fetchUserProfile, updateUserProfile, logoutUser } from '../services/api';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [bio, setBio] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Check for login success query param
  useEffect(() => {
    if (router.query.login === 'success') {
      setSuccessMessage('Login successful!');
      // Optionally remove the query param from URL
      router.replace('/profile', undefined, { shallow: true });
    }
  }, [router]);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setIsLoading(true);
        setError('');
        const response = await fetchUserProfile();
        setUser(response.data);
        setBio(response.data.bio || '');
        setFullName(response.data.full_name || '');
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        setError('Failed to load profile. You might need to login.');
        if (err.response && err.response.status === 401) {
          router.push('/login?message=Session expired, please login again.');
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadUserProfile();
  }, [router]);

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null); // Clear user state
      router.push('/login?message=Logout successful.');
    } catch (err) {
      console.error('Logout failed:', err);
      setError('Logout failed. Please try again.');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    try {
      const updatedProfile = await updateUserProfile({ full_name: fullName, bio });
      setUser(updatedProfile.data);
      setBio(updatedProfile.data.bio || '');
      setFullName(updatedProfile.data.full_name || '');
      setEditMode(false);
      setSuccessMessage('Profile updated successfully!');
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile. ' + (err.response?.data?.message || ''));
    }
  };

  if (isLoading) return <p>Loading profile...</p>;
  // No explicit error component for now, error is shown, and if 401, redirect happens.

  return (
    <div style={{ padding: '20px' }}>
      <Head>
        <title>User Profile</title>
      </Head>
      <h1>User Profile</h1>
      {successMessage && <p style={{color: 'green'}}>{successMessage}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}

      {!user && !isLoading && (
        <div>
          <p>Could not load user profile. Please try logging in.</p>
          <button onClick={() => router.push('/login')}>Go to Login</button>
        </div>
      )}

      {user && (
        <div>
          <p><strong>ID:</strong> {user.id}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Google ID:</strong> {user.google_id}</p>

          {!editMode ? (
            <>
              <p><strong>Full Name:</strong> {user.full_name || 'Not set'}</p>
              <p><strong>Bio:</strong> {user.bio || 'Not set'}</p>
              <button onClick={() => setEditMode(true)}>Edit Profile</button>
            </>
          ) : (
            <form onSubmit={handleProfileUpdate}>
              <div>
                <label htmlFor="fullName">Full Name: </label>
                <input
                  type="text"
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div style={{marginTop: '10px'}}>
                <label htmlFor="bio">Bio: </label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows="3"
                />
              </div>
              <div style={{marginTop: '10px'}}>
                <button type="submit">Save Changes</button>
                <button type="button" onClick={() => { setEditMode(false); setBio(user.bio || ''); setFullName(user.full_name || '');}} style={{marginLeft: '10px'}}>Cancel</button>
              </div>
            </form>
          )}

          <hr style={{margin: '20px 0'}} />
          <button onClick={handleLogout} style={{ marginTop: '20px' }}>Logout</button>
        </div>
      )}
      <p style={{ marginTop: '20px' }}>
        <a href="/">Go to Home</a>
      </p>
    </div>
  );
}
