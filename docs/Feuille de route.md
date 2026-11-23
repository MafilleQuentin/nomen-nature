# Feuille de route

## Étapes

| # | Étape | État | Résultat attendu |
|---|---|---|---|
| 1 | Cadrage | ✅ Terminé (17.11.2026) | [Brief](01-Cadrage/Brief.md) validé |
| 2 | Parcours utilisateurs | ✅ Terminé (17.11.2026) | [Parcours utilisateurs](02-Conception/Parcours%20utilisateurs.md) : 4 schémas dans le FigJam |
| 3 | Maquettes Figma | ✅ Terminé (17.11.2026) | [Style visuel](02-Conception/Style%20visuel.md), [design system](02-Conception/Design%20system.md), [écrans clés](02-Conception/Ecrans%20cles.md) et [écrans secondaires](02-Conception/Ecrans%20secondaires.md) validés |
| 4 | Stack technique | ✅ Terminé (18.11.2026) | [Stack technique](02-Conception/Stack%20technique.md) : Astro + Cloudflare, consignée dans les [décisions](Decisions.md) |
| 5 | Développement V1 | ⏳ **En cours** (lots 1 à 3 terminés) | Livré lot par lot, chaque lot testé et publié en release |
| 6 | Mise en ligne | ⬜ | Site public sur `nomenature.org` |

## Lots de l'étape 5

Découpés le 18.11.2026 dans le projet Linear [Nomen Nature — V1](https://linear.app/quentin-mafille/project/nomen-nature-v1-b9e8eb511ed2) : un jalon par lot. Les tickets des lots 1 et 2 sont détaillés ; ceux des lots 3 à 10 le seront au début de chaque lot.

| Lot | Contenu | Tickets | Release | État |
|---|---|---|---|---|
| 1 | **Essai de la recherche** : noms du Catalogue of Life XR, clé phonétique, 40 recherches de test ; verdict : **index en fichiers statiques sans synonymes** (D1 gratuit trop petit) | QUE-5 à QUE-10 | v0.5.0 | ✅ Terminé (18.11.2026) |
| 2 | **Socle** : Astro + TypeScript + Svelte, variables CSS, gabarit, bilingue, 404, intégration continue, déploiement de test | QUE-11 à QUE-17 | v0.6.0 | ✅ Terminé |
| 3 | **Données** : import mensuel (index de recherche en fichiers ; D1 ou fichiers pour les listes, à mesurer), groupes courants, statut UICN, score « bien documentée », listes par pays et continent | QUE-18 à QUE-21 | v0.7.0 | ✅ Terminé |
| 4 | **Fiche espèce** : complète et peu documentée, photos créditées, carte de répartition, référencement et cache | QUE-22 à QUE-26 | v0.8.0 | ⏳ En cours (QUE-22 en relecture) |
| 5 | **Recherche** : autocomplétion, résultats, « Tu voulais dire… », filtres | QUE-27, QUE-28 | v0.9.0 | ⬜ |
| 6 | **Carte** : monde → continent → pays en d3, panneau d'espèces, courbes de niveau réelles | QUE-29 à QUE-31 | v0.10.0 | ⬜ |
| 7 | **Listes et accueil** : page pays, liste d'un groupe, espèces menacées, accueil | QUE-32 à QUE-34 | v0.11.0 | ⬜ |
| 8 | **Autour de moi** : demande de position ou choix d'un lieu, rayon 5/25/100 km, carte et liste | QUE-35, QUE-36 | v0.12.0 | ⬜ |
| 9 | **Identifier une plante** : clé Pl@ntNet, photo, Worker avec limite, résultats et erreurs | QUE-37 à QUE-40 | v0.13.0 | ⬜ |
| 10 | **Finitions avant ouverture** : logo et favicon, pages légales, plan du site, DOI GBIF, checklist complète | QUE-41 à QUE-45 | v0.14.0 | ⬜ |

L'ouverture au public (étape 6) sera la **v1.0.0**.

## À faire hors développement

- [x] Réserver le domaine `nomenature.org` : fait le 17.11.2026 chez Cloudflare Registrar (expire le 17.11.2027, 11,20 $/an)
- [ ] Valider l'e-mail de contact du domaine (sinon suspension) et activer le renouvellement automatique
- [ ] Optionnel : `nomennature.org` pour rediriger les fautes de frappe
- [ ] Demander une clé Pl@ntNet (puis le plan non-profit) avant le lot 9 (ticket QUE-37)

## Plus tard (après la V1)

- Comptes facultatifs (favoris, historique)
- Partage d'observations par les visiteurs
- Identification des animaux, insectes et champignons par photo (BioCLIP 2 ou service payant)
- Espace écoles : quiz, fiches imprimables, parcours pour les profs
- Arbre de classification interactif (groupes emboîtés, par caractères observables, pour les animaux et les plantes)
- Clés de détermination : identifier sans photo, par questions successives
- « Comment le distinguer d'une espèce qui lui ressemble »
- Océans cliquables, régions plus fines (cantons, départements)
- **Calques de carte** (idée du 17.11.2026, à approfondir le moment venu) :
  - calque **diversité** : colorer la carte selon le nombre d'espèces, du « peu d'espèces » au « beaucoup d'espèces », avec une légende (comme la légende de la variation E2 dans Figma) ;
  - d'autres calques possibles plus tard (à définir ensemble : espèces menacées, groupes, etc.).
- Allemand, italien, puis d'autres langues
- Application mobile
- Dons
- Partenariat avec le WWF
