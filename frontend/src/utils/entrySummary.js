import { companyRatios } from './companyValuation.js';

// Presentation heuristic, not a probability, fair value or trading instruction.
// Reuses the existing technical index rather than computing a second score.
export function entrySummary({analysis,loading=false,error=false,company,isStock=false,scenario,now=Date.now()}) {
  const score=analysis?.summary?.score10;
  if(loading&&!analysis)return 'pending';
  if(error||!Number.isFinite(score)||score<0||score>10)return 'unavailable';
  if(analysis.summary.coverage!==100)return 'incomplete';
  if(isStock){
    if(!company?.yearEnd||!company.company?.sector)return 'incomplete';
    const age=now-Date.parse(company.yearEnd);
    if(!Number.isFinite(age)||age<0||age>550*86400000)return 'incomplete';
    if(/financ|bank|insurance/i.test(company.company?.sector??''))return 'specialist';
    const fcf=companyRatios(company).fcf;
    const earnings=company.flows?.earnings?.value;
    if([company.flows?.earnings,company.flows?.operatingCashFlow,company.flows?.capex].some(f=>f?.date!==company.yearEnd))return 'incomplete';
    if(!Number.isFinite(earnings)||!Number.isFinite(fcf))return 'incomplete';
    if(earnings<=0||fcf<=0)return 'caution';
    if(scenario&&!scenario.error&&['above','no_equity'].includes(scenario.status))return 'valuationCaution';
  }
  return score<=4?'wait':score>=6?'favorable':'mixed';
}
