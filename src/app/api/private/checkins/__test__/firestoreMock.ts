type DocData = Record<string, unknown>;

export type FirestoreSeed = Record<string, Record<string, DocData>>;

export type DocRef = { collection: string; id: string };

function refKey(ref: DocRef): string {
  return `${ref.collection}/${ref.id}`;
}

export function createFirestoreMock(seed: FirestoreSeed) {
  const store: FirestoreSeed = structuredClone(seed);

  const txGet = jest.fn(async (ref: DocRef) => {
    const data = store[ref.collection]?.[ref.id];
    if (data === undefined) {
      return { exists: false, data: () => undefined };
    }
    return { exists: true, data: () => store[ref.collection]![ref.id]! };
  });

  const txSet = jest.fn((ref: DocRef, data: DocData) => {
    store[ref.collection] ??= {};
    const prev = store[ref.collection]![ref.id] ?? {};
    store[ref.collection]![ref.id] = { ...prev, ...data };
  });

  const txDelete = jest.fn((ref: DocRef) => {
    if (store[ref.collection]) {
      delete store[ref.collection]![ref.id];
    }
  });

  const tx = {
    get: txGet,
    set: txSet,
    delete: txDelete,
  };

  const db = {
    collection: (name: string) => ({
      doc: (id: string): DocRef => ({ collection: name, id }),
    }),
    runTransaction: jest.fn(async (callback: (t: typeof tx) => Promise<void>) => {
      await callback(tx);
    }),
  };

  return {
    db,
    store,
    txGet,
    txSet,
    txDelete,
    doc: (collection: string, id: string): DocRef => ({ collection, id }),
    getDoc: (collection: string, id: string) => store[collection]?.[id],
  };
}
