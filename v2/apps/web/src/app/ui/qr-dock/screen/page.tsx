import { QrFrame } from "../QrFrame";

/** شاشةُ المعرض داخل نافذتها — تُفتح من `/ui/qr-dock` في `iframe`، ولا تُقصَد وحدها. */
export default function QrDockScreen() {
  return <QrFrame />;
}
