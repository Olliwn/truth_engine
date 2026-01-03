import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Finland Truth Engine - Data-Driven Policy Analysis';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default async function Image() {
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
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(127, 29, 29, 0.2) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(234, 88, 12, 0.1) 0%, transparent 50%)',
        }}
      >
        {/* Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '12px 24px',
            backgroundColor: 'rgba(127, 29, 29, 0.3)',
            border: '1px solid rgba(127, 29, 29, 0.5)',
            borderRadius: '9999px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              backgroundColor: '#dc2626',
              borderRadius: '9999px',
            }}
          />
          <span style={{ color: '#f87171', fontSize: '18px' }}>
            Data from Statistics Finland
          </span>
        </div>

        {/* Title */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <span
            style={{
              fontSize: '72px',
              fontWeight: 700,
              color: 'white',
            }}
          >
            The Numbers
          </span>
          <span
            style={{
              fontSize: '72px',
              fontWeight: 700,
              color: '#dc2626',
            }}
          >
            Don't Lie
          </span>
        </div>

        {/* Subtitle */}
        <p
          style={{
            fontSize: '28px',
            color: '#9ca3af',
            textAlign: 'center',
            maxWidth: '800px',
            marginTop: '24px',
          }}
        >
          Revealing the mathematical reality behind Finnish municipal finances
        </p>

        {/* Stats Row */}
        <div
          style={{
            display: 'flex',
            gap: '48px',
            marginTop: '48px',
          }}
        >
          <StatBox value="309" label="Municipalities" />
          <StatBox value="21" label="Critical Risk" highlight />
          <StatBox value="€11,435" label="Median Debt/Worker" />
        </div>

        {/* Footer */}
        <div
          style={{
            position: 'absolute',
            bottom: '32px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#6b7280',
            fontSize: '16px',
          }}
        >
          <span>🇫🇮</span>
          <span>Finland Truth Engine</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

function StatBox({ value, label, highlight = false }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <span
        style={{
          fontSize: '48px',
          fontWeight: 700,
          color: highlight ? '#dc2626' : 'white',
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: '18px', color: '#6b7280' }}>{label}</span>
    </div>
  );
}

