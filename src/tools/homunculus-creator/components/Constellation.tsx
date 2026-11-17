import { CONSTELLATIONS } from "../data/constellations";

interface Props {
  constellationId: string;
  /** Une valeur par étape : l'étoile correspondante s'allume. */
  steps: boolean[];
}

/** Barre de progression : chaque étape terminée allume une étoile. Complète = tout est fini. */
export function Constellation({ constellationId, steps }: Props) {
  const c = CONSTELLATIONS.find((x) => x.id === constellationId) ?? CONSTELLATIONS[0];
  const n = steps.filter(Boolean).length;
  const full = n === steps.length;
  return (
    <svg
      className={"hc-orion" + (full ? " hc-complete" : "")}
      viewBox="0 0 200 250"
      role="img"
      aria-label={`Constellation ${c.nom} : ${n} étoiles allumées sur ${steps.length}`}
    >
      {c.lines.map(([a, b], i) => (
        <line
          key={i}
          className={"hc-ln" + (steps[a] && steps[b] ? " hc-on" : "")}
          x1={c.stars[a][0]}
          y1={c.stars[a][1]}
          x2={c.stars[b][0]}
          y2={c.stars[b][1]}
        />
      ))}
      {c.stars.map(([x, y], i) => (
        <g key={i}>
          <circle className={"hc-hl" + (steps[i] ? " hc-on" : "")} cx={x} cy={y} r={i === c.alphaIndex ? 13 : 10} />
          <circle
            className={"hc-st" + (i === c.alphaIndex ? " hc-alpha" : "") + (steps[i] ? " hc-on" : "")}
            cx={x}
            cy={y}
            r={i === c.alphaIndex ? 3.8 : 2.8}
          />
        </g>
      ))}
      <text x="100" y="222" textAnchor="middle">{c.nom}</text>
      <text x="100" y="240" textAnchor="middle">{full ? c.alpha : ""}</text>
    </svg>
  );
}
