import { Container } from "./Container";

/** تذييل الموقع. */
export function Footer() {
  return (
    <footer className="border-t border-line">
      <Container className="py-8 text-center text-sm text-content-muted">
        نادي أَدِيب، جامعة الملك فيصل، <span className="font-latin">Adeeb Club</span>
      </Container>
    </footer>
  );
}
