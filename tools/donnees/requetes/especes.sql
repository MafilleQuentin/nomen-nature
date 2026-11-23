SELECT specieskey, species, kingdom, phylum, class, "order", family, genus, iucnredlistcategory, COUNT(*) AS observations
FROM occurrence
WHERE specieskey IS NOT NULL
  AND kingdomkey IN (1, 5, 6)
  AND occurrencestatus = 'DETECTED'
  AND basisofrecord <> 'FOSSIL_SPECIMEN'
  AND basisofrecord <> 'LIVING_SPECIMEN'
GROUP BY specieskey, species, kingdom, phylum, class, "order", family, genus, iucnredlistcategory
