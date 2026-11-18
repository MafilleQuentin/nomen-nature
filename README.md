# Nomen Nature

> Réapprendre à reconnaître la nature qui nous entoure, et faire connaître les espèces menacées.

**Nomen Nature** est un site web gratuit et non commercial qui permet d'explorer la faune, la flore et les champignons du monde entier. On y navigue sur une carte interactive, par continent puis par pays, on découvre ce qui vit autour de soi et on identifie une plante à partir d'une simple photo. Il s'adresse au grand public, aux enfants et aux écoles.

*English: Nomen Nature is a free, non-commercial website to explore the world's wildlife, plants and fungi through an interactive map, discover what lives around you, identify plants from a photo, and learn which species are threatened. French and English from day one.*

## État du projet

🟡 **Développement de la V1 commencé.** Le site lui-même n'existe pas encore : le projet avance étape par étape, lot par lot.

Le site sera construit avec [Astro](https://astro.build) et TypeScript, et hébergé sur [Cloudflare Workers](https://workers.cloudflare.com). Détail : [stack technique](docs/02-Conception/Stack%20technique.md).

Le premier lot de développement, un **essai de la recherche**, est terminé : la recherche tolérante aux fautes (« boulot » trouve le bouleau) fonctionnera avec un index en fichiers statiques. Outils et résultats : [`tools/essai-recherche/`](tools/essai-recherche/README.md).

| Étape | État |
|---|---|
| 1. Cadrage et brief | ✅ Terminé |
| 2. Parcours utilisateurs (FigJam) | ✅ Terminé |
| 3. Maquettes Figma (mobile et ordinateur) | ✅ Terminé |
| 4. Choix de la stack technique | ✅ Terminé |
| 5. Développement de la V1, lot par lot | ⏳ En cours (lot 1 sur 10 terminé) |

Détail : [feuille de route](docs/Feuille%20de%20route.md).

## Ce que fera la première version

- 🗺️ **Carte interactive** : le monde par continents, puis les pays et leurs espèces, avec zoom libre.
- 🔎 **Recherche** en français, en anglais ou en latin, avec suggestions et tolérance aux fautes.
- 📍 **Autour de moi** : les espèces observées près de toi (la position n'est jamais enregistrée).
- 📷 **Identifier une plante** à partir d'une photo.
- 🦉 **Fiches espèces** : photos, noms, statut de menace, description, carte de répartition, famille, espèces proches.
- ⚠️ **Espèces menacées** mises en avant dans chaque pays.
- 🏫 **Utilisable en classe** : pas de compte, pas de publicité, pas de pistage. Accessibilité visée : WCAG AA.

## Développer en local

Il faut **Node 22.23.4 ou plus** (Node 24 LTS conseillé, voir `.node-version`).

```bash
npm install
```

```bash
npm run dev
```

Le site s'ouvre sur <http://localhost:4321>. Le premier démarrage prend une vingtaine de secondes.

| Commande | Rôle |
|---|---|
| `npm run dev` | Serveur de développement, avec le moteur de Cloudflare (workerd) |
| `npm run build` | Construit le site dans `dist/` |
| `npm run preview` | Construit puis sert le site comme en ligne (Wrangler) |
| `npm run check` | Vérifie les types (TypeScript, fichiers Astro) |

Les secrets ne sont jamais dans le dépôt : copier `.env.example` en `.dev.vars` pour le développement local.

## Documentation

Toute la documentation du projet se trouve dans [`docs/`](docs/Accueil.md). C'est aussi un **coffre Obsidian** : ouvre le dossier `docs` comme coffre dans Obsidian pour naviguer dans les notes.

- [Brief du projet](docs/01-Cadrage/Brief.md)
- [Style visuel](docs/02-Conception/Style%20visuel.md) et [design system](docs/02-Conception/Design%20system.md)
- [Sources de données](docs/01-Cadrage/Sources%20de%20donnees.md)
- [Journal des décisions](docs/Decisions.md)
- [Glossaire](docs/Glossaire.md)

## Données et crédits

Nomen Nature ne rédige pas sa propre encyclopédie : il met en valeur des bases scientifiques ouvertes, toujours citées.

- [GBIF](https://www.gbif.org) : espèces, observations, cartes de répartition
- [Wikipédia](https://www.wikipedia.org) et [Wikimedia Commons](https://commons.wikimedia.org) : descriptions et photos
- [iNaturalist](https://www.inaturalist.org) : photos
- [Liste rouge de l'UICN](https://www.iucnredlist.org) : statuts de conservation
- [Pl@ntNet](https://plantnet.org) : identification des plantes
- [Natural Earth](https://www.naturalearthdata.com) : frontières des pays

Chaque contenu garde sa propre licence. Les photos et les textes sont crédités à leurs auteurs.

## Licence

Le code est publié sous [licence MIT](LICENSE). Les données et les médias affichés restent sous la licence de leur source.
