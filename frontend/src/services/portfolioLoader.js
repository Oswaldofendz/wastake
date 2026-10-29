// A failed read must not create an empty portfolio. Concurrent mounts share one
// first-login operation, so React StrictMode cannot create duplicate defaults.
export function createPortfolioLoader(client) {
  const pending=new Map();
  return userId=>{
    if(pending.has(userId))return pending.get(userId);
    const job=(async()=>{
      const result=await client.from('portfolios').select('*').eq('user_id',userId).order('created_at',{ascending:true});
      if(result.error)throw result.error;
      if(!Array.isArray(result.data))throw new Error('Portfolio list unavailable');
      // Older purchases may predate named portfolios. Keep them accessible in a
      // virtual view; never move, rewrite or silently drop the original rows.
      const legacy=await client.from('portfolio').select('id',{count:'exact',head:true}).eq('user_id',userId).is('portfolio_id',null);
      if(legacy.error)throw legacy.error;
      if(!Number.isInteger(legacy.count)||legacy.count<0)throw new Error('Legacy portfolio count unavailable');
      const rows=[...result.data];
      if(legacy.count>0)rows.push({id:'__unassigned__',name:'Sin asignar',virtual:true,user_id:userId});
      if(rows.length)return rows;
      const created=await client.from('portfolios').insert({user_id:userId,name:'Mi cartera',color:'#c0c0c0'}).select().single();
      if(created.error)throw created.error;
      if(!created.data)throw new Error('Portfolio creation unavailable');
      return [created.data];
    })().finally(()=>pending.delete(userId));
    pending.set(userId,job);return job;
  };
}
