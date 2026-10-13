import { redirect } from "next/navigation";

// معرضُ «أنظمة أدِيب» صار الصفحةَ العلنيّة نفسَها (اعتمدها المالك ٢٠٢٦-١٠-١٣)، فرابطُه القديمُ يُحوَّل إليها.
export default function RegulationsGallery() {
  redirect("/regulations");
}
