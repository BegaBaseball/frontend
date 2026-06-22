import assert from 'node:assert/strict';
import test from 'node:test';
import { createJSONStorage } from 'zustand/middleware';

const createStorage = () => {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
    clear: () => {
      values.clear();
    },
  };
};

const installGlobalLocalStorage = (storage: ReturnType<typeof createStorage>) => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: storage,
  });
};

const initialStorage = createStorage();
installGlobalLocalStorage(initialStorage);

const { useMateRecentSearchStore } = await import('./mateRecentSearchStore');

const installPersistStorage = (storage: ReturnType<typeof createStorage>) => {
  useMateRecentSearchStore.persist.setOptions({
    storage: createJSONStorage(() => storage),
  });
};

installPersistStorage(initialStorage);

test.afterEach(() => {
  const storage = createStorage();
  useMateRecentSearchStore.setState({ recentSearches: [] });
  useMateRecentSearchStore.persist.clearStorage();
  installGlobalLocalStorage(storage);
  installPersistStorage(storage);
});

test('mate recent search store normalizes terms and ignores invalid entries', () => {
  const { addRecentSearch } = useMateRecentSearchStore.getState();

  addRecentSearch('  KIA\u0000  응원석  ');
  addRecentSearch('a');
  addRecentSearch('x'.repeat(51));
  addRecentSearch('   ');

  assert.deepEqual(useMateRecentSearchStore.getState().recentSearches, ['KIA 응원석']);
});

test('mate recent search store de-dupes case-insensitively and promotes latest display text', () => {
  const { addRecentSearch } = useMateRecentSearchStore.getState();

  addRecentSearch('KIA 응원석');
  addRecentSearch('잠실 블루존');
  addRecentSearch('kia 응원석');

  assert.deepEqual(useMateRecentSearchStore.getState().recentSearches, [
    'kia 응원석',
    '잠실 블루존',
  ]);
});

test('mate recent search store keeps only the six most recent terms', () => {
  const { addRecentSearch } = useMateRecentSearchStore.getState();

  Array.from({ length: 7 }, (_, index) => `term ${index}`).forEach(addRecentSearch);

  assert.deepEqual(useMateRecentSearchStore.getState().recentSearches, [
    'term 6',
    'term 5',
    'term 4',
    'term 3',
    'term 2',
    'term 1',
  ]);
});

test('mate recent search store removes terms by key and clears the list', () => {
  const { addRecentSearch, clearRecentSearches, removeRecentSearch } = useMateRecentSearchStore.getState();

  addRecentSearch('KIA 응원석');
  addRecentSearch('잠실 블루존');
  removeRecentSearch('kia 응원석');

  assert.deepEqual(useMateRecentSearchStore.getState().recentSearches, ['잠실 블루존']);

  clearRecentSearches();

  assert.deepEqual(useMateRecentSearchStore.getState().recentSearches, []);
});
