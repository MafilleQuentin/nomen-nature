// Courbes de niveau de la carte (lot 6, QUE-31) : calculées chaque mois par l'import
// (tools/carte/courbes.ts) et rangées dans le paquet de données (/donnees/carte/courbes.json).
// Lues par le serveur (binding ASSETS) et gardées en mémoire tant que le Worker tourne.
import { lireFichierDuSite } from "../especes/serveur.ts";
import type { CodeContinent } from "./continents.ts";

export interface Courbe {
  /** Courbe maîtresse (une sur quatre), plus visible. */
  maitresse: boolean;
  /** Chemin SVG compact en dixièmes d'unité du plan (à dessiner à l'échelle 0,1). */
  chemin: string;
}

export interface Courbes {
  /** Nombre d'espèces de chaque niveau, de la courbe la plus basse à la plus haute. */
  niveaux: number[];
  monde: Courbe[];
  continents: Record<CodeContinent, Courbe[]>;
}

let lecture: Promise<Courbes | undefined> | undefined;

/** Courbes du mois, ou undefined si le paquet n'en a pas (la carte reste lisible sans). */
export function lireCourbes(origine: URL): Promise<Courbes | undefined> {
  lecture ??= lireFichierDuSite("/donnees/carte/courbes.json", origine)
    .then((r) => (r.ok ? (r.json() as Promise<Courbes>) : undefined))
    .then((courbes) => {
      if (!courbes) lecture = undefined; // réessayer à la prochaine page
      return courbes;
    })
    .catch(() => {
      lecture = undefined;
      return undefined;
    });
  return lecture;
}
