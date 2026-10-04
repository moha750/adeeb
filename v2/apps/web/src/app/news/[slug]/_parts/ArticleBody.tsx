import { anchorId, type Block } from "@/lib/news/body";

/**
 * متنُ المقال — يرسم ما ردّه {@link parseBody} ولا يستدلّ بنفسه على شيء.
 *
 * **والفصلُ مقصود:** الاستدلالُ منطقٌ خالصٌ يُختبَر بلا متصفّح (`lib/news/body`)،
 * والرسمُ ههنا. فلو تبدّلت عادةُ المحرّرين يومًا لم يُمَسّ إلّا أحدُهما.
 */
export function ArticleBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="art-body">
      {blocks.map((b, i) => {
        if (b.kind === "heading") {
          return (
            <h2 key={i} id={anchorId(i)} className="art-h">
              {b.text}
            </h2>
          );
        }
        if (b.kind === "list") {
          return (
            <ul key={i} className="art-ul">
              {b.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          );
        }
        if (b.kind === "quote") {
          return (
            <blockquote key={i} className="art-quote">
              <p>{b.text}</p>
              {b.by ? <cite>{b.by}</cite> : null}
            </blockquote>
          );
        }
        return <p key={i}>{b.text}</p>;
      })}
    </div>
  );
}
