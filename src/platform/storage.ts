import Storage from 'expo-sqlite/kv-store';

export const kv = {
  get: (k: string) => Storage.getItemAsync(k),
  set: (k: string, v: string) => Storage.setItemAsync(k, v),
  remove: async (k: string) => {
    await Storage.removeItemAsync(k);
  },
};
