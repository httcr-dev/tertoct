type DocData = Record<string, unknown>;

export type FeedbackFirestoreSeed = {
  users?: Record<string, DocData>;
  plans?: Record<string, DocData>;
  feedbacks?: Record<string, DocData>;
};

export function createFeedbackFirestoreMock(seed: FeedbackFirestoreSeed = {}) {
  const store: Required<FeedbackFirestoreSeed> = {
    users: { ...seed.users },
    plans: { ...seed.plans },
    feedbacks: { ...seed.feedbacks },
  };

  let nextFeedbackId = 1;

  const db = {
    collection: (name: keyof FeedbackFirestoreSeed) => ({
      doc: (id: string) => ({
        get: async () => {
          const data = store[name]?.[id];
          if (data === undefined) {
            return { exists: false, data: () => undefined };
          }
          return { exists: true, data: () => store[name]![id]! };
        },
        delete: async () => {
          delete store[name]![id];
        },
      }),
      add: async (data: DocData) => {
        const id = `fb_${nextFeedbackId++}`;
        store.feedbacks[id] = data;
        return { id };
      },
    }),
  };

  return { db, store };
}
