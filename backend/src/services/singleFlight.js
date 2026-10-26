// Share concurrent enrichment work instead of spending the free quota once per screen.
export function createSingleFlight() {
  const pending = new Map();
  return function run(key, task) {
    if (pending.has(key)) return pending.get(key);
    const request = Promise.resolve().then(task).finally(() => pending.delete(key));
    pending.set(key, request);
    return request;
  };
}
