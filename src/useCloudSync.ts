import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useStore } from './store';
import { syncData, SyncError, toPayload } from './cloud';
import { getGhToken } from './garmin';

/** Synchro entre appareils via le dépôt GitHub privé.
 *  `auto` : au lancement, au retour dans l'appli et quelques secondes après chaque modification. */
export function useCloudSync(auto = false) {
  const store = useStore();
  const { data } = store;
  const repo = data.settings.garminRepo;
  const busy = useRef(false);
  const latest = useRef(store);
  latest.current = store;

  const run = useCallback(async (): Promise<string | null> => {
    if (!repo) return 'Renseigne le dépôt GitHub dans Réglages.';
    if (busy.current) return null;
    busy.current = true;
    const d = latest.current.data;
    const rev = d.meta.rev;
    try {
      const merged = await syncData(repo, await getGhToken(), toPayload(d), d.meta.pristine);
      latest.current.applySync(merged, rev);
      return null;
    } catch (e) {
      const msg = e instanceof SyncError ? e.message : 'Synchro impossible pour le moment.';
      latest.current.setSyncError(msg);
      return msg;
    } finally {
      busy.current = false;
    }
  }, [repo]);

  const runRef = useRef(run);
  runRef.current = run;
  useEffect(() => {
    if (!auto || !repo) return;
    runRef.current();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && runRef.current());
    return () => sub.remove();
  }, [auto, repo]);

  const pending = data.meta.rev !== data.meta.syncedRev;
  useEffect(() => {
    if (!auto || !repo || !pending) return;
    const t = setTimeout(() => runRef.current(), 4000);
    return () => clearTimeout(t);
  }, [auto, repo, pending, data.meta.rev]);

  return run;
}
