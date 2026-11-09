export const runnerWidth = 540;
export const runnerX = 78;
const levelLength = 300;
const paceFactor = {calm:.8,normal:1,fast:1.28};

export function newRun(mode = 'levels', pace = 'normal') {
  return {mode,pace,meters:0,height:0,velocity:0,jumps:0,coins:0,catches:0,duck:false,items:[],next:105,sequence:0,result:null};
}

export function jumpBull(run) {
  if (run.result || run.jumps >= 2) return run;
  return {...run,velocity:run.jumps ? 265 : 340,jumps:run.jumps+1,duck:false};
}

export function advanceBull(run, dt) {
  if (run.result || dt <= 0) return run;
  const level = Math.floor(run.meters / levelLength);
  const speed = (168 + Math.min(level,7)*18) * paceFactor[run.pace];
  const distance = speed * dt;
  const meters = run.meters + distance / 10;
  const velocity = run.velocity - 920*dt;
  const height = Math.max(0,run.height + velocity*dt);
  let {next,sequence,coins,catches} = run;
  let items = run.items.map(item => ({...item,x:item.x-distance}));
  next -= distance;
  if (next <= 0) {
    const kind = ['barrier','coin','beam','bird','barrier','coin','beam'][sequence % 7];
    items.push({x:runnerWidth+12,kind,id:sequence++});
    next += Math.max(96,speed*(kind==='barrier' || kind==='beam' ? .97 : .84));
  }

  const bottom = height, top = height + (run.duck && !height ? 22 : 42);
  let result = null;
  items = items.filter(({x,kind}) => {
    if (x < -32) return false;
    if (Math.abs(x-runnerX) > 21) return true;
    if ((kind==='barrier' && bottom<26) || (kind==='beam' && top>32 && bottom<55)) result='over';
    if (kind==='coin' && bottom<=36 && top>=18) {coins++;return false;}
    if (kind==='bird' && bottom<=116 && top>=84) {catches++;return false;}
    return true;
  });
  if (run.mode==='levels' && meters >= levelLength*3 && !result) result='won';
  return {...run,meters,height,velocity:height ? velocity : 0,jumps:height ? run.jumps : 0,coins,catches,items,next,sequence,result};
}
