// Mesures du lot 3, avant de choisir l'architecture des données (QUE-18) :
// - espèces observées (GBIF) : nombre, règnes, répartition des observations, statuts UICN ;
// - couples espèce × pays : volume, taille estimée en D1 et en fichiers ;
// - correspondance GBIF Backbone → Catalogue of Life XR par le nom scientifique.
//
// Utilisation :
//   node tools/donnees/mesurer.ts <especes.zip> <especes-par-pays.zip> <taxa-col.tsv>
// Résultat : affiché et écrit dans tools/donnees/data/mesure.md
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";
import { createInterface } from "node:readline";
import { createReadStream } from "node:fs";

const [fichierEspeces, fichierPays, fichierCol] = process.argv.slice(2);
if (!fichierEspeces || !fichierPays || !fichierCol) {
  console.error("Utilisation : node tools/donnees/mesurer.ts <especes.zip> <especes-par-pays.zip> <taxa-col.tsv>");
  process.exit(1);
}

/** Lit un TSV (dans un zip ou non) ligne par ligne, en colonnes nommées d'après l'en-tête. */
async function* lignes(fichier: string): AsyncGenerator<Record<string, string>> {
  const flux = fichier.endsWith(".zip") ? spawn("unzip", ["-p", fichier]).stdout : createReadStream(fichier);
  let entete: string[] | undefined;
  for await (const ligne of createInterface({ input: flux, crlfDelay: Infinity })) {
    if (!ligne) continue;
    const champs = ligne.split("\t");
    if (!entete) {
      entete = champs.map((c) => c.toLowerCase());
      continue;
    }
    yield Object.fromEntries(entete.map((nom, i) => [nom, champs[i] ?? ""]));
  }
}

const rapport: string[] = [];
function noter(texte = ""): void {
  console.log(texte);
  rapport.push(texte);
}
const nombre = (n: number) => n.toLocaleString("fr-CH");
const pourcent = (a: number, b: number) => `${((100 * a) / b).toFixed(1)} %`;

// --- 1. Catalogue of Life XR : espèces acceptées, par nom et par règne ---
const idsCol = new Set<string>(); // identifiants COL des espèces acceptées
const col = new Map<string, string>(); // « règne|nom » → identifiant COL
const colParNom = new Map<string, string[]>(); // nom → identifiants (homonymes entre règnes)
for await (const t of lignes(fichierCol)) {
  if (t["rang"] !== "species") continue;
  const nom = t["nom_scientifique"] ?? "";
  idsCol.add(t["id"] ?? "");
  col.set(`${t["regne"]}|${nom}`, t["id"] ?? "");
  colParNom.set(nom, [...(colParNom.get(nom) ?? []), t["id"] ?? ""]);
}

// --- 2. Espèces observées (GBIF) ---
const seuils = [1, 10, 100, 1000, 10000];
const parSeuil = new Map(seuils.map((s) => [s, 0]));
const parRegne = new Map<string, number>();
const parUicn = new Map<string, number>();
const especesGbif = new Set<string>();
let especes = 0;
let observations = 0;
let relieesParId = 0;
let reliees = 0;
let relieesNomSeul = 0;
let observationsReliees = 0;
const nonReliees: { nom: string; obs: number }[] = [];
for await (const e of lignes(fichierEspeces)) {
  const n = Number(e["observations"] ?? 0);
  if (especesGbif.has(e["specieskey"] ?? "")) {
    // Même espèce sur plusieurs lignes (statut UICN ou classification qui varient) : comptée une fois.
    observations += n;
    continue;
  }
  especesGbif.add(e["specieskey"] ?? "");
  especes++;
  observations += n;
  for (const s of seuils) if (n >= s) parSeuil.set(s, (parSeuil.get(s) ?? 0) + 1);
  const regne = e["kingdom"] ?? "";
  parRegne.set(regne, (parRegne.get(regne) ?? 0) + 1);
  const uicn = e["iucnredlistcategory"] || "(aucun)";
  parUicn.set(uicn, (parUicn.get(uicn) ?? 0) + 1);
  const nom = e["species"] ?? "";
  if (idsCol.has(e["specieskey"] ?? "")) {
    // GBIF utilise déjà l'identifiant du Catalogue of Life XR : lien direct.
    relieesParId++;
    observationsReliees += n;
  } else if (col.has(`${regne}|${nom}`)) {
    reliees++;
    observationsReliees += n;
  } else if (colParNom.get(nom)?.length === 1) {
    relieesNomSeul++;
    observationsReliees += n;
  } else {
    nonReliees.push({ nom, obs: n });
  }
}

noter(`# Mesures du lot 3 (${new Date().toISOString().slice(0, 10)})`);
noter();
noter("## Espèces observées (GBIF)");
noter();
noter(`- Espèces : **${nombre(especes)}** ; observations : ${nombre(observations)}`);
noter(`- Par règne : ${[...parRegne].map(([r, n]) => `${r} ${nombre(n)}`).join(", ")}`);
noter(`- Au moins N observations : ${seuils.map((s) => `≥ ${nombre(s)} : ${nombre(parSeuil.get(s) ?? 0)}`).join(" · ")}`);
noter(`- Statut UICN : ${[...parUicn].sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c} ${nombre(n)}`).join(", ")}`);
noter();
noter("## Correspondance avec le Catalogue of Life XR (nom scientifique)");
noter();
noter(`- Exemples d'identifiants GBIF : ${[...especesGbif].slice(0, 5).join(", ")}`);
noter(`- Reliées par l'identifiant COL XR : ${nombre(relieesParId)} (${pourcent(relieesParId, especes)})`);
noter(`- Reliées par nom et règne : ${nombre(reliees)} (${pourcent(reliees, especes)})`);
noter(`- Reliées par le nom seul (pas d'homonyme) : ${nombre(relieesNomSeul)} (${pourcent(relieesNomSeul, especes)})`);
noter(`- **Total relié : ${pourcent(relieesParId + reliees + relieesNomSeul, especes)} des espèces, ${pourcent(observationsReliees, observations)} des observations**`);
noter(`- Non reliées les plus observées : ${nonReliees.sort((a, b) => b.obs - a.obs).slice(0, 15).map((x) => `${x.nom} (${nombre(x.obs)})`).join(", ")}`);
noter();

// --- 3. Couples espèce × pays ---
const parPays = new Map<string, number>();
let couples = 0;
let couplesMin10 = 0;
for await (const c of lignes(fichierPays)) {
  couples++;
  if (Number(c["observations"] ?? 0) >= 10) couplesMin10++;
  const pays = c["countrycode"] ?? "";
  parPays.set(pays, (parPays.get(pays) ?? 0) + 1);
}
const tailles = [...parPays.values()].sort((a, b) => a - b);
const mediane = tailles[Math.floor(tailles.length / 2)] ?? 0;
const [paysMax, nMax] = [...parPays].sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
// D1 (SQLite) : ~ 25 octets de données par ligne (pays, identifiant, nombre) + un index de même ordre.
const octetsD1 = couples * 50;
// Fichiers : une liste par pays, ~ 12 octets par ligne compressée (identifiant + nombre).
const octetsFichiers = couples * 12;
noter("## Couples espèce × pays");
noter();
noter(`- Couples : **${nombre(couples)}** ; avec au moins 10 observations : ${nombre(couplesMin10)} (${pourcent(couplesMin10, couples)})`);
noter(`- Pays : ${nombre(parPays.size)} ; espèces par pays : médiane ${nombre(mediane)}, maximum ${nombre(nMax)} (${paysMax})`);
noter(`- Estimation D1 : ~${nombre(Math.round(octetsD1 / 1e6))} Mo (limite gratuite : 500 Mo par base) ; recharger tous les couples demande ~${nombre(Math.ceil(couples / 100000))} jours d'écritures (limite : 100 000 par jour)`);
noter(`- Estimation en fichiers compressés : ~${nombre(Math.round(octetsFichiers / 1e6))} Mo`);

writeFileSync("tools/donnees/data/mesure.md", rapport.join("\n") + "\n");
console.log("\nRapport : tools/donnees/data/mesure.md");
