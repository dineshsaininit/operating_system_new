/** Tiny pub/sub used to tell every mounted data hook to refetch after a mutation. */
type Fn = () => void;
const subs = new Set<Fn>();
export const bus = {
  subscribe(fn: Fn) { subs.add(fn); return () => { subs.delete(fn); }; },
  emit() { subs.forEach((f) => f()); },
};
