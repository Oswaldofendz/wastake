export function AlbertoIcon({busy,className=''}) {
  return <svg viewBox="0 0 96 80" className={`alberto-bull ${className} ${busy?'is-thinking':''}`} aria-hidden="true">
    <ellipse cx="48" cy="72" rx="29" ry="4" fill="#32151d"/>
    <g className="bull-head">
      <path d="M24 32C7 33 6 13 11 7c-1 13 11 13 19 14m42 11c17 1 18-19 13-25 1 13-11 13-19 14" fill="#ffdda2" stroke="#ca9d60" strokeWidth="2"/>
      <path d="M26 29 13 25l4 15 13 3m40-14 13-4-4 15-13 3" fill="#993749"/>
      <path d="M25 26q23-20 46 0l-3 30q-20 23-40 0Z" fill="#84253b" stroke="#fa8291" strokeWidth="2"/>
      <path d="m35 16 7-7 4 8 8-9 5 12" fill="#ff9a9a"/>
      <path d="m32 36 10 3m12 0 10-3" stroke="#ffe1de" strokeWidth="3" strokeLinecap="round"/>
      <g className="bull-eyes" fill="#fff6c9">
        <ellipse cx="37" cy="42" rx="3" ry="4"/>
        <ellipse cx="59" cy="42" rx="3" ry="4"/>
      </g>
      <ellipse cx="48" cy="59" rx="19" ry="11" fill="#d8757b"/>
      <ellipse cx="39" cy="58" rx="3" ry="2" fill="#59212d"/>
      <ellipse cx="57" cy="58" rx="3" ry="2" fill="#59212d"/>
      <path d="M41 65q7 4 14 0" fill="none" stroke="#59212d" strokeWidth="2" strokeLinecap="round"/>
    </g>
  </svg>;
}
