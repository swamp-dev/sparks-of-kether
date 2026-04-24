export default function HomePage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        background: '#0e0a1f',
        color: '#f8f8ff',
        padding: '2rem',
        textAlign: 'center',
      }}
    >
      <h1 style={{ fontSize: '3rem', margin: 0, letterSpacing: '0.05em' }}>Sparks of Kether</h1>
      <p style={{ marginTop: '1rem', fontSize: '1.1rem', opacity: 0.7, maxWidth: '32rem' }}>
        A cooperative ascent up the Kabbalistic Tree of Life.
      </p>
      <p style={{ marginTop: '2rem', fontSize: '0.9rem', opacity: 0.4 }}>coming soon</p>
    </main>
  );
}
