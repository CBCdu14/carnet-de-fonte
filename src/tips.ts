/* Repères de technique par exercice (sans IA, disponibles hors ligne). Associés par mots-clés du nom. */
export interface Tip {
  cues: string[];
  errors: string[];
}

const T: [RegExp, Tip][] = [
  [/leg ?press|presse/i, {
    cues: ['Bas du dos et bassin collés au dossier du début à la fin.', 'Pieds largeur de hanches, genoux dans l\'axe des pieds.', 'Descendre tant que le bassin ne décolle pas, pousser par les talons sans verrouiller les genoux.'],
    errors: ['Descendre trop bas : le bassin s\'enroule et le bas du dos décolle.', 'Genoux qui rentrent vers l\'intérieur en poussant.'],
  }],
  [/couch|bench/i, {
    cues: ['Omoplates serrées et basses, petite cambrure naturelle, pieds ancrés au sol.', 'Descendre la barre (ou les haltères) vers le bas des pectoraux, coudes à 45° environ du buste.', 'Pousser en gardant les fesses sur le banc.'],
    errors: ['Coudes à 90° (écartés) : stress sur les épaules.', 'Rebondir sur la poitrine.'],
  }],
  [/inclin/i, {
    cues: ['Banc à 30° environ : au-delà, ce sont surtout les épaules qui travaillent.', 'Omoplates serrées, trajectoire vers le haut des pectoraux.', 'Contrôler la descente sur 2 secondes.'],
    errors: ['Banc trop incliné.', 'Décoller les fesses du banc pour pousser.'],
  }],
  [/tirage horizontal|rowing|poulie horizontal/i, {
    cues: ['Buste droit, dos neutre, poitrine sortie.', 'Tirer avec les coudes vers l\'arrière en serrant les omoplates en fin de mouvement.', 'Revenir lentement en laissant les omoplates s\'écarter, sans arrondir le dos.'],
    errors: ['Se balancer d\'avant en arrière pour tirer plus lourd.', 'Arrondir le bas du dos au retour.'],
  }],
  [/tirage vertical|traction/i, {
    cues: ['Poitrine haute, légère inclinaison arrière.', 'Commencer par abaisser les épaules, puis tirer les coudes vers les hanches.', 'Barre vers le haut de la poitrine, jamais derrière la nuque.'],
    errors: ['Tirer avec les bras seulement (épaules qui remontent vers les oreilles).', 'Se jeter en arrière pour finir le mouvement.'],
  }],
  [/l[ée]vation|lateral/i, {
    cues: ['Légère flexion des coudes, monter jusqu\'à l\'horizontale (pas plus haut).', 'Mener avec les coudes, petits doigts légèrement plus hauts que les pouces.', 'Descente lente, 2-3 secondes.'],
    errors: ['Hausser les épaules (les trapèzes prennent le relais).', 'Lancer les haltères avec le buste.'],
  }],
  [/face ?pull/i, {
    cues: ['Poulie à hauteur des yeux, corde tirée vers le visage.', 'Écarter les mains en fin de mouvement, coudes hauts.', 'Marquer 1 seconde de contraction arrière d\'épaules.'],
    errors: ['Charge trop lourde : le dos se cambre et on tire avec les bras.', 'Coudes qui descendent sous les épaules.'],
  }],
  [/leg ?curl/i, {
    cues: ['Genoux alignés avec l\'axe de la machine.', 'Bassin plaqué, ne pas le soulever en fin de mouvement.', 'Descente contrôlée, presque jusqu\'à l\'extension complète.'],
    errors: ['Donner un coup de bassin pour remonter la charge.', 'Amplitude partielle.'],
  }],
  [/fessier|glute|hip thrust/i, {
    cues: ['Gainer le ventre, bassin stable, le mouvement vient de la hanche.', 'Serrer le fessier en fin de mouvement, 1 seconde.', 'Ne pas chercher à monter la jambe plus haut que l\'alignement du dos.'],
    errors: ['Cambrer le bas du dos pour monter plus haut.', 'Aller trop vite, sans contrôle au retour.'],
  }],
  [/triceps|extension/i, {
    cues: ['Coudes fixes le long du corps, seuls les avant-bras bougent.', 'Extension complète en bas, contraction 1 seconde.', 'Remonter jusqu\'à 90° environ, sans laisser les coudes avancer.'],
    errors: ['Pencher le buste pour pousser avec le poids du corps.', 'Coudes qui s\'écartent.'],
  }],
  [/curl/i, {
    cues: ['Coudes collés au buste, poignets droits.', 'Monter sans balancer, descendre sur 2-3 secondes.', 'Extension complète en bas sans relâcher la tension.'],
    errors: ['Balancer le buste.', 'Coudes qui avancent en fin de montée.'],
  }],
  [/crunch|abdo/i, {
    cues: ['Enrouler la colonne : rapprocher les côtes du bassin.', 'Les hanches ne bougent pas, ce n\'est pas une flexion de hanche.', 'Expirer en descendant, contrôler la remontée.'],
    errors: ['Tirer avec les bras.', 'S\'asseoir sur les talons pour descendre.'],
  }],
  [/squat/i, {
    cues: ['Pieds largeur d\'épaules, genoux dans l\'axe des pieds.', 'Gainage fort, dos neutre, descendre au moins cuisses parallèles si la mobilité le permet.', 'Pousser le sol, hanches et épaules montent ensemble.'],
    errors: ['Genoux qui rentrent.', 'Talons qui décollent.'],
  }],
  [/militaire|d[ée]velopp[ée] [ée]paule|overhead/i, {
    cues: ['Fessiers et abdos serrés pour ne pas cambrer.', 'Barre au-dessus du milieu du pied, tête qui passe « dans la fenêtre » en fin de poussée.', 'Avant-bras verticaux.'],
    errors: ['Cambrer le bas du dos.', 'Pousser la barre devant soi.'],
  }],
  [/soulev[ée]|roumain|deadlift/i, {
    cues: ['Charnière de hanche : les fesses reculent, dos neutre.', 'Barre au contact des cuisses tout le long.', 'Descendre jusqu\'à l\'étirement des ischios, pas plus.'],
    errors: ['Arrondir le dos.', 'Plier les genoux comme un squat.'],
  }],
  [/mollet/i, {
    cues: ['Amplitude complète : talon bien bas, puis sur la pointe.', '1 seconde de pause en haut.', 'Genoux légèrement fléchis mais fixes.'],
    errors: ['Rebondir en bas.', 'Amplitude partielle.'],
  }],
];

export function tipFor(name: string): Tip | undefined {
  return T.find(([re]) => re.test(name))?.[1];
}

export const ZONES = ['Bas du dos', 'Haut du dos', 'Largeur du dos', 'Arrière d\'épaules', 'Fessiers', 'Ischios', 'Quadriceps', 'Haut des pectoraux', 'Bras', 'Abdos et gainage'];
