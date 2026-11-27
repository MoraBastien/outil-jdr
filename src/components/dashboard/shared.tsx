// Petites pièces communes aux tableaux de bord joueur et MJ : icônes au trait, dates, compte à rebours, frise de route.
import type { CSSProperties } from "react";
import type { PlayerDashboard as Data } from "@/lib/dashboard";
import { tableToday } from "@/tools/planning/summary";

/** Icône au trait (même dessin que la navigation). */
export const Glyph = ({ d, size = 15 }: { d: string; size?: number }) => (
  <svg className="nv-glyph" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
export const ANCHOR = "M12 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM12 8v13M8 12h8M5 15a7 7 0 0 0 14 0";
export const CHECK = "M5 12.5l4.2 4.2L19 7";
export const ARROW = "M5 12h14M13 6l6 6-6 6";
export const STAR = "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z";

export const fmtDay = (date: string) => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
export const fmtShortDay = (date: string) => new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
export const fmtMonth = (date: string) => new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
export const daysUntil = (date: string) => Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${tableToday()}T12:00:00Z`)) / 86_400_000);
export const ago = (iso: string) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "hier" : `il y a ${d} j`;
};
/** Minutes avant le début d'une séance (heure de la table, Europe/Paris). */
const minutesUntil = (date: string, start: string) => {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const now = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`);
  return Math.round((Date.parse(`${date}T${start}:00Z`) - now) / 60_000);
};
/** « Dans 3 h », « Dans 40 min », « En cours » le jour même ; sinon « Demain », « Dans 4 jours ». */
export const countdown = (days: number | null, date: string, start: string) => {
  if (days === null) return "";
  if (days > 1) return `Dans ${days} jours`;
  if (days === 1) return "Demain";
  const m = minutesUntil(date, start);
  if (m <= 0) return m > -240 ? "En cours" : "Ce soir";
  if (m < 60) return `Dans ${m} min`;
  const h = Math.floor(m / 60);
  return `Dans ${h} h${m % 60 >= 30 && h < 3 ? " 30" : ""}`;
};
export const isle = (color: string) => ({ ["--isle-c" as string]: color }) as CSSProperties;
export const hour = (start: string) => start.replace(":", " h ").replace(/ 00$/, "").replace(" h 00", " h");

/** La route du Navire : une frise d'îles, le navire au mouillage file vers la prochaine escale. Partagée avec le tableau du MJ. */
export function Route({ data }: { data: Pick<Data, "route" | "nextIsland"> }) {
  type Stop = Data["route"][number] & { kind: "here" | "past" | "next" };
  const stops: Stop[] = data.route.map((r) => ({ ...r, kind: r.here ? "here" : "past" }));
  if (data.nextIsland && !stops.some((s) => s.id === data.nextIsland!.id)) stops.push({ ...data.nextIsland, here: false, kind: "next" as const });
  const shown = stops.slice(-6);
  const nextIndex = shown.findIndex((s) => s.kind === "next");
  return (
    <div className="nv-route" role="group" aria-label="La route du Navire">
      <ol style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
        {shown.map((s, i) => (
          <li key={`${s.id}-${i}`} className={`nv-stop ${s.kind}${i === shown.length - 1 ? " last" : ""}${nextIndex > 0 && i === nextIndex - 1 ? " before-next" : ""}`} style={isle(s.color)}>
            <span className="nv-stop-isle" aria-hidden="true" />
            <span className="nv-stop-name" title={s.name}>{s.name}</span>
            <span className="nv-stop-note">{s.kind === "here" ? "le Navire y mouille" : s.kind === "next" ? "prochaine escale" : `escale ${i + 1 + (stops.length - shown.length)}`}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Regroupe les lignes d'activité par moment (« il y a 7 h », « hier »…), dans l'ordre. */
export function groupByAgo<T extends { at: string }>(items: T[]): { label: string; items: T[] }[] {
  const out: { label: string; items: T[] }[] = [];
  for (const it of items) {
    const label = ago(it.at);
    const last = out.at(-1);
    if (last && last.label === label) last.items.push(it);
    else out.push({ label, items: [it] });
  }
  return out.map((g) => ({ ...g, label: g.label.charAt(0).toUpperCase() + g.label.slice(1) }));
}

/** « Test n'a pas répondu », « Test et Lyra n'ont pas répondu » ; au-delà de 3 : « 4 autres sans réponse ». */
export function missingLine(names: string[], meToo: boolean): string {
  if (names.length > 3) return `${names.length} ${meToo ? "autres " : ""}sans réponse`;
  const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} et ${names.at(-1)}`;
  return `${meToo ? "Comme toi, " : ""}${list} ${names.length > 1 ? "n'ont" : "n'a"} pas encore répondu`;
}

export function clip(text: string, n: number) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : `${t.slice(0, n).replace(/\s+\S*$/, "")}…`;
}
