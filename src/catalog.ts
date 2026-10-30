import type { Equip } from './types';

/** Catalogue d'exercices par zone, pour proposer des idées quand on complète une séance. */
export interface CatalogEx {
  name: string;
  muscle: string;
  equip: Equip;
  step: number;
  /** Ce que l'exercice apporte, en une ligne */
  why: string;
}

export const CATALOG: { zone: string; exs: CatalogEx[] }[] = [
  {
    zone: 'Pectoraux',
    exs: [
      { name: 'Développé couché barre', muscle: 'Pectoraux', equip: 'barre', step: 2.5, why: 'La base pour la force des pecs.' },
      { name: 'Développé couché haltères', muscle: 'Pectoraux', equip: 'halteres', step: 2, why: 'Plus d\'amplitude, chaque côté travaille seul.' },
      { name: 'Développé incliné barre', muscle: 'Pectoraux', equip: 'barre', step: 2.5, why: 'Cible le haut des pecs.' },
      { name: 'Développé incliné haltères', muscle: 'Pectoraux', equip: 'halteres', step: 2, why: 'Haut des pecs, épaules ménagées.' },
      { name: 'Écartés poulie (crossover)', muscle: 'Pectoraux', equip: 'machine', step: 2.5, why: 'Isolation, tension continue.' },
      { name: 'Pec deck', muscle: 'Pectoraux', equip: 'machine', step: 5, why: 'Isolation simple, bonne contraction.' },
      { name: 'Dips', muscle: 'Pectoraux', equip: 'pdc', step: 2.5, why: 'Bas des pecs et triceps, au poids du corps.' },
      { name: 'Pompes', muscle: 'Pectoraux', equip: 'pdc', step: 0, why: 'Sans matériel, en fin de séance.' },
    ],
  },
  {
    zone: 'Dos',
    exs: [
      { name: 'Tirage vertical', muscle: 'Dos', equip: 'machine', step: 5, why: 'Largeur du dos (grands dorsaux).' },
      { name: 'Tractions', muscle: 'Dos', equip: 'pdc', step: 2.5, why: 'Le meilleur pour la largeur, au poids du corps.' },
      { name: 'Tirage horizontal poulie', muscle: 'Dos', equip: 'machine', step: 5, why: 'Épaisseur du dos, milieu du dos.' },
      { name: 'Rowing barre', muscle: 'Dos', equip: 'barre', step: 2.5, why: 'Épaisseur et force, demande un bon gainage.' },
      { name: 'Rowing haltère un bras', muscle: 'Dos', equip: 'halteres', step: 2, why: 'Un côté à la fois, bon pour corriger un déséquilibre.' },
      { name: 'Rowing machine (chest supported)', muscle: 'Dos', equip: 'machine', step: 5, why: 'Dos soutenu : zéro stress sur les lombaires.' },
      { name: 'Pull-over poulie haute', muscle: 'Dos', equip: 'machine', step: 2.5, why: 'Isolation des dorsaux, bras tendus.' },
      { name: 'Face pull', muscle: 'Dos', equip: 'machine', step: 2.5, why: 'Arrière d\'épaules et posture.' },
      { name: 'Extensions lombaires (banc 45°)', muscle: 'Dos', equip: 'pdc', step: 2.5, why: 'Bas du dos et fessiers, charge légère.' },
      { name: 'Soulevé de terre roumain', muscle: 'Dos', equip: 'barre', step: 2.5, why: 'Chaîne postérieure : ischios, fessiers, lombaires.' },
    ],
  },
  {
    zone: 'Épaules',
    exs: [
      { name: 'Développé militaire barre', muscle: 'Épaules', equip: 'barre', step: 2.5, why: 'Force d\'épaules, avant et côté.' },
      { name: 'Développé épaules haltères', muscle: 'Épaules', equip: 'halteres', step: 2, why: 'Plus naturel pour les articulations.' },
      { name: 'Élévations latérales', muscle: 'Épaules', equip: 'halteres', step: 1, why: 'Largeur d\'épaules (faisceau moyen).' },
      { name: 'Élévations latérales poulie', muscle: 'Épaules', equip: 'machine', step: 2.5, why: 'Tension continue, meilleure sensation.' },
      { name: 'Oiseau (élévations arrière)', muscle: 'Épaules', equip: 'halteres', step: 1, why: 'Arrière d\'épaules, souvent en retard.' },
      { name: 'Face pull', muscle: 'Épaules', equip: 'machine', step: 2.5, why: 'Arrière d\'épaules et coiffe des rotateurs.' },
      { name: 'Shrugs haltères', muscle: 'Épaules', equip: 'halteres', step: 2, why: 'Trapèzes supérieurs.' },
    ],
  },
  {
    zone: 'Bras',
    exs: [
      { name: 'Curl biceps barre', muscle: 'Biceps', equip: 'barre', step: 2.5, why: 'Le curl de base, charge facile à progresser.' },
      { name: 'Curl biceps haltères', muscle: 'Biceps', equip: 'halteres', step: 1, why: 'Supination complète, un bras à la fois possible.' },
      { name: 'Curl marteau', muscle: 'Biceps', equip: 'halteres', step: 1, why: 'Brachial et avant-bras : épaisseur du bras.' },
      { name: 'Curl incliné', muscle: 'Biceps', equip: 'halteres', step: 1, why: 'Étirement maximal du biceps.' },
      { name: 'Curl poulie basse', muscle: 'Biceps', equip: 'machine', step: 2.5, why: 'Tension continue, bon en finition.' },
      { name: 'Extension triceps poulie', muscle: 'Triceps', equip: 'machine', step: 2.5, why: 'Isolation simple des triceps.' },
      { name: 'Extension triceps corde', muscle: 'Triceps', equip: 'machine', step: 2.5, why: 'Écarter en bas : chef latéral.' },
      { name: 'Barre au front', muscle: 'Triceps', equip: 'barre', step: 2.5, why: 'Chef long, le plus gros des triceps.' },
      { name: 'Extension triceps haltère nuque', muscle: 'Triceps', equip: 'halteres', step: 2, why: 'Chef long, bras au-dessus de la tête.' },
      { name: 'Dips', muscle: 'Triceps', equip: 'pdc', step: 2.5, why: 'Triceps et pecs, au poids du corps.' },
    ],
  },
  {
    zone: 'Jambes',
    exs: [
      { name: 'Leg press', muscle: 'Jambes', equip: 'machine', step: 9, why: 'Quadriceps et fessiers, dos protégé.' },
      { name: 'Squat barre', muscle: 'Jambes', equip: 'barre', step: 2.5, why: 'Le roi des jambes, tout le bas du corps.' },
      { name: 'Squat goblet', muscle: 'Jambes', equip: 'halteres', step: 2, why: 'Facile à apprendre, bon gainage.' },
      { name: 'Hack squat', muscle: 'Jambes', equip: 'machine', step: 5, why: 'Quadriceps, trajectoire guidée.' },
      { name: 'Fentes marchées', muscle: 'Jambes', equip: 'halteres', step: 2, why: 'Une jambe à la fois, équilibre et fessiers.' },
      { name: 'Fentes bulgares', muscle: 'Jambes', equip: 'halteres', step: 2, why: 'Quadriceps et fessiers, très efficace.' },
      { name: 'Leg extension', muscle: 'Jambes', equip: 'machine', step: 5, why: 'Isolation des quadriceps.' },
      { name: 'Leg curl', muscle: 'Jambes', equip: 'machine', step: 5, why: 'Isolation des ischio-jambiers.' },
      { name: 'Soulevé de terre roumain', muscle: 'Jambes', equip: 'barre', step: 2.5, why: 'Ischios et fessiers en étirement.' },
      { name: 'Adducteurs machine', muscle: 'Jambes', equip: 'machine', step: 5, why: 'Intérieur des cuisses.' },
      { name: 'Mollets debout', muscle: 'Mollets', equip: 'machine', step: 5, why: 'Mollets (gastrocnémiens).' },
      { name: 'Mollets assis', muscle: 'Mollets', equip: 'machine', step: 5, why: 'Mollets (soléaire).' },
    ],
  },
  {
    zone: 'Fessiers',
    exs: [
      { name: 'Hip thrust', muscle: 'Fessiers', equip: 'barre', step: 5, why: 'Le plus efficace pour les fessiers.' },
      { name: 'Machine fessiers (kickback)', muscle: 'Fessiers', equip: 'machine', step: 2.5, why: 'Isolation, une jambe à la fois.' },
      { name: 'Abducteurs machine', muscle: 'Fessiers', equip: 'machine', step: 5, why: 'Fessier moyen, côté des hanches.' },
      { name: 'Fentes bulgares', muscle: 'Fessiers', equip: 'halteres', step: 2, why: 'Fessiers et quadriceps.' },
      { name: 'Soulevé de terre roumain', muscle: 'Fessiers', equip: 'barre', step: 2.5, why: 'Fessiers et ischios.' },
      { name: 'Extensions lombaires (banc 45°)', muscle: 'Fessiers', equip: 'pdc', step: 2.5, why: 'Fessiers et bas du dos, en finition.' },
    ],
  },
  {
    zone: 'Abdos',
    exs: [
      { name: 'Crunch poulie haute', muscle: 'Abdos', equip: 'machine', step: 2.5, why: 'Abdos avec charge, progression facile.' },
      { name: 'Relevés de jambes suspendu', muscle: 'Abdos', equip: 'pdc', step: 0, why: 'Bas des abdos, gainage.' },
      { name: 'Planche', muscle: 'Abdos', equip: 'pdc', step: 0, why: 'Gainage : compte en secondes.' },
      { name: 'Roulette abdos (ab wheel)', muscle: 'Abdos', equip: 'pdc', step: 0, why: 'Gainage complet, très exigeant.' },
      { name: 'Rotations poulie (obliques)', muscle: 'Abdos', equip: 'machine', step: 2.5, why: 'Obliques et rotation du tronc.' },
      { name: 'Crunch machine', muscle: 'Abdos', equip: 'machine', step: 5, why: 'Abdos guidés, charge réglable.' },
    ],
  },
];
