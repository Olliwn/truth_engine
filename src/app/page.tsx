import Link from 'next/link';

export default async function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero Section - Compact */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background gradient effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 via-transparent to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-600/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-950/30 border border-red-900/50 rounded-full text-red-400 text-sm mb-8 animate-fade-in-up">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Public data • Open source • No agenda
          </div>
          
          {/* Main headline */}
          <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fade-in-up delay-100">
            <span className="text-white">Finland</span>{' '}
            <span className="text-red-500 text-glow">Truth Engine</span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 animate-fade-in-up delay-200">
            Data-driven analysis of Finnish economic policy. 
            Revealing what the numbers actually say about taxes, benefits, 
            inflation, and municipal finances.
          </p>
          
          {/* Quick access to interactive tool */}
          <div className="animate-fade-in-up delay-300">
            <Link href="/alpha" className="btn-primary text-lg group">
              <span>🧮</span>
              Try the Wage Trap Calculator
              <span className="ml-2 group-hover:translate-x-1 transition-transform">→</span>
            </Link>
            <p className="text-sm text-gray-500 mt-3">
              See how much you really keep after taxes & benefit clawbacks
            </p>
          </div>
        </div>
      </section>
      
      {/* Featured Projects Grid */}
      <section className="py-8 px-6 border-t border-gray-800/50">
        <div className="max-w-6xl mx-auto">
          {/* Priority: Wage Trap, Tax Burden, Voting Incentives */}
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <FeaturedCard
              emoji="🧮"
              title="Wage Trap"
              subtitle="Interactive Calculator"
              href="/alpha"
              color="amber"
            />
            <FeaturedCard
              emoji="🏛️"
              title="Tax Burden"
              subtitle="Private vs Public"
              href="/epsilon"
              color="blue"
            />
            <FeaturedCard
              emoji="🗳️"
              title="Voting Incentives"
              subtitle="Democracy Dilemma"
              href="/lambda"
              color="purple"
            />
          </div>
          {/* Row 2: Workforce, Ponzi Map, Hidden Inflation */}
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <FeaturedCard
              emoji="📉"
              title="Workforce Futures"
              subtitle="2040 Projections"
              href="/mu"
              color="teal"
            />
            <FeaturedCard
              emoji="🗺️"
              title="Ponzi Map"
              subtitle="Municipal Finances"
              href="/beta"
              color="red"
            />
            <FeaturedCard
              emoji="📈"
              title="Hidden Inflation"
              subtitle="Maslow CPI"
              href="/gamma"
              color="orange"
            />
          </div>
          {/* Row 3: Purchasing Power, Deindustrialization, Trade */}
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <FeaturedCard
              emoji="💰"
              title="Purchasing Power"
              subtitle="By Income Decile"
              href="/delta"
              color="green"
            />
            <FeaturedCard
              emoji="🏭"
              title="Deindustrialization"
              subtitle="Employment Shift"
              href="/zeta"
              color="orange"
            />
            <FeaturedCard
              emoji="⚖️"
              title="Trade Reality"
              subtitle="Exports vs Imports"
              href="/eta"
              color="teal"
            />
          </div>
          {/* Row 4: Balance Sheet, Fertility, Public Spending */}
          <div className="grid md:grid-cols-3 gap-4 mb-4">
            <FeaturedCard
              emoji="📊"
              title="Balance Sheet"
              subtitle="Government Debt"
              href="/theta"
              color="rose"
            />
            <FeaturedCard
              emoji="👶"
              title="Fertility"
              subtitle="Birth Rate Crisis"
              href="/iota"
              color="pink"
            />
            <FeaturedCard
              emoji="🏛️"
              title="Spending Structure"
              subtitle="COFOG Breakdown"
              href="/nu"
              color="indigo"
            />
          </div>
          {/* Row 5: Spending Efficiency, Lifetime Fiscal, Population */}
          <div className="grid md:grid-cols-3 gap-4">
            <FeaturedCard
              emoji="⚡"
              title="Spending Efficiency"
              subtitle="Beneficiaries vs Bureaucracy"
              href="/xi"
              color="emerald"
            />
            <FeaturedCard
              emoji="🧬"
              title="Lifetime Fiscal"
              subtitle="Birth to Death Simulation"
              href="/rho"
              color="teal"
            />
            <FeaturedCard
              emoji="Σ"
              title="Population Fiscal"
              subtitle="Demographic Sustainability"
              href="/sigma"
              color="amber"
            />
            <FeaturedCard
              emoji="Σ²"
              title="Population Fiscal v2"
              subtitle="Redesigned Interface"
              href="/sigma2"
              color="purple"
            />
            <FeaturedCard
              emoji="Σ³"
              title="Fiscal Future"
              subtitle="COFOG Spending Model"
              href="/sigma3"
              color="emerald"
            />
          </div>
        </div>
      </section>
      
      {/* Detailed Projects Section */}
      <section id="projects" className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold mb-8 text-gray-300">
            Explore the Data
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Priority 1: Wage Trap */}
            <ProjectCard
              title="The Wage Trap Calculator"
              emoji="🧮"
              status="live"
              description="Interactive tool showing how taxes and benefit clawbacks combine to create effective marginal tax rates over 90%. Includes dual-earner mode for couples."
              href="/alpha"
              highlight
              metrics={[
                { label: 'Profiles', value: '7' },
                { label: 'Peak EMTR', value: '100%' },
                { label: 'Dual Earner', value: 'Yes' },
              ]}
            />
            
            {/* Priority 2: Tax Burden */}
            <ProjectCard
              title="Tax Burden Atlas"
              emoji="🏛️"
              status="live"
              description="55% of GDP is government-dependent. See how public sector, subsidies, and benefits shape the true economic split."
              href="/epsilon"
              highlight
              metrics={[
                { label: 'Govt Footprint', value: '55%' },
                { label: 'Benefits', value: '€52B' },
                { label: 'Period', value: '1990-2024' },
              ]}
            />
            
            {/* Priority 3: Voting Incentives */}
            <ProjectCard
              title="The Democracy Dilemma"
              emoji="🗳️"
              status="live"
              description="What % of voters benefit from bigger government? Combining public workers, pensioners, and benefit recipients reveals structural majority for expansion."
              href="/lambda"
              highlight
              metrics={[
                { label: 'Pro-Big-Govt', value: '~68%' },
                { label: 'Public Workers', value: '731k' },
                { label: 'Pensioners', value: '1.5M' },
              ]}
            />
            
            {/* Workforce Futures */}
            <ProjectCard
              title="Workforce Futures"
              emoji="📉"
              status="live"
              description="How will Finland's shrinking workforce support a growing elderly population? Three scenarios project the public/private balance to 2040."
              href="/mu"
              metrics={[
                { label: 'Working Age', value: '-10%' },
                { label: 'Elderly', value: '+28%' },
                { label: 'Horizon', value: '2040' },
              ]}
            />
            
            {/* Ponzi Map */}
            <ProjectCard
              title="Municipal Ponzi Heatmap"
              emoji="🗺️"
              status="live"
              description="Which municipalities face statistical insolvency by 2035? Combining debt per worker with dependency ratios reveals the unsustainable math."
              href="/beta"
              metrics={[
                { label: 'Municipalities', value: '309' },
                { label: 'Projection', value: '2035' },
                { label: 'Critical Risk', value: '45+' },
              ]}
            />
            
            {/* Hidden Inflation */}
            <ProjectCard
              title="Hidden Inflation (Maslow CPI)"
              emoji="📈"
              status="live"
              description="Official CPI includes TVs and holidays. What if we only tracked essentials? The 'Maslow CPI' shows working-class inflation is higher."
              href="/gamma"
              metrics={[
                { label: 'Period', value: '2015-2024' },
                { label: 'Gap', value: '+8pp' },
                { label: 'Asset Index', value: '+89%' },
              ]}
            />
            
            {/* Purchasing Power */}
            <ProjectCard
              title="Purchasing Power by Decile"
              emoji="💰"
              status="live"
              description="Tracking real income and wealth across income groups since 2015. See how prosperity gains have been distributed—or not."
              href="/delta"
              metrics={[
                { label: 'Bottom 10%', value: '-23%' },
                { label: 'Top 10%', value: '-15%' },
                { label: 'Wealth Gap', value: '↗️' },
              ]}
            />
            
            {/* Deindustrialization */}
            <ProjectCard
              title="Deindustrialization Map"
              emoji="🏭"
              status="live"
              description="Finland's structural shift from export-generating manufacturing to domestic services and public administration."
              href="/zeta"
              metrics={[
                { label: 'Mfg Jobs Lost', value: '-99k' },
                { label: 'Public Added', value: '+92k' },
                { label: 'Period', value: '2007-2023' },
              ]}
            />
            
            {/* Trade Reality */}
            <ProjectCard
              title="Trade Reality"
              emoji="⚖️"
              status="live"
              description="From Nokia-era surpluses to current balance. A country that imports more than it exports is borrowing against its future."
              href="/eta"
              metrics={[
                { label: 'Peak Surplus', value: '€9B' },
                { label: 'Nokia Era', value: '2007' },
                { label: 'Period', value: '2006-2025' },
              ]}
            />
            
            {/* Balance Sheet */}
            <ProjectCard
              title="Government Balance Sheet"
              emoji="📊"
              status="live"
              description="Finland's government debt has nearly tripled since 2000. What's the per-worker burden and where is the money going?"
              href="/theta"
              metrics={[
                { label: 'Total Debt', value: '€228B' },
                { label: 'Growth', value: '+270%' },
                { label: 'Per Worker', value: '€69k' },
              ]}
            />
            
            {/* Fertility */}
            <ProjectCard
              title="The Fertility Equation"
              emoji="👶"
              status="live"
              description="Finland has generous parental leave and childcare. So why has fertility collapsed to historic lows? The data challenges assumptions."
              href="/iota"
              metrics={[
                { label: 'Current TFR', value: '1.25' },
                { label: 'Replacement', value: '2.1' },
                { label: 'Since 1990', value: '-30%' },
              ]}
            />
            
            <ProjectCard
              title="Public Spending Structure"
              emoji="🏛️"
              status="live"
              description="Where does €159B of government spending go? COFOG classification breakdown showing Social Protection dominates at 46%, plus sector-by-sector analysis."
              href="/nu"
              metrics={[
                { label: 'Total', value: '€159B' },
                { label: '% of GDP', value: '58%' },
                { label: 'Per Capita', value: '€28k' },
              ]}
            />
            
            <ProjectCard
              title="Spending Efficiency Analysis"
              emoji="⚡"
              status="live"
              description="What % of government spending reaches citizens vs bureaucracy? Pensions deliver 87% directly, while family programs only 48%. Deep dive into transaction types."
              href="/xi"
              metrics={[
                { label: 'To Citizens', value: '54%' },
                { label: 'Bureaucracy', value: '14%' },
                { label: 'Programs', value: '3' },
              ]}
            />
            
            <ProjectCard
              title="Lifetime Fiscal Simulator"
              emoji="🧬"
              status="live"
              description="Simulate a person's fiscal relationship with Finland from birth to death. See cumulative taxes paid vs education, healthcare, benefits, and pension received across different life paths."
              href="/rho"
              metrics={[
                { label: 'Profiles', value: '8' },
                { label: 'Break-even', value: '~41 yrs' },
                { label: 'Lifespan', value: '0-85' },
              ]}
            />
            
            <ProjectCard
              title="Population Fiscal Simulator"
              emoji="Σ"
              status="live"
              description="Watch Finland's demographic transition from 1990-2060. See how the baby boom retirement wave transforms the population pyramid and strains fiscal sustainability."
              href="/sigma"
              metrics={[
                { label: 'Years', value: '1990-2060' },
                { label: 'Dependency', value: '22%→45%' },
                { label: 'Cohorts', value: '80+' },
              ]}
            />
            
            <ProjectCard
              title="Population Fiscal v2"
              emoji="Σ²"
              status="live"
              description="Redesigned population fiscal simulator with sidebar controls, tabbed results, and improved UX. Configure scenarios on the left, explore results on the right."
              href="/sigma2"
              metrics={[
                { label: 'Layout', value: 'Sidebar' },
                { label: 'Tabs', value: '4' },
                { label: 'Components', value: '10+' },
              ]}
            />
            
            <ProjectCard
              title="Fiscal Future (COFOG)"
              emoji="Σ³"
              status="live"
              description="Full COFOG government spending model. Historical data (1990-2024) + scenario projections (2025-2060). Control spending by group: healthcare, education, security, infrastructure, government, culture."
              href="/sigma3"
              highlight
              metrics={[
                { label: 'COFOG Categories', value: '10' },
                { label: 'Scenario Groups', value: '6' },
                { label: 'Base Year', value: '2024' },
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

function FeaturedCard({ 
  emoji,
  title, 
  subtitle,
  href,
  color = 'red'
}: { 
  emoji: string;
  title: string; 
  subtitle: string;
  href: string;
  color?: 'red' | 'amber' | 'orange' | 'green' | 'blue' | 'teal' | 'rose' | 'pink' | 'purple' | 'indigo' | 'emerald';
}) {
  const colorClasses = {
    red: 'hover:border-red-500/50 hover:bg-red-950/20',
    amber: 'hover:border-amber-500/50 hover:bg-amber-950/20',
    orange: 'hover:border-orange-500/50 hover:bg-orange-950/20',
    green: 'hover:border-green-500/50 hover:bg-green-950/20',
    blue: 'hover:border-blue-500/50 hover:bg-blue-950/20',
    teal: 'hover:border-teal-500/50 hover:bg-teal-950/20',
    rose: 'hover:border-rose-500/50 hover:bg-rose-950/20',
    pink: 'hover:border-pink-500/50 hover:bg-pink-950/20',
    purple: 'hover:border-purple-500/50 hover:bg-purple-950/20',
    indigo: 'hover:border-indigo-500/50 hover:bg-indigo-950/20',
    emerald: 'hover:border-emerald-500/50 hover:bg-emerald-950/20',
  };
  
  return (
    <Link href={href}>
      <div className={`p-4 rounded-lg border border-gray-800 bg-gray-900/50 transition-all cursor-pointer ${colorClasses[color]}`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{emoji}</span>
          <div>
            <div className="font-semibold text-white">{title}</div>
            <div className="text-xs text-gray-500">{subtitle}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function ProjectCard({ 
  title, 
  emoji,
  status, 
  description, 
  href, 
  metrics,
  highlight = false,
}: { 
  title: string; 
  emoji: string;
  status: 'live' | 'coming'; 
  description: string; 
  href?: string; 
  metrics: { label: string; value: string }[];
  highlight?: boolean;
}) {
  const content = (
    <div className={`card p-6 h-full transition-all ${
      href ? 'hover:border-red-900/50 hover:shadow-lg hover:shadow-red-950/20 cursor-pointer' : 'opacity-70'
    } ${highlight ? 'border-amber-500/30 bg-amber-950/10' : ''}`}>
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{emoji}</span>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          status === 'live' 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-gray-700/50 text-gray-400'
        }`}>
          {status === 'live' ? 'LIVE' : 'COMING SOON'}
        </span>
      </div>
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm mb-4 leading-relaxed">{description}</p>
      <div className="flex flex-wrap gap-4 mt-auto pt-4 border-t border-gray-800">
        {metrics.map((m, i) => (
          <div key={i}>
            <div className="text-gray-500 text-xs">{m.label}</div>
            <div className="font-semibold mono-data text-sm">{m.value}</div>
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
