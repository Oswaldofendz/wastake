export function assetLabel(asset) {
  const name = String(asset?.name ?? '').trim();
  const symbol = String(asset?.symbol ?? '').trim();
  if (!symbol || name.toUpperCase().endsWith(`(${symbol.toUpperCase()})`)) return name;
  return `${name} (${symbol})`;
}
