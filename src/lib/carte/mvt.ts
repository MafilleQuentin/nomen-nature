// Lecture des tuiles vectorielles (format Mapbox Vector Tile, protobuf) de GBIF, sans dépendance
// (lot 4, QUE-25). On ne lit que ce dont la carte de répartition a besoin : pour chaque objet
// d'une couche, ses propriétés et le centre de sa géométrie (point, ou centre d'un hexagone), en
// coordonnées de tuile (0 à `etendue`).
//
// Format : https://github.com/mapbox/vector-tile-spec (version 2).

export interface ObjetTuile {
  /** Centre de l'objet, en coordonnées de tuile. */
  x: number;
  y: number;
  proprietes: Record<string, string | number | boolean>;
}

export interface CoucheTuile {
  nom: string;
  etendue: number;
  objets: ObjetTuile[];
}

/** Lecteur protobuf minimal : entiers variables, longueurs, nombres à virgule. */
class Lecteur {
  position = 0;
  private readonly octets: Uint8Array;
  readonly fin: number;
  constructor(octets: Uint8Array, fin = octets.length) {
    this.octets = octets;
    this.fin = fin;
  }

  get termine(): boolean {
    return this.position >= this.fin;
  }

  varint(): number {
    let resultat = 0;
    let decalage = 0;
    for (;;) {
      if (this.position >= this.fin) throw new Error("Tuile tronquée.");
      const octet = this.octets[this.position++] ?? 0;
      resultat += (octet & 0x7f) * 2 ** decalage;
      if (octet < 0x80) return resultat;
      decalage += 7;
      if (decalage > 63) throw new Error("Entier trop long.");
    }
  }

  /** Sous-lecteur pour un champ de longueur donnée (message, chaîne, liste compactée). */
  sousLecteur(): Lecteur {
    const longueur = this.varint();
    const debut = this.position;
    this.position += longueur;
    if (this.position > this.fin) throw new Error("Tuile tronquée.");
    const lecteur = new Lecteur(this.octets, this.position);
    lecteur.position = debut;
    return lecteur;
  }

  texte(): string {
    const l = this.sousLecteur();
    return new TextDecoder().decode(this.octets.subarray(l.position, l.fin));
  }

  flottant(octets: 4 | 8): number {
    const vue = new DataView(this.octets.buffer, this.octets.byteOffset + this.position, octets);
    this.position += octets;
    return octets === 4 ? vue.getFloat32(0, true) : vue.getFloat64(0, true);
  }

  /** Saute un champ selon son type de fil. */
  sauter(type: number): void {
    if (type === 0) this.varint();
    else if (type === 1) this.position += 8;
    else if (type === 2) this.position += this.varint();
    else if (type === 5) this.position += 4;
    else throw new Error(`Type de champ inconnu : ${type}.`);
  }
}

const zigzag = (n: number) => (n % 2 === 0 ? n / 2 : -(n + 1) / 2);

function lireValeur(l: Lecteur): string | number | boolean {
  let valeur: string | number | boolean = "";
  while (!l.termine) {
    const cle = l.varint();
    const champ = Math.floor(cle / 8);
    const type = cle & 7;
    if (champ === 1) valeur = l.texte();
    else if (champ === 2) valeur = l.flottant(4);
    else if (champ === 3) valeur = l.flottant(8);
    else if (champ === 4 || champ === 5) valeur = l.varint();
    else if (champ === 6) valeur = zigzag(l.varint());
    else if (champ === 7) valeur = l.varint() !== 0;
    else l.sauter(type);
  }
  return valeur;
}

/** Centre d'une géométrie : moyenne des sommets (suffisant pour un point ou un hexagone). */
function centre(commandes: number[]): { x: number; y: number } | undefined {
  let x = 0;
  let y = 0;
  let somme = { x: 0, y: 0, n: 0 };
  for (let i = 0; i < commandes.length; ) {
    const commande = commandes[i++] ?? 0;
    const id = commande & 7;
    const nombre = commande >> 3;
    if (id === 7) continue; // fermeture
    for (let k = 0; k < nombre; k++) {
      x += zigzag(commandes[i++] ?? 0);
      y += zigzag(commandes[i++] ?? 0);
      somme = { x: somme.x + x, y: somme.y + y, n: somme.n + 1 };
    }
  }
  return somme.n ? { x: somme.x / somme.n, y: somme.y / somme.n } : undefined;
}

function lireCouche(l: Lecteur): CoucheTuile {
  let nom = "";
  let etendue = 4096;
  const cles: string[] = [];
  const valeurs: (string | number | boolean)[] = [];
  const brutes: Lecteur[] = [];
  while (!l.termine) {
    const cle = l.varint();
    const champ = Math.floor(cle / 8);
    const type = cle & 7;
    if (champ === 1) nom = l.texte();
    else if (champ === 2) brutes.push(l.sousLecteur());
    else if (champ === 3) cles.push(l.texte());
    else if (champ === 4) valeurs.push(lireValeur(l.sousLecteur()));
    else if (champ === 5) etendue = l.varint();
    else l.sauter(type);
  }
  const objets: ObjetTuile[] = [];
  for (const f of brutes) {
    const etiquettes: number[] = [];
    const commandes: number[] = [];
    while (!f.termine) {
      const cle = f.varint();
      const champ = Math.floor(cle / 8);
      const type = cle & 7;
      if ((champ === 2 || champ === 4) && type === 2) {
        const liste = f.sousLecteur();
        const cible = champ === 2 ? etiquettes : commandes;
        while (!liste.termine) cible.push(liste.varint());
        f.position = liste.fin;
      } else f.sauter(type);
    }
    const c = centre(commandes);
    if (!c) continue;
    const proprietes: ObjetTuile["proprietes"] = {};
    for (let i = 0; i + 1 < etiquettes.length; i += 2) {
      const k = cles[etiquettes[i] ?? -1];
      const v = valeurs[etiquettes[i + 1] ?? -1];
      if (k !== undefined && v !== undefined) proprietes[k] = v;
    }
    objets.push({ ...c, proprietes });
  }
  return { nom, etendue, objets };
}

/** Couches d'une tuile vectorielle. Lève une erreur si la tuile est illisible. */
export function lireTuile(octets: Uint8Array): CoucheTuile[] {
  const l = new Lecteur(octets);
  const couches: CoucheTuile[] = [];
  while (!l.termine) {
    const cle = l.varint();
    if (Math.floor(cle / 8) === 3 && (cle & 7) === 2) {
      const sous = l.sousLecteur();
      couches.push(lireCouche(sous));
      l.position = sous.fin;
    } else l.sauter(cle & 7);
  }
  return couches;
}
