import { kv } from './storage';

/* Sur le web il n'y a pas de trousseau : la clé reste dans le stockage de l'appli, sur ce téléphone uniquement. */
export const secret = {
  get: (k: string) => kv.get('secret.' + k),
  set: (k: string, v: string) => kv.set('secret.' + k, v),
  remove: (k: string) => kv.remove('secret.' + k),
};
