// Données de la carte d'un continent (src/data/carte/continents/<code>.json, écrites par
// tools/carte/pays.ts), partagées par le composant de la carte et le panneau des espèces.
import type { CodeContinent } from "./continents.ts";

export interface PaysCarte {
  code: string;
  /** Le pays appartient au continent (sinon : voisin, dessiné en sombre). */
  membre: boolean;
  chemin: string;
  etiquette: [number, number];
  rang: number;
  /** Boîte de tout le pays dans la vue : [x, y, largeur, hauteur] dans le plan (lot 7). */
  cadre?: [number, number, number, number];
  /** Boîte de son plus grand morceau sur ce continent (cadre de la carte de situation, lot 7). */
  principal?: [number, number, number, number];
}

export interface CarteDuContinent {
  vue: [number, number, number, number];
  pays: PaysCarte[];
}

const cartes = import.meta.glob<{ default: CarteDuContinent }>("../../data/carte/continents/*.json", { eager: true });

export function carteDuContinent(code: CodeContinent): CarteDuContinent {
  const carte = cartes[`../../data/carte/continents/${code.toLowerCase()}.json`]?.default;
  if (!carte) throw new Error(`Carte du continent ${code} absente (node tools/carte/pays.ts)`);
  return carte;
}

/** Codes ISO (en minuscules) des pays du continent. */
export function paysDuContinent(code: CodeContinent): string[] {
  return [
    ...new Set(
      carteDuContinent(code)
        .pays.filter((p) => p.membre && p.code)
        .map((p) => p.code.toLowerCase()),
    ),
  ];
}
