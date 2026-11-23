SELECT countrycode, specieskey, COUNT(*) AS observations
FROM occurrence
WHERE specieskey IS NOT NULL
  AND countrycode IS NOT NULL
  AND kingdomkey IN (1, 5, 6)
  AND occurrencestatus = 'DETECTED'
  AND basisofrecord <> 'FOSSIL_SPECIMEN'
  AND basisofrecord <> 'LIVING_SPECIMEN'
GROUP BY countrycode, specieskey
