import React from 'react';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext'; // Add this

const Layout = ({ children }) => {
  const { user, logout, googleLogin, loading } = useAuth(); // Destructure googleLogin and loading

  return (
    <div>
      <nav style={{ padding: '1rem', borderBottom: '1px solid #ccc', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link href="/"><a>Home</a></Link>
          {user && <Link href="/profile"><a style={{marginLeft: '10px'}}>Profile</a></Link>}
        </div>
        <div>
          {loading ? (
            <p>Loading auth...</p>
          ) : user ? (
            <>
              <span style={{marginRight: '10px'}}>Hi, {user.username || user.email}!</span>
              {user.avatar_url && <img src={user.avatar_url} alt="avatar" style={{width: '30px', height: '30px', borderRadius: '50%', marginRight: '10px', verticalAlign: 'middle'}} />}
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <button onClick={googleLogin}>Login with Google</button>
          )}
        </div>
      </nav>
      <main style={{ padding: '1rem' }}>{children}</main>
      <footer style={{ padding: '1rem', borderTop: '1px solid #ccc', marginTop: '1rem', textAlign: 'center' }}>
        <p>&copy; Ver Ver Site</p>
      </footer>
    </div>
  );
};
export default Layout;
