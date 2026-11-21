import Link from "next/link";

export function Marca({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="marca">
      <span className="marca-icone" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M8 1v3M8 6.5v3M8 12v3" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </span>
      Rodagem
    </Link>
  );
}
