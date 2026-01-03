import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'The Hidden Inflation - Maslow CPI';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
  // Key stats from our analysis (pre-calculated)
  const maslowChange = 24.3;
  const officialChange = 22.3;
  const gap = 2.0;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#0a0f1c',
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(245, 158, 11, 0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(239, 68, 68, 0.1) 0%, transparent 50%)',
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: 'rgba(245, 158, 11, 0.2)',
            borderRadius: '9999px',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#f59e0b',
            }}
          />
          <span style={{ color: '#fbbf24', fontSize: '18px' }}>
            Finland Truth Engine
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '40px',
          }}
        >
          <div style={{ fontSize: '72px', fontWeight: 'bold', color: 'white', marginBottom: '10px' }}>
            The Hidden Inflation
          </div>
          <div style={{ fontSize: '36px', color: '#f59e0b' }}>
            Maslow CPI vs Official Statistics
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'flex',
            gap: '40px',
            marginBottom: '40px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px 40px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              borderRadius: '16px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
            }}
          >
            <div style={{ color: '#9ca3af', fontSize: '18px', marginBottom: '8px' }}>
              Working Class
            </div>
            <div style={{ color: '#ef4444', fontSize: '56px', fontWeight: 'bold' }}>
              +{maslowChange.toFixed(1)}%
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px 40px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '16px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
            }}
          >
            <div style={{ color: '#9ca3af', fontSize: '18px', marginBottom: '8px' }}>
              Official CPI
            </div>
            <div style={{ color: '#3b82f6', fontSize: '56px', fontWeight: 'bold' }}>
              +{officialChange.toFixed(1)}%
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px 40px',
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderRadius: '16px',
              border: '1px solid rgba(245, 158, 11, 0.3)',
            }}
          >
            <div style={{ color: '#9ca3af', fontSize: '18px', marginBottom: '8px' }}>
              Hidden Gap
            </div>
            <div style={{ color: '#f59e0b', fontSize: '56px', fontWeight: 'bold' }}>
              +{gap.toFixed(1)}pp
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ color: '#6b7280', fontSize: '20px' }}>
          2015-2024 | Data from Statistics Finland
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

