/** Natif : la prise de photo passe par la version web pour l'instant. */
export async function pickPhoto(): Promise<string | null> {
  throw new Error("La photo d'assiette est disponible dans la version web de l'appli.");
}
