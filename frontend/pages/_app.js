import '../styles/themes.css'; // Import global theme styles
// If you have a global.css, import it as well:
// import '../styles/globals.css';

// This default export is required in a new `pages/_app.js` file.
export default function MyApp({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
