// Aide-mémoire : l'essentiel des règles de D&D 2024 sur une page, à garder ouverte pendant la partie.
// Composant serveur, statique. Résumés en français du SRD 5.2 (CC-BY-4.0), distances en mètres.
// Chaque section est un <details> ouvert : sur téléphone, on replie ce qui ne sert pas.
import type { ReactNode } from "react";

export const AIDE_MEMOIRE_TOOL_ID = "aide-memoire";

type Section = { id: string; title: string; tag: string; wide?: boolean; body: ReactNode };

const ACTIONS: [string, string][] = [
  ["Attaque", "Une attaque avec une arme ou à mains nues (plus avec Attaque supplémentaire). La lutte et la bousculade passent par là."],
  ["Magie", "Lancer un sort qui prend une action, ou utiliser un objet magique."],
  ["Foncer", "Ta vitesse est doublée pour ce tour."],
  ["Se désengager", "Ton déplacement ne provoque pas d'attaques d'opportunité ce tour."],
  ["Esquiver", "Jusqu'à ton prochain tour : attaques contre toi avec désavantage, avantage à tes sauvegardes de Dextérité."],
  ["Aider", "Un allié a l'avantage à son prochain test, ou à sa prochaine attaque contre une cible proche de toi."],
  ["Se cacher", "Test de Dextérité (Discrétion) DD 15, hors de vue. Réussi : tu es invisible jusqu'à ce qu'on te trouve."],
  ["Chercher", "Test de Sagesse : Perception, Perspicacité, Médecine ou Survie."],
  ["Étudier", "Test d'Intelligence : Arcanes, Histoire, Investigation, Nature ou Religion."],
  ["Influencer", "Test de Charisme (ou de Sagesse) pour convaincre, tromper ou intimider."],
  ["Utiliser un objet", "Un objet qui demande une action : potion, kit, levier."],
  ["Se tenir prêt", "Choisis un déclencheur et une action : tu l'exécutes avec ta réaction quand il se produit."],
];

const CONDITIONS: [string, string][] = [
  ["À terre", "Ramper ou se relever (moitié de la vitesse). Tes attaques : désavantage. Contre toi : avantage à 1,5 m, désavantage au-delà."],
  ["Agrippé", "Vitesse 0. Désavantage à tes attaques contre d'autres cibles que celui qui t'agrippe."],
  ["Assourdi", "Tu n'entends rien ; les tests qui demandent l'ouïe échouent."],
  ["Aveuglé", "Tes attaques : désavantage. Contre toi : avantage. Les tests qui demandent la vue échouent."],
  ["Charmé", "Tu ne peux pas t'en prendre à ton charmeur ; il a l'avantage en social contre toi."],
  ["Effrayé", "Désavantage aux tests et attaques tant que la source est en vue ; tu ne peux pas t'en approcher."],
  ["Empoisonné", "Désavantage aux jets d'attaque et aux tests de caractéristique."],
  ["Entravé", "Vitesse 0. Tes attaques et sauvegardes de Dextérité : désavantage. Contre toi : avantage."],
  ["Épuisement", "Niveaux 1 à 6 : −2 aux tests d20 et −1,5 m de vitesse par niveau. Mort au niveau 6. Un repos long en retire un."],
  ["Étourdi", "Neutralisé, sauvegardes de Force et de Dextérité ratées, attaques contre toi avec avantage."],
  ["Inconscient", "Neutralisé et à terre, tu lâches tout. Avantage contre toi, coup critique à 1,5 m."],
  ["Invisible", "Tes attaques : avantage. Contre toi : désavantage, sauf si on te voit."],
  ["Neutralisé", "Ni action, ni action bonus, ni réaction ; concentration rompue, tu ne parles plus."],
  ["Paralysé", "Neutralisé, vitesse 0, sauvegardes de Force et de Dextérité ratées. Avantage contre toi, coup critique à 1,5 m."],
  ["Pétrifié", "Changé en pierre : neutralisé, vitesse 0, résistance à tous les dégâts, avantage contre toi."],
];

const SECTIONS: Section[] = [
  {
    id: "tour",
    title: "Ton tour",
    tag: "Combat",
    body: (
      <ul className="am-list">
        <li><b>Déplacement</b> jusqu&apos;à ta vitesse, que tu peux couper avant et après ton action.</li>
        <li><b>1 action</b> (voir la liste).</li>
        <li><b>1 action bonus</b>, seulement si une capacité ou un sort t&apos;en donne une.</li>
        <li><b>1 interaction gratuite</b> avec un objet : dégainer, ouvrir une porte, ramasser.</li>
        <li><b>1 réaction par round</b>, même hors de ton tour : attaque d&apos;opportunité, Bouclier…</li>
        <li><b>Parler</b> brièvement, quand tu veux.</li>
      </ul>
    ),
  },
  {
    id: "actions",
    title: "Les actions",
    tag: "1 par tour",
    body: (
      <dl className="am-kv">
        {ACTIONS.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    ),
  },
  {
    id: "jets",
    title: "Jets et DD",
    tag: "d20",
    body: (
      <>
        <ul className="am-list">
          <li><b>d20 + modificateur</b> (+ maîtrise si tu es formé) ≥ DD : réussite.</li>
          <li><b>Avantage</b> : 2d20, garde le meilleur. <b>Désavantage</b> : garde le pire. Les deux s&apos;annulent.</li>
          <li><b>20 naturel</b> en attaque : coup critique, les dés de dégâts sont doublés. <b>1 naturel</b> : raté.</li>
        </ul>
        <div className="am-pills">
          {["5 très facile", "10 facile", "15 moyen", "20 difficile", "25 très difficile", "30 quasi impossible"].map((p) => (
            <span key={p} className="am-pill">{p}</span>
          ))}
        </div>
      </>
    ),
  },
  {
    id: "couverture",
    title: "Couverture",
    tag: "Défense",
    body: (
      <dl className="am-kv">
        <div><dt>Demi</dt><dd>+2 à la CA et aux sauvegardes de Dextérité (muret, allié, tronc).</dd></div>
        <div><dt>Trois-quarts</dt><dd>+5 à la CA et aux sauvegardes de Dextérité (meurtrière, gros arbre).</dd></div>
        <div><dt>Totale</dt><dd>On ne peut pas te cibler directement.</dd></div>
      </dl>
    ),
  },
  {
    id: "concentration",
    title: "Concentration",
    tag: "Sorts",
    body: (
      <ul className="am-list">
        <li><b>Un seul</b> sort de concentration à la fois : en lancer un autre met fin au premier.</li>
        <li><b>Dégâts subis</b> : sauvegarde de Constitution, DD 10 ou la moitié des dégâts (maximum 30). Raté : le sort s&apos;arrête.</li>
        <li>Elle cesse si tu es <b>neutralisé</b> ou si tu meurs.</li>
      </ul>
    ),
  },
  {
    id: "mort",
    title: "0 PV et mort",
    tag: "Survie",
    body: (
      <ul className="am-list">
        <li>À 0 PV, tu tombes <b>inconscient</b>.</li>
        <li>Au début de chacun de tes tours : <b>jet contre la mort</b>, d20. 10 ou plus = réussite.</li>
        <li><b>3 réussites</b> : tu es stable. <b>3 échecs</b> : tu meurs.</li>
        <li><b>20 naturel</b> : tu reviens à 1 PV. <b>1 naturel</b> : deux échecs.</li>
        <li>Subir des dégâts à 0 PV : un échec (deux sur un coup critique).</li>
        <li>Le moindre soin te relève avec les PV rendus.</li>
      </ul>
    ),
  },
  {
    id: "repos",
    title: "Repos",
    tag: "Récupérer",
    body: (
      <dl className="am-kv">
        <div><dt>Court</dt><dd>1 heure. Dépense des dés de vie : chacun rend son résultat + ton modificateur de Constitution.</dd></div>
        <div><dt>Long</dt><dd>8 heures (dont 6 de sommeil). Tous tes PV, tous tes dés de vie, tes emplacements de sorts, et −1 niveau d&apos;épuisement. Un seul par 24 heures.</dd></div>
      </dl>
    ),
  },
  {
    id: "opportunite",
    title: "Attaque d'opportunité",
    tag: "Réaction",
    body: (
      <p className="am-p">
        Quand un ennemi que tu vois <b>sort de ton allonge</b>, tu peux utiliser ta réaction pour une attaque au corps à corps contre lui. Se désengager ou
        se téléporter l&apos;évite.
      </p>
    ),
  },
  {
    id: "etats",
    title: "Les 15 états",
    tag: "En une ligne",
    wide: true,
    body: (
      <div className="am-conds">
        {CONDITIONS.map(([k, v]) => (
          <div key={k} id={`etat-${k.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z]+/g, "-")}`} className="am-cond">
            <strong>{k}</strong>
            <span>{v}</span>
          </div>
        ))}
      </div>
    ),
  },
];

export default function AideMemoire() {
  return (
    <div className="am-root stack-lg">
      <header className="stack-xs">
        <p className="eyebrow">Règles 2024 · une page à garder ouverte</p>
        <h1 className="title">Aide-mémoire</h1>
        <p className="muted">
          L&apos;essentiel des règles pour jouer sans chercher : ton tour, les actions, les jets, la mort et les états. Distances en mètres (1 case = 1,5 m).
          Pour les sorts, ouvre le{" "}
          <a className="text-link" href="/outils/grimoire">
            Grimoire
          </a>
          .
        </p>
      </header>

      <nav aria-label="Aller à" className="am-jumps">
        {SECTIONS.map((s) => (
          <a key={s.id} className="am-jump" href={`#am-${s.id}`}>
            {s.title}
          </a>
        ))}
      </nav>

      <div className="am-grid">
        {SECTIONS.map((s) => (
          <details key={s.id} id={`am-${s.id}`} className={`am-card${s.wide ? " wide" : ""}`} open>
            <summary>
              <h2>{s.title}</h2>
              <span className="am-tag">{s.tag}</span>
            </summary>
            <div className="am-body">{s.body}</div>
          </details>
        ))}
      </div>

      <p className="gm-license">
        Résumé en français des règles du System Reference Document 5.2 de Wizards of the Coast LLC, publié sous licence Creative Commons Attribution 4.0
        (CC-BY-4.0).
      </p>
    </div>
  );
}
