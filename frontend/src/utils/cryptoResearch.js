// An older API can answer 200 with "unsupported" during a rolling deployment.
// Treat that as unavailable rather than rendering a broken or empty profile.
export const isCryptoResearch=data=>!!data&&typeof data.id==='string'&&typeof data.name==='string'&&typeof data.source==='string'&&!!data.changes&&typeof data.changes==='object'&&!Array.isArray(data.changes);
