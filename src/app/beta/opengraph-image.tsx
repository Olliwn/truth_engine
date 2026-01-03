import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export const alt = 'Finland Municipal Ponzi Index - Demographic Risk Heatmap';
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
          backgroundColor: '#0a0f1c',
          backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(127, 29, 29, 0.3) 0%, transparent 50%)',
          padding: '48px',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ color: '#dc2626', fontSize: '32px', fontWeight: 700 }}>Beta</span>
            <span style={{ color: '#6b7280', fontSize: '24px' }}>|</span>
            <span style={{ color: 'white', fontSize: '24px' }}>Demographic Ponzi Map</span>
          </div>
          <span style={{ color: '#6b7280', fontSize: '18px' }}>finlandtruthengine.com</span>
        </div>

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            gap: '48px',
          }}
        >
          {/* Left side - Big stat */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#6b7280', fontSize: '20px', marginBottom: '8px' }}>
              Municipalities at Critical Risk
            </span>
            <span
              style={{
                fontSize: '160px',
                fontWeight: 700,
                color: '#dc2626',
                lineHeight: 1,
              }}
            >
              21
            </span>
            <span style={{ color: '#9ca3af', fontSize: '24px', marginTop: '16px' }}>
              out of 309 analyzed
            </span>
          </div>

          {/* Right side - Top 5 */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '12px',
            }}
          >
            <span style={{ color: '#6b7280', fontSize: '18px', marginBottom: '8px' }}>
              TOP 5 HIGHEST PONZI INDEX
            </span>
            <RankRow rank={1} name="Kyyjärvi" value="78,131" />
            <RankRow rank={2} name="Lestijärvi" value="50,241" />
            <RankRow rank={3} name="Halsua" value="49,727" />
            <RankRow rank={4} name="Kannonkoski" value="49,705" />
            <RankRow rank={5} name="Rautavaara" value="47,558" />
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '32px',
            paddingTop: '24px',
            borderTop: '1px solid #1f2937',
          }}
        >
          <span style={{ color: '#6b7280', fontSize: '16px' }}>
            Data: Statistics Finland Population Projections 2024, Municipal Key Figures
          </span>
          <span style={{ color: '#6b7280', fontSize: '16px' }}>Explore the full map →</span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

function RankRow({ rank, name, value }: { rank: number; name: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: '12px 16px',
        borderRadius: '8px',
      }}
    >
      <span style={{ color: '#6b7280', fontSize: '18px', width: '32px' }}>#{rank}</span>
      <span style={{ color: 'white', fontSize: '20px', flex: 1 }}>{name}</span>
      <span style={{ color: '#dc2626', fontSize: '20px', fontWeight: 600 }}>{value}</span>
    </div>
  );
}

