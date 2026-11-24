<!--
  Suggestions de la barre de recherche (lot 5, QUE-27) : îlot Svelte posé sur le champ de la
  barre (BarreDeRecherche.astro). Sans JavaScript, la barre reste un simple formulaire qui envoie
  vers la page de résultats ; avec, le champ devient une « combobox » (motif ARIA) :
  - pendant la frappe (3 caractères au moins, après une courte pause), notre serveur renvoie les
    8 meilleures espèces (/api/recherche) ;
  - flèches haut et bas pour choisir, Entrée pour ouvrir la fiche (ou la page de résultats si
    rien n'est choisi), Échap pour fermer ; un clic ouvre aussi (les options ne contiennent pas de
    lien : un élément interactif ne doit pas en contenir un autre) ;
  - le nombre de suggestions est annoncé aux lecteurs d'écran.
  Pas de maquette pour cette liste : elle reprend le design system (surface, badge, nom latin).
-->
<script lang="ts">
  import { onMount } from "svelte";

  interface Suggestion {
    nom: string;
    latin: string;
    trouve: string;
    lien: string;
    statut: string;
    libelleStatut: string;
    groupe: string;
  }

  interface Textes {
    suggestions: string;
    nbSuggestions: string;
    uneSuggestion: string;
    aucuneSuggestion: string;
    tuVoulaisDire: string;
    voirTout: string;
    statutUicn: string;
  }

  let { idChamp, langue, lienResultats, textes }: { idChamp: string; langue: string; lienResultats: string; textes: Textes } = $props();

  let suggestions = $state<Suggestion[]>([]);
  let correction = $state("");
  let texte = $state("");
  let actif = $state(-1);
  let ouvert = $state(false);
  let annonce = $state("");
  let champ = $state<HTMLInputElement | null>(null);
  const idListe = `${idChamp}-suggestions`;
  const idOption = (i: number) => `${idChamp}-suggestion-${i}`;
  const remplir = (modele: string, valeurs: Record<string, string>) => modele.replace(/\{(\w+)\}/g, (_, c: string) => valeurs[c] ?? "");
  // Dernière option : « Tous les résultats ».
  const nombreOptions = $derived(suggestions.length + (suggestions.length ? 1 : 0));

  function fermer() {
    ouvert = false;
    actif = -1;
  }

  function ouvrir(i: number) {
    if (i < 0 || i >= nombreOptions) return;
    const lien = i < suggestions.length ? suggestions[i]?.lien : `${lienResultats}?q=${encodeURIComponent(texte)}`;
    if (lien) window.location.href = lien;
  }

  // État de la combobox sur le champ (lu d'abord, pour que l'effet suive chaque changement).
  $effect(() => {
    const deplie = ouvert && nombreOptions > 0;
    const choisi = deplie && actif >= 0 ? idOption(actif) : "";
    if (!champ) return;
    champ.setAttribute("aria-expanded", String(deplie));
    if (choisi) champ.setAttribute("aria-activedescendant", choisi);
    else champ.removeAttribute("aria-activedescendant");
  });

  onMount(() => {
    const c = document.getElementById(idChamp) as HTMLInputElement | null;
    if (!c) return;
    champ = c;
    c.setAttribute("role", "combobox");
    c.setAttribute("aria-autocomplete", "list");
    c.setAttribute("aria-controls", idListe);
    c.setAttribute("aria-expanded", "false");

    let minuterie: ReturnType<typeof setTimeout> | undefined;
    let controleur: AbortController | undefined;

    async function chercher() {
      const q = c.value.trim();
      if (q.length < 3) {
        suggestions = [];
        fermer();
        return;
      }
      controleur?.abort();
      controleur = new AbortController();
      try {
        const reponse = await fetch(`/api/recherche?q=${encodeURIComponent(q)}&langue=${langue}`, { signal: controleur.signal });
        const donnees = (await reponse.json()) as { suggestions: Suggestion[]; correction?: string };
        if (c.value.trim() !== q) return;
        texte = q;
        suggestions = donnees.suggestions;
        correction = donnees.correction ?? "";
        actif = -1;
        ouvert = true;
        const n = suggestions.length;
        annonce = n === 0 ? textes.aucuneSuggestion : n === 1 ? textes.uneSuggestion : remplir(textes.nbSuggestions, { n: String(n) });
      } catch {
        // Requête annulée (frappe suivante) ou réseau absent : on garde la liste telle quelle.
      }
    }

    const surFrappe = () => {
      clearTimeout(minuterie);
      minuterie = setTimeout(chercher, 180);
    };
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        if (!ouvert) ouvert = suggestions.length > 0;
        else actif = Math.min(actif + 1, nombreOptions - 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        actif = Math.max(actif - 1, -1);
      } else if (e.key === "Enter" && ouvert && actif >= 0) {
        e.preventDefault();
        ouvrir(actif);
      } else if (e.key === "Escape" && ouvert) {
        e.preventDefault();
        fermer();
      }
    };
    const surSortie = () => setTimeout(fermer, 150);
    c.addEventListener("input", surFrappe);
    c.addEventListener("keydown", surTouche);
    c.addEventListener("blur", surSortie);
    return () => {
      c.removeEventListener("input", surFrappe);
      c.removeEventListener("keydown", surTouche);
      c.removeEventListener("blur", surSortie);
    };
  });
</script>

<div class="suggestions" hidden={!ouvert || suggestions.length === 0}>
  {#if correction}
    <p class="t-texte-petit correction">{remplir(textes.tuVoulaisDire, { nom: correction })}</p>
  {/if}
  <ul id={idListe} role="listbox" aria-label={textes.suggestions}>
    {#each suggestions as s, i (s.lien)}
      <li id={idOption(i)} role="option" aria-selected={i === actif} class:actif={i === actif} onmousedown={(e) => e.preventDefault()} onclick={() => ouvrir(i)}>
        <span class="option">
          <span class="nom t-libelle-normal">{s.nom}</span>
          {#if s.nom !== s.latin}<span class="latin t-texte-latin" lang="la">{s.latin}</span>{/if}
          <span class="meta t-mono-legende">
            <span class={`badge badge--${s.statut.toLowerCase()}`}><span class="visuellement-cache">{textes.statutUicn} </span>{s.statut}</span>
            {#if s.groupe}{s.groupe}{/if}
            {#if s.trouve}· « {s.trouve} »{/if}
          </span>
        </span>
      </li>
    {/each}
    <li
      id={idOption(suggestions.length)}
      role="option"
      aria-selected={actif === suggestions.length}
      class="tout"
      class:actif={actif === suggestions.length}
      onmousedown={(e) => e.preventDefault()}
      onclick={() => ouvrir(suggestions.length)}
    >
      <span class="option t-libelle-petit">{remplir(textes.voirTout, { q: texte })} <span aria-hidden="true">→</span></span>
    </li>
  </ul>
</div>
<p class="visuellement-cache" aria-live="polite">{annonce}</p>

<style>
  .suggestions {
    position: absolute;
    top: calc(100% + var(--space-2));
    left: 0;
    right: 0;
    z-index: 20;
    max-height: min(70vh, 520px);
    overflow-y: auto;
    border: 1px solid var(--color-border-strong);
    border-radius: var(--radius-md);
    background: var(--color-bg-surface);
    box-shadow: 0 12px 32px rgb(0 0 0 / 0.35);
    text-align: left;
  }
  .suggestions[hidden] {
    display: none;
  }
  .correction {
    margin: 0;
    padding: var(--space-3) var(--space-4) 0;
    color: var(--color-text-secondary);
  }
  ul {
    margin: 0;
    padding: var(--space-2) 0;
    list-style: none;
  }
  li {
    cursor: pointer;
  }
  .option {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: var(--space-2) var(--space-4);
    color: var(--color-text-primary);
  }
  li.actif .option,
  li:hover .option {
    background: var(--color-bg-surface-raised);
  }
  .latin,
  .meta {
    color: var(--color-text-secondary);
  }
  .meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
  }
  .tout {
    border-top: 1px solid var(--color-border-subtle);
    margin-top: var(--space-1);
  }
  .tout .option {
    flex-direction: row;
    gap: var(--space-1);
    color: var(--color-text-accent);
  }
  .badge {
    padding: 1px var(--space-1);
    border-radius: var(--radius-sm);
    font: 600 11px / 1.2 var(--font-mono);
  }
  .badge--cr { background: var(--color-status-cr); color: var(--color-status-on-cr); }
  .badge--en { background: var(--color-status-en); color: var(--color-status-on-en); }
  .badge--vu { background: var(--color-status-vu); color: var(--color-status-on-vu); }
  .badge--nt { background: var(--color-status-nt); color: var(--color-status-on-nt); }
  .badge--lc { background: var(--color-status-lc); color: var(--color-status-on-lc); }
  .badge--dd { background: var(--color-status-dd); color: var(--color-status-on-dd); }
  .badge--ex { background: var(--color-status-ex); color: var(--color-status-on-ex); }
  .badge--ew { background: var(--color-status-ew); color: var(--color-status-on-ew); }
  .badge--ne { border: 1px solid var(--color-border-strong); color: var(--color-text-secondary); }
</style>
