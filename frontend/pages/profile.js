import React from 'react';
import ProtectedRoute from '../components/ProtectedRoute';
import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
  const { user } = useAuth(); // user should be available once ProtectedRoute allows rendering

  return (
    <ProtectedRoute>
      <div>
        <h1>Your Profile</h1>
        {user ? (
          <>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Full Name:</strong> {user.full_name || 'Not provided'}</p>
            <p><strong>Google ID:</strong> {user.google_id}</p>
            <p><strong>User ID:</strong> {user.id}</p>
            {user.avatar_url && (
              <div>
                <p><strong>Avatar:</strong></p>
                <img
                  src={user.avatar_url}
                  alt={`${user.username || 'user'}'s avatar`}
                  style={{ width: '100px', height: '100px', borderRadius: '50%' }}
                />
              </div>
            )}
            <p><strong>Active:</strong> {user.is_active ? 'Yes' : 'No'}</p>
            <p><strong>Staff:</strong> {user.is_staff ? 'Yes' : 'No'}</p>
            <p><strong>Superuser:</strong> {user.is_superuser ? 'Yes' : 'No'}</p>
            <p><strong>Joined:</strong> {new Date(user.date_joined).toLocaleDateString()}</p>
            <p><strong>Last Login:</strong> {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}</p>
          </>
        ) : (
          // This should ideally not be reached if ProtectedRoute is working correctly
          <p>Loading profile data...</p>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default ProfilePage;
