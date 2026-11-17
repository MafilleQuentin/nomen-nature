# Parcours utilisateurs

*Étape 2 — en attente de validation. Schémas : [FigJam « Nomen »](https://www.figma.com/board/PLlFoRDj5ko2AJftKq78p1/Nomen).*

Le FigJam contient quatre schémas, de gauche à droite :

| # | Schéma | Ce qu'il montre |
|---|---|---|
| 1 | Plan du site | Toutes les pages de la V1 et comment on passe de l'une à l'autre |
| 2 | Explorer la carte | Monde → continent → pays → espèce, et retour depuis la fiche |
| 3 | Identifier une plante | De la photo à la fiche espèce, avec tous les cas d'erreur |
| 4 | Autour de moi | De l'accord de géolocalisation à la liste des espèces proches |

## 1. Plan du site

- Tout part de l'**accueil**, qui donne accès aux six portes d'entrée : carte, recherche, Autour de moi, Identifier une plante, Menacées dans ton pays, Explorer par groupe.
- Les portes « Explorer » (carte, groupes, menacées) et « Autour de moi » mènent à une **liste d'espèces** ; la recherche et l'identification mènent directement à la **fiche espèce**.
- La fiche espèce est le cœur du site : elle mène à la carte de répartition et aux espèces proches, qui mènent elles-mêmes à d'autres fiches.
- Pages annexes accessibles partout (pied de page) : À propos, Sources et crédits, choix de la langue.

## 2. Explorer la carte

- Monde : continents en couleurs. Un clic zoome sur le continent ; le zoom libre reste possible.
- Continent : les pays apparaissent, un panneau liste les espèces du continent.
- Pays : panneau des espèces du pays, menacées en premier, filtrable par groupe et par statut.
- Depuis la fiche, la carte de répartition permet de revenir sur un pays (« Voir ce pays »).

## 3. Identifier une plante

- Photo prise sur le moment ou choisie dans la galerie.
- On peut préciser la partie photographiée (feuille, fleur, fruit, écorce) ou laisser « automatique » : Pl@ntNet est plus précis quand on la précise.
- Cas prévus : pas de connexion, limite du jour atteinte (« reviens demain »), aucune espèce trouvée (conseils pour une meilleure photo), confiance faible (proposer d'ajouter une autre photo).
- Résultat : les 3 espèces les plus probables avec leur niveau de confiance ; on en choisit une pour ouvrir sa fiche.

## 4. Autour de moi

- Avant la demande du navigateur, une courte explication rassure : la position n'est jamais enregistrée.
- Si la personne refuse, on lui propose de choisir un lieu sur la carte : la fonction reste utilisable.
- Recherche des espèces observées dans un rayon ; s'il n'y a rien, on élargit le rayon.
- Liste : espèces bien documentées d'abord, badges de menace visibles, filtre par groupe.

## Hypothèses à valider

Ces points ne sont pas encore décidés, ils sont proposés dans les schémas :

1. **Rayon d'« Autour de moi »** : 5 km par défaut, élargi à 25 km puis 100 km s'il n'y a pas de résultat.
2. **Nombre de propositions d'identification** : 3, avec le niveau de confiance en pourcentage.
3. **Partie de la plante** : le choix est facultatif, « automatique » par défaut.
4. **Sur téléphone**, les panneaux d'espèces de la carte s'ouvrent depuis le bas de l'écran, par-dessus la carte ; sur ordinateur, ils s'affichent sur le côté.
5. **Pied de page** : À propos, Sources et crédits et la langue y sont toujours accessibles.

Voir aussi : [Brief](../01-Cadrage/Brief.md) · [Feuille de route](../Feuille%20de%20route.md)
