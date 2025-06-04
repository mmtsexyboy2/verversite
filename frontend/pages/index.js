import Head from 'next/head'
import Link from 'next/link' // Import Link

export default function Home() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <Head>
        <title>My Fullstack App</title>
        <meta name="description" content="Foundation, Auth, User Core" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <h1>
          Welcome to the Application!
        </h1>

        <p style={{ marginTop: '30px', fontSize: '18px' }}>
          This is the starting point of the project.
        </p>

        <div style={{ marginTop: '30px' }}>
          <Link href="/login" passHref>
            <a style={{ marginRight: '20px', fontSize: '16px' }}>Go to Login</a>
          </Link>
          <Link href="/profile" passHref>
            <a style={{ fontSize: '16px' }}>Go to Profile</a>
          </Link>
        </div>
      </main>
    </div>
  )
}
