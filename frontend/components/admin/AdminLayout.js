import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { fetchUserProfile } from '../../services/api'; // Assuming this fetches /api/users/me

const AdminLayout = ({ children }) => {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAdminStatus = async () => {
      try {
        const userProfile = await fetchUserProfile(); // Fetches /api/users/me
        if (userProfile && userProfile.isAdmin) {
          setIsAdmin(true);
        } else {
          router.push('/'); // Redirect to home if not admin
        }
      } catch (error) {
        console.error('Error verifying admin status:', error);
        router.push('/login'); // Redirect to login on error
      } finally {
        setLoading(false);
      }
    };
    checkAdminStatus();
  }, [router]);

  const styles = {
    layout: { display: 'flex', minHeight: '100vh' },
    sidebar: {
      width: '250px',
      backgroundColor: '#2c3e50',
      color: 'white',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column'
    },
    navLink: {
      color: 'white',
      textDecoration: 'none',
      marginBottom: '15px',
      fontSize: '1.1em',
      padding: '10px',
      borderRadius: '4px',
      transition: 'background-color 0.2s ease'
    },
    // navLinkHover: { backgroundColor: '#34495e' }, // Implemented with inline onMouseOver/Out
    activeNavLink: { backgroundColor: '#1abc9c' }, // Example active style
    content: { flexGrow: 1, padding: '20px', backgroundColor: '#ecf0f1' },
    title: { marginBottom: '30px', color: '#bdc3c7'},
    footerLink: { marginTop: 'auto', color: '#bdc3c7', textDecoration: 'none', fontSize: '0.9em'}
  };

  const isActive = (pathname) => router.pathname === pathname;


  if (loading) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><p>Verifying admin access...</p></div>;
  }

  if (!isAdmin) {
    // This will typically be a brief flash before redirect, or not shown if redirect is fast.
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}><p>Access Denied. Redirecting...</p></div>;
  }

  return (
    <div style={styles.layout}>
      <aside style={styles.sidebar}>
        <h2 style={styles.title}>Admin Panel</h2>
        <Link href="/admin/users" style={{...styles.navLink, ...(isActive('/admin/users') && styles.activeNavLink)}}
              onMouseOver={e => {if(!isActive('/admin/users')) e.currentTarget.style.backgroundColor='#34495e'}}
              onMouseOut={e => {if(!isActive('/admin/users'))e.currentTarget.style.backgroundColor='transparent'}}>
          Users
        </Link>
        <Link href="/admin/categories" style={{...styles.navLink, ...(isActive('/admin/categories') && styles.activeNavLink)}}
              onMouseOver={e => {if(!isActive('/admin/categories')) e.currentTarget.style.backgroundColor='#34495e'}}
              onMouseOut={e => {if(!isActive('/admin/categories'))e.currentTarget.style.backgroundColor='transparent'}}>
          Categories
        </Link>
        <Link href="/admin/topics" style={{...styles.navLink, ...(isActive('/admin/topics') && styles.activeNavLink)}}
              onMouseOver={e => {if(!isActive('/admin/topics')) e.currentTarget.style.backgroundColor='#34495e'}}
              onMouseOut={e => {if(!isActive('/admin/topics'))e.currentTarget.style.backgroundColor='transparent'}}>
          Topics
        </Link>
        <Link href="/admin/reports" style={{...styles.navLink, ...(isActive('/admin/reports') && styles.activeNavLink)}}
              onMouseOver={e => {if(!isActive('/admin/reports')) e.currentTarget.style.backgroundColor='#34495e'}}
              onMouseOut={e => {if(!isActive('/admin/reports'))e.currentTarget.style.backgroundColor='transparent'}}>
          Reports
        </Link>
        {/* Add more admin links here */}
        <Link href="/" style={{...styles.navLink, ...styles.footerLink}}
              onMouseOver={e => e.currentTarget.style.backgroundColor='#34495e'}
              onMouseOut={e => e.currentTarget.style.backgroundColor='transparent'}}>
          Back to Site
        </Link>
      </aside>
      <main style={styles.content}>{children}</main>
    </div>
  );
};

export default AdminLayout;
