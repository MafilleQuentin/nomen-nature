SELECT continent, specieskey, COUNT(*) AS observations
FROM occurrence
WHERE specieskey IS NOT NULL
  AND continent IS NOT NULL
  AND kingdom IN ('Animalia', 'Plantae', 'Fungi')
  AND occurrencestatus = 'DETECTED'
  AND basisofrecord <> 'FOSSIL_SPECIMEN'
  AND basisofrecord <> 'LIVING_SPECIMEN'
GROUP BY continent, specieskey
