const pages = new Set(['dashboard','panorama','markets','portfolio','alerts','fundamentals','chart-ai']);
export const PANORAMA_TABS = ['summary','chart','valuation','news'];
export function canonicalPage(value='') {
  const page=String(value).replace(/^#/,'');
  return page==='screener'?'panorama':pages.has(page)?page:'dashboard';
}
