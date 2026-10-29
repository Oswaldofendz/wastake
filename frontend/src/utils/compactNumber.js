// Use the same explicit financial units in every locale: M=10^6, B=10^9, T=10^12.
// Intl's compact Spanish "B" means 10^12 and must not be mixed with financial B.
export function compactNumber(value,locale='es'){
 if(!Number.isFinite(value))return '—';
 const magnitude=Math.abs(value),[scale,unit]=magnitude>=1e12?[1e12,'T']:magnitude>=1e9?[1e9,'B']:magnitude>=1e6?[1e6,'M']:magnitude>=1e3?[1e3,'K']:[1,''];
 return (value/scale).toLocaleString(locale,{maximumFractionDigits:2})+(unit?' '+unit:'');
}
