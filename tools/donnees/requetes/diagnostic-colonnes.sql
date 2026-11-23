SELECT occurrencestatus, basisofrecord, kingdomkey, kingdom, COUNT(*) AS observations, COUNT(specieskey) AS avec_specieskey, COUNT(taxonkey) AS avec_taxonkey
FROM occurrence
WHERE countrycode = 'LI'
GROUP BY occurrencestatus, basisofrecord, kingdomkey, kingdom
