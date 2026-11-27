// Lecteur minimal du format shapefile (lot 6, QUE-29), sans dépendance : polygones (.shp, type 5)
// et attributs (.dbf, texte UTF-8 d'après le .cpg de Natural Earth). Suffisant pour les pays de
// Natural Earth ; ne lit ni les multipoints ni les polylignes.
// Format : ESRI Shapefile Technical Description (juillet 1998) ; dBASE III.

export type Anneau = [number, number][];

/** Polygones d'un fichier .shp : pour chaque enregistrement, ses anneaux (extérieurs et trous). */
export function lirePolygones(shp: Buffer): Anneau[][] {
  const formes: Anneau[][] = [];
  let position = 100; // en-tête du fichier
  while (position + 8 <= shp.length) {
    const longueur = shp.readInt32BE(position + 4) * 2; // en mots de 16 bits
    const debut = position + 8;
    const type = shp.readInt32LE(debut);
    if (type === 5) {
      const nbParties = shp.readInt32LE(debut + 36);
      const nbPoints = shp.readInt32LE(debut + 40);
      const parties = Array.from({ length: nbParties }, (_, i) => shp.readInt32LE(debut + 44 + i * 4));
      const points = debut + 44 + nbParties * 4;
      const anneaux: Anneau[] = parties.map((premier, i) => {
        const dernier = i + 1 < nbParties ? (parties[i + 1] ?? nbPoints) : nbPoints;
        const anneau: Anneau = [];
        for (let p = premier; p < dernier; p++) anneau.push([shp.readDoubleLE(points + p * 16), shp.readDoubleLE(points + p * 16 + 8)]);
        return anneau;
      });
      formes.push(anneaux);
    } else {
      formes.push([]); // forme vide (type 0) ou non lue
    }
    position = debut + longueur;
  }
  return formes;
}

/** Attributs d'un fichier .dbf : un objet par enregistrement, valeurs en texte sans espaces autour. */
export function lireAttributs(dbf: Buffer): Record<string, string>[] {
  const nombre = dbf.readUInt32LE(4);
  const tailleEntete = dbf.readUInt16LE(8);
  const tailleEnregistrement = dbf.readUInt16LE(10);
  const champs: { nom: string; longueur: number }[] = [];
  for (let p = 32; p < tailleEntete - 1 && dbf[p] !== 0x0d; p += 32) {
    const nom = dbf.toString("latin1", p, p + 11).replace(/\0.*$/s, "");
    champs.push({ nom, longueur: dbf[p + 16] ?? 0 });
  }
  const lignes: Record<string, string>[] = [];
  for (let i = 0; i < nombre; i++) {
    let p = tailleEntete + i * tailleEnregistrement + 1; // 1 : marque de suppression
    const ligne: Record<string, string> = {};
    for (const { nom, longueur } of champs) {
      // Les champs sont complétés par des espaces ou des caractères nuls.
      ligne[nom] = dbf
        .toString("utf8", p, p + longueur)
        .replaceAll("\0", "")
        .trim();
      p += longueur;
    }
    lignes.push(ligne);
  }
  return lignes;
}
