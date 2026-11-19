// Feuille de style personnelle : le thème « Astre déchu » des joueurs de l'Atelier (voir tools/homunculus/astral).
// Servie seulement à eux (session vérifiée) : les autres joueurs reçoivent une feuille vide.
import { getSessionUserId } from "@/lib/session";
import { getUserById } from "@/lib/db";
import { entitySheetOf } from "@/tools/homunculus/entity";
import { astralCss } from "@/tools/homunculus/astral/theme";

export async function GET() {
  const id = await getSessionUserId();
  const user = id ? await getUserById(id) : null;
  const entity = user ? entitySheetOf(user) : null;
  return new Response(entity ? astralCss(entity.echo) : "", {
    headers: { "content-type": "text/css; charset=utf-8", "cache-control": "private, no-cache" },
  });
}
