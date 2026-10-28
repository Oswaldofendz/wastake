import {useTranslation} from 'react-i18next';
import {researchQuality} from '../utils/researchQuality.js';
export function ResearchCoverage({data,type}){
 const {t}=useTranslation(),quality=researchQuality(data,type);
 return <details className="my-3 rounded-lg border border-slate-700 p-3 text-xs leading-6"><summary className="cursor-pointer font-semibold text-sky-200">{t('research_coverage',{count:quality.available,total:quality.total})} · {t(quality.complete?'research_complete':'research_partial')}</summary><ul className="mt-2 grid gap-x-4 sm:grid-cols-2">{Object.entries(quality.checks).map(([key,ok])=><li key={key} className={ok?'text-emerald-300':'text-amber-200'}>{ok?'✓':'◐'} {t('research_'+key)} · {t(ok?'research_present':'research_missing')}</li>)}</ul><p className="mt-2 text-slate-400">{t('research_limit')}</p></details>;
}
