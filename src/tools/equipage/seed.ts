// Ce fichier ne doit être importé que par actions.ts ("use server") : ainsi il ne part jamais dans le code client.
// Équipage proposé pour démarrer (le MJ le retouche ensuite).
// Serveur uniquement : les notes du MJ (secrets, fausses pistes) ne doivent jamais arriver dans le code client.

export type CrewSeed = { name: string; nickname: string; role: string; trait: string; notes: string };

export const CREW_SEED: CrewSeed[] = [
  {
    name: "Odile Varenne",
    nickname: "",
    role: "Capitaine (nommée par la compagnie)",
    trait: "Tient ses registres au gramme près et cite le règlement de la compagnie de mémoire.",
    notes: "L'œil de la compagnie à bord : le premier danger pour un contrebandier.",
  },
  {
    name: "Brann",
    nickname: "Coque-Fendue",
    role: "Maître d'équipage",
    trait: "Vieux loup à la voix qui porte. Bougonne contre « les gratte-papier de la compagnie ».",
    notes: "Loyauté absolue envers l'équipage, pas envers la compagnie.",
  },
  {
    name: "Tobie Lasalle",
    nickname: "Fil-de-Sel",
    role: "Cambusier, vivres et cargaisons",
    trait: "Aimable, toujours un service à rendre. Il a « un cousin dans chaque port ».",
    notes: "Le contrebandier. Son poste justifie qu'il manipule les cargaisons et descende à terre à chaque escale.",
  },
  {
    name: "Gaspard Ronce",
    nickname: "",
    role: "Charpentier",
    trait: "Superstitieux : il parle à la coque et refuse qu'on siffle à bord.",
    notes: "",
  },
  {
    name: "Agathe",
    nickname: "Mère Agathe",
    role: "Cuisinière",
    trait: "Note des « recettes » dans un carnet qu'elle ne prête jamais.",
    notes: "Fausse piste : ce sont vraiment des recettes, celles de sa défunte femme.",
  },
  {
    name: "Nilo",
    nickname: "",
    role: "Vigie",
    trait: "Jeune, les yeux perçants, grimpe partout plus vite que les autres ne marchent.",
    notes: "Fausse piste : il disparaît certaines nuits d'escale, pour retrouver quelqu'un qu'il aime.",
  },
  {
    name: "Isaure Delorme",
    nickname: "",
    role: "Timonière",
    trait: "Taciturne, ancienne de la marine. Un tatouage à moitié effacé sur l'avant-bras.",
    notes: "Fausse piste : elle a déserté la marine, sans rapport avec la contrebande.",
  },
  {
    name: "Pip",
    nickname: "",
    role: "Mousse",
    trait: "Curieux, bavard, toujours là où on ne l'attend pas.",
    notes: "Pourrait remarquer un jour des caisses absentes du registre : porte de sortie si le secret doit éclater.",
  },
];
