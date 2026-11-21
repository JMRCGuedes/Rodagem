/** Miniaturas das fotos de um serviço (guia CMR, avarias). Cada uma abre em tamanho real. */
export function Fotos({ ids }: { ids: string[] }) {
  return (
    <div className="fotos">
      {ids.map((id, i) => (
        <a key={id} href={`/api/anexos/${id}`} target="_blank" rel="noopener" className="foto">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`/api/anexos/${id}`} alt={`Fotografia ${i + 1} da guia`} loading="lazy" />
        </a>
      ))}
    </div>
  );
}
