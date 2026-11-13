import type { ReactNode } from 'react';
import type { Doc } from '../lib/types';

/** Remplace {{n}} par un blanc numéroté (rempli avec la réponse choisie) et [n] par un repère de position */
function renderBody(body: string, blankLabel?: (n: number) => ReactNode): ReactNode[] {
  return body.split('\n').map((para, pi) => {
    const parts = para.split(/(\{\{\d\}\}|\[\d\])/g).map((chunk, i) => {
      const b = chunk.match(/^\{\{(\d)\}\}$/);
      if (b) return <span key={i} className="blank">{blankLabel ? blankLabel(Number(b[1])) : `(${b[1]})`}</span>;
      const p = chunk.match(/^\[(\d)\]$/);
      if (p) return <span key={i} className="mx-0.5 inline-grid h-5 min-w-5 place-items-center rounded bg-primary-soft px-1 text-xs font-bold text-primary">[{p[1]}]</span>;
      return chunk;
    });
    return para.trim() ? <p key={pi}>{parts}</p> : <div key={pi} className="h-1" />;
  });
}

export function DocView({ doc, blankLabel }: { doc: Doc; blankLabel?: (n: number) => ReactNode }) {
  const wrap = 'rounded-2xl border border-line bg-surface p-4 text-[15px] leading-relaxed prose-doc';
  switch (doc.type) {
    case 'email':
      return (
        <article className={wrap}>
          <dl className="mb-3 grid grid-cols-[auto,1fr] gap-x-3 gap-y-0.5 border-b border-line pb-3 text-sm">
            <dt className="font-semibold text-muted">From:</dt><dd>{doc.from}</dd>
            <dt className="font-semibold text-muted">To:</dt><dd>{doc.to}</dd>
            {doc.date && (<><dt className="font-semibold text-muted">Date:</dt><dd>{doc.date}</dd></>)}
            <dt className="font-semibold text-muted">Subject:</dt><dd className="font-medium">{doc.subject}</dd>
          </dl>
          {renderBody(doc.body, blankLabel)}
        </article>
      );
    case 'text':
      return (
        <article className={wrap}>
          {doc.title && <h3 className="mb-1 text-base font-bold">{doc.title}</h3>}
          {doc.subtitle && <p className="mb-2 text-xs text-muted">{doc.subtitle}</p>}
          {renderBody(doc.body, blankLabel)}
        </article>
      );
    case 'form':
      return (
        <article className={wrap}>
          {doc.title && <h3 className="mb-2 text-base font-bold">{doc.title}</h3>}
          <dl className="mb-2 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 text-sm">
            {doc.fields.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="font-semibold text-muted">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
          {doc.body && <div className="border-t border-line pt-2">{renderBody(doc.body, blankLabel)}</div>}
        </article>
      );
    case 'table':
      return (
        <article className={wrap + ' overflow-x-auto'}>
          {doc.title && <h3 className="mb-2 text-sm font-bold">{doc.title}</h3>}
          <table className="w-full min-w-[280px] border-collapse text-sm">
            <thead>
              <tr>{doc.columns.map((c) => <th key={c} className="border-b border-line px-2 py-1.5 text-left font-semibold text-muted">{c}</th>)}</tr>
            </thead>
            <tbody>
              {doc.rows.map((r, i) => (
                <tr key={i} className="odd:bg-surface-2/60">
                  {r.map((c, j) => <td key={j} className="px-2 py-1.5 align-top">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          {doc.note && <p className="mt-2 text-xs text-muted">{doc.note}</p>}
        </article>
      );
    case 'chat':
      return (
        <article className={wrap + ' space-y-2'}>
          {doc.messages.map((m, i) => (
            <div key={i} className="rounded-xl bg-surface-2 px-3 py-2">
              <div className="flex justify-between text-xs"><span className="font-bold">{m.name}</span><span className="text-muted">[{m.time}]</span></div>
              <p className="m-0 text-[15px]">{m.text}</p>
            </div>
          ))}
        </article>
      );
  }
}
