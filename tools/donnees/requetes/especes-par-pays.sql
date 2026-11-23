SELECT countrycode, specieskey, COUNT(*) AS observations
FROM occurrence
WHERE specieskey IS NOT NULL
  AND countrycode IS NOT NULL
  AND kingdom IN ('Animalia', 'Plantae', 'Fungi')
  AND occurrencestatus = 'DETECTED'
  AND basisofrecord <> 'FOSSIL_SPECIMEN'
  AND basisofrecord <> 'LIVING_SPECIMEN'
GROUP BY countrycode, specieskey
