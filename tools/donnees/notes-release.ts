// Texte de la release de données (« donnees-AAAA-MM »), à partir de sources.json :
// éditions, chiffres, citations et licences. Utilisé par le workflow « Données mensuelles ».
import { readFileSync } from "node:fs";

const s = JSON.parse(readFileSync("tools/donnees/data/paquet/sources.json", "utf8")) as {
  construction: string;
  catalogue_of_life: { edition: string; doi: string; citation: string; licence: string };
  gbif: { doi: string; licence: string; citation: string; lignes: number }[];
  wcvp?: { citation: string; licence: string };
  wikidata?: { citation: string; licence: string };
  wikidata_faits?: { citation: string; licence: string };
  chiffres: { especes_observees: number; index_fichiers: number; groupes?: Record<string, number>; fiches?: { fichiers: number; avec_faits: number } };
};
const nombre = (n: number) => n.toLocaleString("fr-CH");

console.log(`Paquet de données de Nomen Nature, construit le ${s.construction.slice(0, 10)} par l'import mensuel.

- **Espèces observées** : ${nombre(s.chiffres.especes_observees)}
- **Index de la recherche** : ${nombre(s.chiffres.index_fichiers)} fichiers
${s.chiffres.fiches ? `- **Fiches espèces** : ${nombre(s.chiffres.fiches.fichiers)} fichiers, ${nombre(s.chiffres.fiches.avec_faits)} espèces avec un fait « Sais-tu ? »\n` : ""}${s.chiffres.groupes ? `- **Groupes courants** : ${Object.entries(s.chiffres.groupes).filter(([g]) => !g.startsWith("plantes")).map(([g, n]) => `${g} ${nombre(n)}`).join(", ")}\n` : ""}
Installé dans le site par \`npm run donnees:installer\`, avant la construction.

## Sources

- ${s.catalogue_of_life.citation} — licence ${s.catalogue_of_life.licence}
${s.gbif.map((g) => `- ${g.citation} — licence ${g.licence.includes("by-nc") ? "CC BY-NC 4.0" : g.licence}`).join("\n")}
${s.wcvp ? `- ${s.wcvp.citation} — licence ${s.wcvp.licence}\n` : ""}${s.wikidata ? `- ${s.wikidata.citation} — ${s.wikidata.licence}\n` : ""}${s.wikidata_faits ? `- ${s.wikidata_faits.citation} — ${s.wikidata_faits.licence}\n` : ""}`);
