// Constellation de l'entité : 8 étoiles, dont une part rallumée selon l'Écho, et un halo fendu
// autour de l'étoile-mère qui se referme à chaque Écho (le dieu déchu qui reprend ses pouvoirs).
// Pur SVG, utilisable côté serveur et client. Styles dans astralCss (classes .ec-*).

const PTS: [number, number][] = [[20, 90], [42, 60], [70, 70], [62, 34], [92, 22], [112, 48], [130, 30], [118, 86]];
const LINKS: [number, number][] = [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [5, 6], [5, 7], [2, 7]];
export const litStars = (echo: number) => [1, 3, 5, 8][Math.min(Math.max(echo, 1), 4) - 1];

export default function EntityConstellation({ echo, label }: { echo: number; label?: string }) {
  const n = litStars(echo);
  const gap = [140, 100, 55, 0][Math.min(Math.max(echo, 1), 4) - 1];
  const c = 2 * Math.PI * 12;
  return (
    <svg className="ec" viewBox="0 0 150 120" role="img" aria-label={label ?? `Constellation : ${n} étoiles sur 8 rallumées`}>
      {LINKS.map(([a, b]) => (
        <line key={`${a}-${b}`} className={`ec-line${a < n && b < n ? " on" : ""}`} x1={PTS[a][0]} y1={PTS[a][1]} x2={PTS[b][0]} y2={PTS[b][1]} />
      ))}
      {PTS.map(([x, y], i) => (
        <g key={i}>
          {i < n && <circle className="ec-glow" cx={x} cy={y} r={7} />}
          <circle className={`ec-star${i < n ? " on" : ""}`} cx={x} cy={y} r={i < n ? 2.8 : 2} />
        </g>
      ))}
      <circle
        className="ec-halo"
        cx={20}
        cy={90}
        r={12}
        strokeDasharray={gap ? `${(c * (360 - gap)) / 360} ${(c * gap) / 360}` : undefined}
        transform="rotate(-60 20 90)"
      />
    </svg>
  );
}
