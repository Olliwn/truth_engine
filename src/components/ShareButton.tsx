'use client';

import { MunicipalityData } from '@/lib/types';
import { formatNumber, formatRatio } from '@/lib/calculations';

interface ShareButtonProps {
  municipality?: MunicipalityData;
  variant?: 'icon' | 'full';
}

export default function ShareButton({ municipality, variant = 'full' }: ShareButtonProps) {
  const handleShare = () => {
    let text: string;
    let url = typeof window !== 'undefined' ? window.location.href : '';
    
    if (municipality) {
      text = `🇫🇮 ${municipality.municipality_name} ranks #${municipality.rank} in Finland's Municipal "Ponzi" Index

📊 Debt per future worker: €${formatNumber(municipality.debt_per_worker_eur)}
👥 Dependency ratio (2035): ${formatRatio(municipality.dependency_ratio)}
⚠️ Risk level: ${municipality.risk_category.toUpperCase()}

Explore the full map →`;
    } else {
      text = `🇫🇮 Finland's Municipal "Ponzi" Index reveals the demographic time bomb

📊 309 municipalities analyzed
⚠️ 21 at critical risk
💰 Median debt/worker: €11,435

The numbers don't lie →`;
    }
    
    // Try native share API first
    if (navigator.share) {
      navigator.share({
        title: 'Finland Truth Engine',
        text: text,
        url: url,
      }).catch(() => {
        // Fall back to Twitter
        openTwitterShare(text, url);
      });
    } else {
      openTwitterShare(text, url);
    }
  };
  
  const openTwitterShare = (text: string, url: string) => {
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(tweetUrl, '_blank', 'width=550,height=420');
  };
  
  if (variant === 'icon') {
    return (
      <button
        onClick={handleShare}
        className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
        title="Share on X/Twitter"
      >
        <XIcon />
      </button>
    );
  }
  
  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm"
    >
      <XIcon />
      <span>Share on X</span>
    </button>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

