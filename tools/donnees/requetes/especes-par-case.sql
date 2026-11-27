-- Richesse du vivant pour les courbes de niveau de la carte (lot 6, QUE-31) : nombre d'espèces
-- distinctes observées par case d'un degré (latitude et longitude arrondies vers le bas).
-- Mêmes filtres que les autres demandes, plus les coordonnées sans problème connu.
SELECT FLOOR(decimallatitude) AS lat, FLOOR(decimallongitude) AS lon, COUNT(DISTINCT specieskey) AS especes
FROM occurrence
WHERE specieskey IS NOT NULL
  AND decimallatitude IS NOT NULL
  AND decimallongitude IS NOT NULL
  AND hasgeospatialissues = FALSE
  AND kingdom IN ('Animalia', 'Plantae', 'Fungi')
  AND occurrencestatus = 'DETECTED'
  AND basisofrecord <> 'FOSSIL_SPECIMEN'
  AND basisofrecord <> 'LIVING_SPECIMEN'
GROUP BY FLOOR(decimallatitude), FLOOR(decimallongitude)
