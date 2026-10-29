import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../services/supabase.js';
import { portfolioMetrics } from '../utils/portfolioMetrics.js';
import {usePositionQuotes} from './usePositionQuotes.js';
import {quoteInUsd} from '../utils/portfolioCurrency.js';

export function usePortfolio(user, allAssets = [], portfolioId = null, rates = null) {
  const [stored, setStored] = useState({owner:null,scope:null,positions:[]});
  const current=useRef(null);current.current=`${user?.id??''}:${portfolioId??''}`;
  const positions=stored.owner===user?.id&&stored.scope===portfolioId?stored.positions:[];
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  // Mapa rápido id → asset con precio actual
  const priceMap = Object.fromEntries(allAssets.map(a => [`${a.type}:${a.id}`, a]));

  const load = useCallback(async () => {
    const owner=user?.id,scope=portfolioId,key=`${owner??''}:${scope??''}`;
    if (!owner||!scope) { setStored({owner,scope,positions:[]});setLoading(false);return; }
    setLoading(true);setError(null);
    try{
      let query=supabase.from('portfolio').select('*').eq('user_id',owner).order('created_at',{ascending:false});
      query=scope==='__unassigned__'?query.is('portfolio_id',null):query.eq('portfolio_id',scope);
      const {data,error:err}=await query;if(current.current!==key)return;
      if(err)throw err;setStored({owner,scope,positions:data??[]});
    }catch(err){if(current.current===key){setStored({owner,scope,positions:[]});setError(err.message||String(err));}}
    finally{if(current.current===key)setLoading(false);}
  }, [user?.id,portfolioId]);

  useEffect(() => { load(); }, [load]);

  const heldQuotes=usePositionQuotes(positions);

  // Enriquecer posiciones con precios actuales y P&L
  const enriched = positions.map(pos => {
    const asset = heldQuotes[`${pos.asset_type}:${pos.asset_id}`]??priceMap[`${pos.asset_type}:${pos.asset_id}`];
    const currentPrice = quoteInUsd(asset,rates);
    const currentValue = currentPrice != null ? pos.quantity * currentPrice : null;
    const costBasis    = pos.quantity * pos.entry_price;
    const pnlUsd       = currentValue != null ? currentValue - costBasis : null;
    const pnlPct       = costBasis > 0 && pnlUsd != null ? (pnlUsd / costBasis) * 100 : null;
    const change24h    = asset?.change24h ?? null;
    return { ...pos, quoteCurrency:asset?.currency??null, fxConverted:!!asset?.currency&&asset.currency!=='USD', currentPrice, currentValue, costBasis, pnlUsd, pnlPct, change24h };
  });

  const real  = enriched.filter(p => !p.is_simulation);
  const paper = enriched.filter(p =>  p.is_simulation);

  const {totalValue,totalCost,totalPnl,totalPnlPct}=portfolioMetrics(enriched);

  async function addPosition({ assetId, assetName, assetType, quantity, entryPrice, isPaper, notes, tags, targetPrice, purchaseDate }) {
    if(!user?.id||!portfolioId)throw new Error('Espera a que se cargue la cartera');
    if(!Number.isFinite(Number(quantity))||Number(quantity)<=0||!Number.isFinite(Number(entryPrice))||Number(entryPrice)<=0)throw new Error('Cantidad o precio inválido');
    const { error: err } = await supabase.from('portfolio').insert({
      user_id:       user.id,
      portfolio_id:  portfolioId==='__unassigned__'?null:portfolioId,
      asset_id:      assetId,
      asset_name:    assetName,
      asset_type:    assetType,
      quantity:      parseFloat(quantity),
      entry_price:   parseFloat(entryPrice),
      is_simulation: isPaper,
      notes:         notes || null,
      tags:          tags?.length ? tags : [],
      target_price:  targetPrice ? parseFloat(targetPrice) : null,
      ...(purchaseDate ? { created_at: new Date(`${purchaseDate}T12:00:00`).toISOString() } : {}),
    });
    if (err) throw err;
    await load();
  }

  async function removePosition(id) {
    if(!user?.id||!positions.some(p=>p.id===id))throw new Error('Posición no disponible');
    const { error: err } = await supabase.from('portfolio').delete().eq('id', id).eq('user_id',user.id);
    if (err) throw err;
    await load();
  }

  return {
    positions: enriched,
    real,
    paper,
    loading,
    error,
    addPosition,
    removePosition,
    refresh: load,
    totalValue,
    totalCost,
    totalPnl,
    totalPnlPct,
  };
}
