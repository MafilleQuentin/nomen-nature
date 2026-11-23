SELECT specieskey, species, kingdom, phylum, class, "order", family, genus, iucnredlistcategory, COUNT(*) AS observations
FROM occurrence
WHERE specieskey IS NOT NULL
  AND kingdom IN ('Animalia', 'Plantae', 'Fungi')
  AND occurrencestatus = 'PRESENT'
  AND basisofrecord <> 'FOSSIL_SPECIMEN'
  AND basisofrecord <> 'LIVING_SPECIMEN'
GROUP BY specieskey, species, kingdom, phylum, class, "order", family, genus, iucnredlistcategory
