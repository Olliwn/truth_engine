import Link from 'next/link';
import { promises as fs } from 'fs';
import path from 'path';
import { PonziData } from '@/lib/types';
import { formatNumber } from '@/lib/calculations';

async function getPonziStats() {
  try {
    const filePath = path.join(process.cwd(), 'data', 'ponzi_index.json');
    const data = await fs.readFile(filePath, 'utf-8');
    const ponziData: PonziData = JSON.parse(data);
    return ponziData['2035']?.statistics || null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const stats = await getPonziStats();
  
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-950/30 border border-red-900/50 rounded-full text-red-400 text-sm mb-8 animate-fade-in-up">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Data updated from Statistics Finland
          </div>
          
          {/* Main headline */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in-up delay-100">
            <span className="text-white">The Numbers</span>
            <br />
            <span className="text-red-500 text-glow">Don't Lie</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-12 animate-fade-in-up delay-200">
            Revealing the mathematical reality behind Finnish municipal finances. 
            Explore how demographic shifts and debt are creating an unsustainable 
            burden for future generations.
          </p>
          
          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up delay-300">
            <Link href="/beta" className="btn-primary text-lg">
              Explore the Ponzi Map
              <span className="ml-2">→</span>
            </Link>
            <a href="#projects" className="btn-secondary text-lg">
              View All Projects
            </a>
          </div>
          
          {/* Quick Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 animate-fade-in-up delay-400">
              <QuickStat 
                value={stats.total_municipalities.toString()} 
                label="Municipalities Analyzed" 
              />
              <QuickStat 
                value={stats.risk_distribution.critical.toString()} 
                label="Critical Risk" 
                highlight 
              />
              <QuickStat 
                value={`€${formatNumber(stats.debt_per_worker.median)}`} 
                label="Median Debt/Worker" 
              />
              <QuickStat 
                value={stats.dependency_ratio.median.toFixed(2)} 
                label="Median Dep. Ratio" 
              />
            </div>
          )}
        </div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </section>
      
      {/* Projects Section */}
      <section id="projects" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-center">
            Truth Engines
          </h2>
          <p className="text-gray-400 text-center max-w-2xl mx-auto mb-16">
            Data-driven analysis revealing policy failures through public statistics
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Project Beta */}
            <ProjectCard
              title="Demographic Ponzi"
              status="live"
              description="Municipal debt meets demographic decline. See which municipalities face statistical insolvency by 2035."
              href="/beta"
              metrics={[
                { label: 'Municipalities', value: '309' },
                { label: 'Projection', value: '2035' },
              ]}
            />
            
            {/* Project Gamma */}
            <ProjectCard
              title="Hidden Inflation"
              status="live"
              description="The Maslow CPI - tracking survival essentials vs. official inflation."
              href="/gamma"
              metrics={[
                { label: 'Period', value: '2015-2024' },
                { label: 'Gap', value: '+2.0pp' },
              ]}
            />
            
            {/* Project Delta */}
            <ProjectCard
              title="Purchasing Power"
              status="live"
              description="How real income diverges across income deciles. The rich vs poor divide."
              href="/delta"
              metrics={[
                { label: 'Bottom 10%', value: '-23%' },
                { label: 'Top 10%', value: '-15%' },
              ]}
            />
            
            {/* Project Alpha */}
            <ProjectCard
              title="The Wage Trap"
              status="live"
              description="Calculate the true hourly value of work after benefits clawback. See where EMTR hits 90%+."
              href="/alpha"
              metrics={[
                { label: 'Peak EMTR', value: '90%+' },
                { label: 'Profiles', value: '7' },
              ]}
            />
          </div>
        </div>
      </section>
      
      {/* Methodology Section */}
      <section className="py-24 px-6 bg-gray-950/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8 text-center">Our Methodology</h2>
          
          <div className="space-y-8">
            <MethodCard
              number="01"
              title="Public Data Only"
              description="All data comes from Statistics Finland's official databases. No estimates, no assumptions - just the raw numbers."
            />
            <MethodCard
              number="02"
              title="Transparent Calculations"
              description="Every formula is documented and open source. The Ponzi Index = (Debt/Workers) × (Dependents/Workers). Simple math, uncomfortable truths."
            />
            <MethodCard
              number="03"
              title="No Editorializing"
              description="We present the data. You draw conclusions. Our job is to make the numbers accessible, not to tell you what to think."
            />
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="py-12 px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-gray-500 text-sm">
            Data sources: Statistics Finland, Municipal Key Figures, Population Projections 2024
          </div>
          <div className="text-gray-500 text-sm">
            Finland Truth Engine © 2025
          </div>
        </div>
      </footer>
      </main>
  );
}

function QuickStat({ value, label, highlight = false }: { value: string; label: string; highlight?: boolean }) {
  return (
    <div className="text-center">
      <div className={`text-3xl font-bold mono-data ${highlight ? 'text-red-500' : 'text-white'}`}>
        {value}
      </div>
      <div className="text-gray-500 text-sm mt-1">{label}</div>
    </div>
  );
}

function ProjectCard({ 
  title, 
  status, 
  description, 
  href, 
  metrics 
}: { 
  title: string; 
  status: 'live' | 'coming'; 
  description: string; 
  href?: string; 
  metrics: { label: string; value: string }[];
}) {
  const content = (
    <div className={`card p-6 h-full transition-all ${href ? 'hover:border-red-900/50 hover:shadow-lg hover:shadow-red-950/20 cursor-pointer' : 'opacity-70'}`}>
      <div className="flex items-center gap-2 mb-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          status === 'live' 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-gray-700/50 text-gray-400'
        }`}>
          {status === 'live' ? 'LIVE' : 'COMING SOON'}
        </span>
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-gray-400 text-sm mb-6">{description}</p>
      <div className="flex flex-wrap gap-4 mt-auto">
        {metrics.map((m, i) => (
          <div key={i}>
            <div className="text-gray-500 text-xs">{m.label}</div>
            <div className="font-semibold mono-data">{m.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
  
  return href ? <Link href={href}>{content}</Link> : <div>{content}</div>;
}

function MethodCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-6">
      <div className="text-4xl font-bold text-red-500/30 mono-data">{number}</div>
      <div>
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  );
}
