import '../styles/globals.css';
import { AuthProvider } from '../contexts/AuthContext';
import Layout from '../components/Layout'; // Import Layout

function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <Layout> {/* Wrap Component with Layout */}
        <Component {...pageProps} />
      </Layout>
    </AuthProvider>
  );
}
export default MyApp;
