-- Schéma de l'essai de la recherche (lot 1, QUE-6).
-- Compatible D1 (SQLite) : à exécuter avant le chargement des données.

DROP TABLE IF EXISTS nom_fts;
DROP TABLE IF EXISTS nom;
DROP TABLE IF EXISTS taxon;

-- Taxons cherchables : espèces, genres et familles acceptés (Catalogue of Life XR).
CREATE TABLE taxon (
  id               TEXT PRIMARY KEY,        -- identifiant COL XR, ex. 4R5YN
  rang             TEXT NOT NULL,           -- species | genus | family
  nom_scientifique TEXT NOT NULL,
  auteur           TEXT,
  regne            TEXT NOT NULL,           -- Animalia | Plantae | Fungi
  famille          TEXT,
  genre            TEXT,
  groupe           TEXT                     -- groupe COL (taxGroup), utile pour les 13 groupes courants
);

-- Un nom cherchable par ligne, rattaché à un taxon.
CREATE TABLE nom (
  id       INTEGER PRIMARY KEY,
  taxon_id TEXT NOT NULL REFERENCES taxon(id),
  nom      TEXT NOT NULL,
  langue   TEXT NOT NULL,                   -- la | fr | en
  type     TEXT NOT NULL,                   -- accepte | synonyme | courant
  cle      TEXT NOT NULL                    -- clé phonétique selon la langue (phonetique.py), ex. « bUlo » pour bouleau
);
CREATE INDEX nom_taxon ON nom(taxon_id);
-- Recherche par début de clé : WHERE langue = ? AND cle >= ? AND cle < ? || '~'
CREATE INDEX nom_cle ON nom(langue, cle);

-- Index plein texte par trigrammes : sous-chaînes, sans tenir compte des majuscules ni des accents.
-- « Contenu externe » : l'index ne recopie pas les noms, il pointe vers la table nom.
CREATE VIRTUAL TABLE nom_fts USING fts5(
  nom,
  content = 'nom',
  content_rowid = 'id',
  tokenize = 'trigram remove_diacritics 1'
);
