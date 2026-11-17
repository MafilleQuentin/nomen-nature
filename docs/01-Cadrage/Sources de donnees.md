# Sources de données

*Recherche faite le 17 novembre 2026. À revérifier avant le développement : les conditions des services changent.*

## En bref

| Source | Ce qu'on en tire | Coût | Contraintes |
|---|---|---|---|
| **GBIF** | Espèces, classification, noms en français, observations, listes par pays et par continent, tuiles de carte, catégorie UICN | Gratuit, sans clé | Citer GBIF et les jeux de données ; `User-Agent` identifiant le site ; pas de débit garanti (erreur 429) |
| **Wikipédia** | Résumés des fiches | Gratuit | CC BY-SA : créditer, lier l'article |
| **Wikimedia Commons** | Photos | Gratuit | Licence par fichier : créditer l'auteur, indiquer la licence, lier la page du fichier |
| **iNaturalist** | Photos supplémentaires | Gratuit | Surtout CC BY-NC (OK car site non commercial) ; 60 requêtes/min max, moins de 10 000/jour ; pas d'aspiration massive |
| **Liste rouge UICN** | Statut de menace (LC, VU, EN, CR…) | Gratuit | La catégorie est libre ; les textes et cartes UICN ne doivent **pas** être republiés |
| **Pl@ntNet** | Identification des plantes par photo | Gratuit jusqu'à 500/jour ; plan non-profit jusqu'à 10 000/jour | Une seule clé par organisation ; plan non-profit refusé en cas de pub ou d'abonnement |
| **Wikidata** | Relier les identifiants entre les bases, noms traduits | Gratuit | CC0, aucune obligation |
| **Natural Earth** | Frontières des pays et des continents | Gratuit | Domaine public |
| **Catalogue of Life** | Référentiel de classification | Gratuit | CC BY, citer l'édition |

## GBIF, la colonne vertébrale

- Environ **1,5 million d'espèces** ont au moins une observation, sur près de **3,9 milliards d'observations**.
- Noms vernaculaires en français disponibles (à dédoublonner).
- Filtres par **pays** et par **continent** : ils rendent possibles les trois niveaux de la carte.
- **Tuiles de carte** de densité d'observations toutes prêtes, et fond de carte gratuit (attribution OpenStreetMap).
- L'ancienne API « Species v1 » est dépréciée au profit de la « Taxon API v2 » : à prendre en compte dès le départ.
- Bonne pratique : enregistrer un « derived dataset » sur GBIF pour obtenir un DOI qui cite toutes les sources utilisées.

## Identification par photo

| Option | Verdict |
|---|---|
| **Pl@ntNet** (plantes) | ✅ Retenu pour la V1 |
| iNaturalist (vision par ordinateur) | ❌ Non accessible au public |
| Kindwise (insect.id, plant.id, mushroom.id) | 💰 Payant : de 0,01 à 0,05 € par identification |
| BioCLIP 2 (modèle libre, tout le vivant) | 🔧 Possible plus tard, mais il faut l'héberger soi-même |
| Google / Microsoft Vision | ❌ Ne reconnaît que « arbre » ou « oiseau », pas l'espèce |

→ D'où la décision : **plantes seulement en V1**, animaux et insectes plus tard.

## Points de vigilance

- **Créditer partout** : photographes, Wikipédia, GBIF, UICN, OpenStreetMap.
- **Licences par contenu** : chaque photo a la sienne. Il faut stocker et afficher la licence avec chaque média.
- **Rester non commercial** : c'est la condition qui autorise les photos iNaturalist en CC BY-NC et le plan non-profit de Pl@ntNet.
- **Frontières** : Natural Earth suit les frontières *de facto* ; des variantes existent pour les zones contestées.

## Sources principales

- GBIF : [documentation de l'API](https://techdocs.gbif.org/en/openapi/), [conditions d'utilisation des données](https://www.gbif.org/terms/data-user), [citation](https://www.gbif.org/citation-guidelines)
- Pl@ntNet : [tarifs](https://my.plantnet.org/pricing), [conditions](https://my.plantnet.org/terms_of_use)
- UICN : [conditions d'utilisation](https://www.iucnredlist.org/terms/terms-of-use)
- Wikimedia : [réutiliser le contenu de Commons](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia), [politique d'accès aux API](https://www.mediawiki.org/wiki/Wikimedia_APIs/Access_policy)
- iNaturalist : [API](https://api.inaturalist.org/v1/docs/)
- BioCLIP 2 : [Hugging Face](https://huggingface.co/imageomics/bioclip-2)
- Natural Earth : [politique sur les frontières contestées](https://www.naturalearthdata.com/about/disputed-boundaries-policy/)

Voir aussi : [Brief](Brief.md) · [Glossaire](../Glossaire.md)
