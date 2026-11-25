// Étiquettes des pays sur la carte d'un continent (lot 6, QUE-29) : les pays du continent par
// ordre d'importance (rang de Natural Earth), sans chevauchement, à une taille fixe en pixels.
// Fonction pure, testée dans tests/unit/carte-interactive.test.ts.

export interface Candidate {
  code: string;
  nom: string;
  /** Position dans le plan de la carte. */
  point: [number, number];
  /** Rang d'affichage de Natural Earth : plus petit = plus important. */
  rang: number;
}

export interface Etiquette extends Candidate {
  /** Boîte occupée : [x, y, largeur, hauteur] dans le plan. */
  boite: [number, number, number, number];
}

/** Largeur d'un caractère de la police mono en capitales, en hauteurs de police (avec l'espacement). */
const CHASSE = 0.68;

/**
 * Étiquettes à afficher : par rang, puis par nom ; une étiquette qui en chevaucherait une autre
 * (ou sortirait de la vue) est sautée. `taille` est la hauteur du texte dans le plan.
 */
export function choisirEtiquettes(candidates: Candidate[], vue: [number, number, number, number], taille: number, maximum = 14): Etiquette[] {
  const [vx, vy, vl, vh] = vue;
  const gardees: Etiquette[] = [];
  const triees = [...candidates].sort((a, b) => a.rang - b.rang || a.nom.localeCompare(b.nom));
  for (const c of triees) {
    if (gardees.length >= maximum) break;
    const largeur = c.nom.length * taille * CHASSE;
    const boite: Etiquette["boite"] = [c.point[0] - largeur / 2, c.point[1] - taille / 2, largeur, taille];
    const dedans = boite[0] >= vx && boite[1] >= vy && boite[0] + boite[2] <= vx + vl && boite[1] + boite[3] <= vy + vh;
    const marge = taille * 0.4;
    const libre = gardees.every(
      ({ boite: [x, y, l, h] }) => boite[0] > x + l + marge || x > boite[0] + boite[2] + marge || boite[1] > y + h + marge || y > boite[1] + boite[3] + marge,
    );
    if (dedans && libre) gardees.push({ ...c, boite });
  }
  return gardees;
}
