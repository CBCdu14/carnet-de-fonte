export async function exportBackup(filename: string, json: string): Promise<string | null> {
  const file = new File([json], filename, { type: 'application/json' });
  const nav = navigator as any;
  // iPhone / Android : feuille de partage (Fichiers, Drive, mail…)
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: 'Sauvegarde Carnet de Fonte' });
      return null;
    } catch (e: any) {
      if (e?.name === 'AbortError') return null;
    }
  }
  // Ordinateur : téléchargement
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return null;
}

export function pickBackup(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json,text/plain';
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      f.text().then(resolve, reject);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
