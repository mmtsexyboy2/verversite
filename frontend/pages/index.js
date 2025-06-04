import React from 'react';
import Link from 'next/link';

const HomePage = () => {
  // Basic check for token to conditionally show Login/Profile links
  // This is a very basic client-side check.
  // A more robust solution would use AuthContext or getServerSideProps.
  const [token, setToken] = React.useState(null);

  React.useEffect(() => {
    const storedToken = localStorage.getItem('jwtToken');
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>Welcome to the Application</h1>
      <nav>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li style={{ margin: '10px' }}>
            <Link href="/">Home</Link>
          </li>
          {token ? (
            <li style={{ margin: '10px' }}>
              <Link href="/profile">Profile</Link>
            </li>
          ) : (
            <li style={{ margin: '10px' }}>
              <Link href="/login">Login</Link>
            </li>
          )}
        </ul>
      </nav>
    </div>
  );
};

export default HomePage;
