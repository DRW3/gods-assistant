import React from 'react';

const App: React.FC = () => {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
      }}
    >
      <span
        style={{
          color: '#00F0FF',
          fontFamily: 'monospace',
          fontSize: '1.5rem',
          fontWeight: 600,
          letterSpacing: '0.05em',
          textShadow: '0 0 20px rgba(0, 240, 255, 0.4)',
        }}
      >
        God's Assistant
      </span>
    </div>
  );
};

export default App;
