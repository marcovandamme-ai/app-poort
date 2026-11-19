/** In-memory counter per user: enough to prove the gate passes the right identity. */
export const createCounter = () => {
  const counts = new Map<string, number>();
  return {
    get: (userId: string): number => counts.get(userId) ?? 0,
    increment: (userId: string): number => {
      const next = (counts.get(userId) ?? 0) + 1;
      counts.set(userId, next);
      return next;
    },
  };
};

export type Counter = ReturnType<typeof createCounter>;
