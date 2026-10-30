// Display precision is not an exchange tick-size assertion. Keep six significant
// digits where practical so FX pips and micro-price indicators do not read zero.
export function quotePrecision(value,max=16) {
  return Number.isFinite(value)&&value!==0?Math.min(max,Math.max(2,5-Math.floor(Math.log10(Math.abs(value))))):2;
}
export function formatNumeric(value,locale='es') {
  if(!Number.isFinite(value))return '—';
  if(value!==0&&Math.abs(value)<1e-16)return new Intl.NumberFormat(locale,{notation:'scientific',maximumFractionDigits:5}).format(value);
  return new Intl.NumberFormat(locale,{maximumFractionDigits:quotePrecision(value)}).format(value);
}
