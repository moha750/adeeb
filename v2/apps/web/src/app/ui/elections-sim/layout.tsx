import "@adeeb/design-system/ad.css";

/**
 * **المحاكي يحمل ورقةَ الهويّة** (٢٠٢٦-١١-٢٠): شاشاتُه صارت غرفَ الهويّة نفسَها (`_ad/rooms/*`)، وأصنافُها في `ad.css`
 * التي تحملها اللوحةُ في تخطيطها؛ والمعرضُ (`/ui`) لا يحملها، فكانت الغرفُ تُرسم فيه بلا شكل.
 */
export default function ElectionsSimLayout({ children }: { children: React.ReactNode }) {
  return children;
}
