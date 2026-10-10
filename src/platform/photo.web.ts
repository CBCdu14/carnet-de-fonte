/** Ouvre l'appareil photo (ou la galerie) et renvoie l'image réduite en JPEG (data URL), ou null si annulé. */
export function pickPhoto(): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.setAttribute('capture', 'environment');
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        // Réduite à 1024 px de côté : suffisant pour l'analyse, moins cher et plus rapide à envoyer
        const max = 1024;
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * k);
        canvas.height = Math.round(img.height * k);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Impossible de lire cette photo."));
      };
      img.src = url;
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
