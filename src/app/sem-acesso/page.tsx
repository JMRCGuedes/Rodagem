import { sair } from "@/modules/contas/actions";

export default function SemAcesso() {
  return (
    <div className="publico">
      <div className="publico-caixa">
        <div className="cartao">
          <h1>Sem acesso</h1>
          <p className="muted" style={{ margin: "8px 0 16px" }}>
            A tua conta ainda não tem nenhum perfil. Pede ao gerente da empresa para te dar acesso.
          </p>
          <form action={sair}>
            <button type="submit" className="btn btn-secundario">
              Sair
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
