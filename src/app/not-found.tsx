import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="publico">
      <div className="publico-caixa">
        <div className="cartao">
          <h1>Página não encontrada</h1>
          <p className="muted" style={{ margin: "8px 0 16px" }}>
            O registo pode ter sido apagado ou o endereço está errado.
          </p>
          <Link href="/" className="btn btn-primario">
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
