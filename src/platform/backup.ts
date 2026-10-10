import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';

/** Partage le fichier de sauvegarde (Fichiers, Drive, mail…). Renvoie un message d'erreur ou null. */
export async function exportBackup(filename: string, json: string): Promise<string | null> {
  const f = new File(Paths.cache, filename);
  if (f.exists) f.delete();
  f.create();
  f.write(json);
  if (!(await Sharing.isAvailableAsync())) return "Le partage n'est pas disponible sur cet appareil.";
  await Sharing.shareAsync(f.uri, { mimeType: 'application/json', dialogTitle: 'Sauvegarder mon carnet', UTI: 'public.json' });
  return null;
}

/** Ouvre le sélecteur de fichiers et renvoie le texte du fichier choisi (null si annulé). */
export async function pickBackup(): Promise<string | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: ['application/json', 'text/plain', '*/*'], copyToCacheDirectory: true });
  if (r.canceled) return null;
  return new File(r.assets[0].uri).text();
}
