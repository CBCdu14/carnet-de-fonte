import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useStore } from './store';
import { fetchGarmin, GarminError, getGhToken } from './garmin';

const STALE_MS = 3 * 3600 * 1000;

/** Synchro des données Garmin depuis le dépôt privé. `auto` : au lancement et au retour dans l'appli si les données datent de plus de 3 h. */
export function useGarminSync(auto = false) {
  const { data, setGarmin } = useStore();
  const repo = data.settings.garminRepo;
  const fetchedAt = data.garmin?.fetchedAt ?? 0;
  const busy = useRef(false);

  const sync = useCallback(async (): Promise<string | null> => {
    if (!repo) return 'Renseigne le dépôt GitHub dans Réglages.';
    if (busy.current) return null;
    busy.current = true;
    try {
      const token = await getGhToken();
      if (!token) return 'Ajoute le jeton GitHub dans Réglages.';
      setGarmin(await fetchGarmin(repo, token));
      return null;
    } catch (e) {
      return e instanceof GarminError ? e.message : 'Synchro Garmin impossible pour le moment.';
    } finally {
      busy.current = false;
    }
  }, [repo, setGarmin]);

  const last = useRef(fetchedAt);
  last.current = fetchedAt;
  useEffect(() => {
    if (!auto || !repo) return;
    const maybe = () => {
      if (Date.now() - last.current > STALE_MS) sync();
    };
    maybe();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && maybe());
    return () => sub.remove();
  }, [auto, repo, sync]);

  return sync;
}
