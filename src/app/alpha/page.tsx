'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import IncomeSlider from '@/components/IncomeSlider';
import ProfileSelector from '@/components/ProfileSelector';
import ValleyOfDeathChart from '@/components/ValleyOfDeathChart';
import { 
  calculateWage, 
  generateWageCurve,
  findValleyOfDeath,
  calculateEscapeVelocity,
  WageCalculationResult,
} from '@/lib/wageCalculator';
import { 
  WageTrapHouseholdProfile, 
  WageTrapMunicipality, 
  WageTrapEmploymentStatus,
  getEMTRColor,
  HOUSEHOLD_PROFILE_LABELS,
} from '@/lib/types';
import { Municipality, HouseholdProfile, EmploymentStatus } from '@/lib/constants/benefits2024';

export default function AlphaPage() {
  // Input state
  const [grossIncome, setGrossIncome] = useState(2000);
  const [monthlyRent, setMonthlyRent] = useState(800);
  const [householdProfile, setHouseholdProfile] = useState<WageTrapHouseholdProfile>('single');
  const [municipality, setMunicipality] = useState<WageTrapMunicipality>('helsinki');
  const [employmentStatus, setEmploymentStatus] = useState<WageTrapEmploymentStatus>('employed');
  const [hasDaycare, setHasDaycare] = useState(true); // Default ON per user request
  const [dualEarner, setDualEarner] = useState(false); // Dual earner mode for couples
  const [incomeDistribution, setIncomeDistribution] = useState(0.5); // 50/50 split default

  // Check if profile is a couple (has 2 adults)
  const isCouple = householdProfile.startsWith('couple');

  // Calculate current result
  const currentResult = useMemo(() => {
    return calculateWage({
      grossMonthlyIncome: grossIncome,
      monthlyRent,
      municipality: municipality as Municipality,
      householdProfile: householdProfile as HouseholdProfile,
      employmentStatus: employmentStatus as EmploymentStatus,
      hasDaycare,
      dualEarner: isCouple ? dualEarner : false,
      incomeDistribution,
    });
  }, [grossIncome, monthlyRent, municipality, householdProfile, employmentStatus, hasDaycare, dualEarner, incomeDistribution, isCouple]);

  // Generate curve data
  const curveData = useMemo(() => {
    return generateWageCurve(
      monthlyRent,
      municipality as Municipality,
      householdProfile as HouseholdProfile,
      employmentStatus as EmploymentStatus,
      10000,
      50,
      hasDaycare,
      isCouple ? dualEarner : false,
      incomeDistribution
    );
  }, [monthlyRent, municipality, householdProfile, employmentStatus, hasDaycare, dualEarner, incomeDistribution, isCouple]);

  // Find valley and escape velocity
  const valley = useMemo(() => {
    return findValleyOfDeath(
      monthlyRent,
      municipality as Municipality,
      householdProfile as HouseholdProfile,
      employmentStatus as EmploymentStatus,
      hasDaycare,
      isCouple ? dualEarner : false,
      incomeDistribution
    );
  }, [monthlyRent, municipality, householdProfile, employmentStatus, hasDaycare, dualEarner, incomeDistribution, isCouple]);

  const escapeVelocity = useMemo(() => {
    return calculateEscapeVelocity(
      monthlyRent,
      municipality as Municipality,
      householdProfile as HouseholdProfile,
      employmentStatus as EmploymentStatus,
      hasDaycare,
      isCouple ? dualEarner : false,
      incomeDistribution
    );
  }, [monthlyRent, municipality, householdProfile, employmentStatus, hasDaycare, dualEarner, incomeDistribution, isCouple]);

  // Zero work income
  const zeroWorkResult = useMemo(() => {
    return calculateWage({
      grossMonthlyIncome: 0,
      monthlyRent,
      municipality: municipality as Municipality,
      householdProfile: householdProfile as HouseholdProfile,
      employmentStatus: employmentStatus as EmploymentStatus,
      hasDaycare,
      dualEarner: isCouple ? dualEarner : false,
      incomeDistribution,
    });
  }, [monthlyRent, municipality, householdProfile, employmentStatus, hasDaycare, dualEarner, incomeDistribution, isCouple]);

  const formatEuro = (amount: number) => {
    return new Intl.NumberFormat('fi-FI', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate gain from working vs not working
  const gainFromWorking = currentResult.netDisposableIncome - zeroWorkResult.netDisposableIncome;
  const effectiveHourlyWage = gainFromWorking / 160; // Assuming 160 hours/month

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            <span>Back</span>
          </Link>

          <h1 className="text-lg font-semibold">
            <span className="text-red-500">Alpha</span> | The Wage Trap
          </h1>

          <ShareButton result={currentResult} valley={valley} />
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-8 px-6 border-b border-gray-800 bg-gradient-to-b from-red-950/20 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                The <span className="text-red-400">Valley of Death</span>
              </h2>
              <p className="text-xl text-gray-400 mb-6">
                Where earning more means keeping less. Discover the income range where 
                taxes and benefit clawbacks take up to <span className="text-red-400 font-bold">
                {(valley.peakEMTR * 100).toFixed(0)}%</span> of each additional euro.
              </p>
              
              {/* Key stat highlight */}
              <div className="card p-6 bg-red-950/20 border-red-900/30">
                <div className="text-sm text-gray-400 mb-2">At {formatEuro(grossIncome)}/month gross income:</div>
                <div className="text-3xl font-bold mb-2" style={{ color: getEMTRColor(currentResult.effectiveMarginalTaxRate) }}>
                  You keep €{currentResult.keepPerEuro.toFixed(2)} per €1
                </div>
                <div className="text-sm text-gray-500">
                  {currentResult.effectiveMarginalTaxRate > 0.7 
                    ? '⚠️ You are in the trap zone!'
                    : currentResult.effectiveMarginalTaxRate > 0.5
                    ? '⚡ Elevated marginal rate'
                    : '✓ Normal marginal rate'}
                </div>
              </div>
            </div>

            {/* Quick result cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="card p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Net Disposable</div>
                <div className="text-2xl font-bold text-amber-400 font-mono">
                  {formatEuro(currentResult.netDisposableIncome)}
                </div>
                <div className="text-xs text-gray-500 mt-1">/month</div>
              </div>
              
              <div className="card p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Benefits Received</div>
                <div className="text-2xl font-bold text-green-400 font-mono">
                  +{formatEuro(currentResult.totalBenefits)}
                </div>
                <div className="text-xs text-gray-500 mt-1">/month</div>
              </div>
              
              <div className="card p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Gain vs Zero Work</div>
                <div className={`text-2xl font-bold font-mono ${gainFromWorking > 100 ? 'text-green-400' : gainFromWorking > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {gainFromWorking >= 0 ? '+' : ''}{formatEuro(gainFromWorking)}
                </div>
                <div className="text-xs text-gray-500 mt-1">/month</div>
              </div>
              
              <div className="card p-4">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Effective Hourly</div>
                <div className={`text-2xl font-bold font-mono ${effectiveHourlyWage > 5 ? 'text-green-400' : effectiveHourlyWage > 0 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {formatEuro(Math.max(0, effectiveHourlyWage))}
                </div>
                <div className="text-xs text-gray-500 mt-1">/hour worked</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Controls sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Income Slider</h3>
              <IncomeSlider
                value={grossIncome}
                onChange={setGrossIncome}
                min={0}
                max={10000}
                step={50}
              />
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold mb-4">Your Profile</h3>
              <ProfileSelector
                householdProfile={householdProfile}
                municipality={municipality}
                employmentStatus={employmentStatus}
                monthlyRent={monthlyRent}
                hasDaycare={hasDaycare}
                dualEarner={dualEarner}
                incomeDistribution={incomeDistribution}
                onHouseholdChange={setHouseholdProfile}
                onMunicipalityChange={setMunicipality}
                onEmploymentChange={setEmploymentStatus}
                onRentChange={setMonthlyRent}
                onDaycareChange={setHasDaycare}
                onDualEarnerChange={setDualEarner}
                onIncomeDistributionChange={setIncomeDistribution}
              />
            </div>
          </div>

          {/* Chart area */}
          <div className="lg:col-span-2 space-y-6">
            <ValleyOfDeathChart
              data={curveData}
              currentGrossIncome={grossIncome}
              valleyStart={valley.start}
              valleyEnd={valley.end}
              escapeVelocity={escapeVelocity}
              zeroWorkIncome={zeroWorkResult.netDisposableIncome}
            />
          </div>
        </div>

        {/* Detailed breakdown */}
        <section className="mt-12 pt-12 border-t border-gray-800">
          <h2 className="text-2xl font-bold mb-6">Detailed Breakdown</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Taxes breakdown */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center gap-2">
                <span>💸</span> Taxes & Deductions
                {currentResult.isDualEarner && <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">Dual Earner</span>}
              </h3>
              <div className="space-y-3 text-sm">
                <BreakdownRow label="Gross Income (Combined)" value={currentResult.grossMonthlyIncome} />
                
                {currentResult.isDualEarner && currentResult.taxes2 ? (
                  <>
                    <div className="border-t border-gray-800 pt-2 mt-2">
                      <div className="text-xs text-blue-400 font-medium mb-2">
                        Partner 1 ({formatEuro(currentResult.earner1Income)})
                      </div>
                      <BreakdownRow label="Pension contribution" value={-currentResult.taxes.pensionContribution} negative />
                      <BreakdownRow label="Income tax" value={-(currentResult.taxes.nationalTax + currentResult.taxes.municipalTax)} negative />
                      <BreakdownRow label="Net income" value={currentResult.taxes.netMonthlyIncome} highlight />
                    </div>
                    <div className="border-t border-gray-800 pt-2 mt-2">
                      <div className="text-xs text-purple-400 font-medium mb-2">
                        Partner 2 ({formatEuro(currentResult.earner2Income)})
                      </div>
                      <BreakdownRow label="Pension contribution" value={-currentResult.taxes2.pensionContribution} negative />
                      <BreakdownRow label="Income tax" value={-(currentResult.taxes2.nationalTax + currentResult.taxes2.municipalTax)} negative />
                      <BreakdownRow label="Net income" value={currentResult.taxes2.netMonthlyIncome} highlight />
                    </div>
                    <div className="border-t border-gray-800 pt-2 mt-2">
                      <BreakdownRow 
                        label="Combined Net after tax" 
                        value={currentResult.netIncomeAfterTax} 
                        highlight
                      />
                    </div>
                    {currentResult.taxSavingsFromSplit > 0 && (
                      <div className="text-xs text-green-400 mt-2 p-2 bg-green-500/10 rounded">
                        💰 Tax savings from income split: {formatEuro(currentResult.taxSavingsFromSplit)}/mo
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="border-t border-gray-800 pt-2 mt-2">
                      <BreakdownRow label="Pension contribution" value={-currentResult.taxes.pensionContribution} negative />
                      <BreakdownRow label="Unemployment insurance" value={-currentResult.taxes.unemploymentInsurance} negative />
                      <BreakdownRow label="Health insurance" value={-currentResult.taxes.healthInsurance} negative />
                      <BreakdownRow label="National tax" value={-currentResult.taxes.nationalTax} negative />
                      <BreakdownRow label="Municipal tax" value={-currentResult.taxes.municipalTax} negative />
                    </div>
                    <div className="border-t border-gray-800 pt-2 mt-2">
                      <BreakdownRow 
                        label="Net after tax" 
                        value={currentResult.netIncomeAfterTax} 
                        highlight
                      />
                    </div>
                  </>
                )}
                <div className="text-xs text-gray-500 mt-2">
                  Effective tax rate: {(currentResult.effectiveTaxRate * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Benefits breakdown */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-green-400 mb-4 flex items-center gap-2">
                <span>🎁</span> Benefits Received
              </h3>
              <div className="space-y-3 text-sm">
                <BreakdownRow label="Housing allowance" value={currentResult.benefits.housingAllowance} positive />
                <BreakdownRow label="Social assistance" value={currentResult.benefits.socialAssistance} positive />
                <BreakdownRow label="Unemployment benefit" value={currentResult.benefits.unemploymentBenefit} positive />
                <BreakdownRow label="Child benefit" value={currentResult.benefits.childBenefit} positive />
                <BreakdownRow label="Student aid" value={currentResult.benefits.studentAid} positive />
                <div className="border-t border-gray-800 pt-2 mt-2">
                  <BreakdownRow 
                    label="Total benefits" 
                    value={currentResult.totalBenefits} 
                    highlight
                    positive
                  />
                </div>
                
                {/* Daycare costs section - only if applicable */}
                {currentResult.daycareCost > 0 && (
                  <>
                    <div className="border-t border-gray-800 pt-2 mt-2">
                      <h4 className="text-amber-400 font-medium mb-2 flex items-center gap-2">
                        <span>🏫</span> Daycare Costs
                      </h4>
                      <BreakdownRow label="Daycare fee" value={-currentResult.daycareCost} negative />
                      <div className="text-xs text-gray-500 mt-1">
                        Threshold: {formatEuro(currentResult.benefits.daycareIncomeThreshold)}/mo
                      </div>
                    </div>
                    <div className="border-t border-gray-800 pt-2 mt-2">
                      <BreakdownRow 
                        label="Net benefits" 
                        value={currentResult.netBenefits}
                        highlight
                        positive={currentResult.netBenefits >= 0}
                        negative={currentResult.netBenefits < 0}
                      />
                    </div>
                  </>
                )}
                
                <div className="text-xs text-gray-500 mt-2 space-y-1">
                  <div>Benefits lost per €1 gross: €{currentResult.benefitClawbackRate.toFixed(2)}</div>
                  {currentResult.daycareClawbackRate > 0 && (
                    <div className="text-amber-400">
                      Daycare increase per €1 gross: €{currentResult.daycareClawbackRate.toFixed(2)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Methodology */}
        <section className="mt-12 pt-12 border-t border-gray-800">
          <h2 className="text-2xl font-bold mb-6">Understanding the Trap</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-lg font-semibold text-amber-400 mb-3">What is EMTR?</h3>
              <p className="text-gray-400 text-sm mb-4">
                <strong>Effective Marginal Tax Rate (EMTR)</strong> measures how much of each additional 
                euro you earn is lost to taxes and benefit reductions. When EMTR is 80%, you keep only €0.20 
                from each extra euro earned.
              </p>
              <p className="text-gray-400 text-sm">
                The "trap" occurs when benefits phase out at the same time taxes kick in, creating a 
                zone where working more hours barely increases take-home pay.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-amber-400 mb-3">Why Does This Happen?</h3>
              <ul className="text-gray-400 text-sm space-y-2">
                <li className="flex gap-2">
                  <span className="text-red-400">•</span>
                  <span>Housing allowance reduces by <strong>42%</strong> of excess income</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400">•</span>
                  <span>Social assistance reduces <strong>1:1</strong> with income</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400">•</span>
                  <span>Unemployment benefits reduce by <strong>50%</strong> of income over €300</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400">•</span>
                  <span>Daycare fees <strong>increase by 10.7%</strong> of income above threshold</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-red-400">•</span>
                  <span>Income taxes add another <strong>~30%</strong> marginal rate</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-8 p-4 bg-gray-900/50 rounded-lg border border-gray-800">
            <h4 className="text-sm font-semibold text-gray-300 mb-2">Data Sources & Methodology</h4>
            <p className="text-sm text-gray-500">
              Tax rates from Finnish Tax Administration (Vero.fi), benefit rules from Kela (Social Insurance Institution),
              daycare fees from Ministry of Education and Culture (OKM).
              All calculations use 2024 rules. This is a simplified model for illustration - actual benefits depend on 
              individual circumstances and asset tests not modeled here.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

// Helper components
function BreakdownRow({ 
  label, 
  value, 
  highlight = false, 
  positive = false,
  negative = false,
}: { 
  label: string; 
  value: number; 
  highlight?: boolean;
  positive?: boolean;
  negative?: boolean;
}) {
  const formatEuro = (amount: number) => {
    const abs = Math.abs(amount);
    const formatted = new Intl.NumberFormat('fi-FI', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(abs);
    
    if (negative || amount < 0) return `-${formatted}`;
    if (positive && amount > 0) return `+${formatted}`;
    return formatted;
  };

  const colorClass = positive ? 'text-green-400' : negative ? 'text-red-400' : 'text-white';

  return (
    <div className={`flex justify-between ${highlight ? 'font-semibold' : ''}`}>
      <span className="text-gray-400">{label}</span>
      <span className={`font-mono ${highlight ? colorClass : ''}`}>
        {formatEuro(value)}
      </span>
    </div>
  );
}

function ShareButton({ result, valley }: { result: WageCalculationResult; valley: { start: number; end: number; peakEMTR: number } }) {
  const shareText = `🇫🇮 Finland's Wage Trap Calculator:

At €${result.grossMonthlyIncome}/month gross:
💰 Net disposable: €${result.netDisposableIncome.toFixed(0)}/mo
📉 Marginal rate: ${(result.effectiveMarginalTaxRate * 100).toFixed(0)}%
💸 Keep per €1: €${result.keepPerEuro.toFixed(2)}

Valley of Death: €${valley.start}-€${valley.end}/month
Peak EMTR: ${(valley.peakEMTR * 100).toFixed(0)}%

Is work worth it? →`;

  const handleShare = () => {
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(shareText);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium transition-colors"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
      Share
    </button>
  );
}

