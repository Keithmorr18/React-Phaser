import { useLab } from "../lab/store";
import { Btn } from "./ui";

const ROWS = [
  ["Espaço", "Play / pausar linha do tempo"],
  ["← →", "Quadro anterior / próximo"],
  ["1–9", "Trocar estado da lista"],
  ["G H O", "Grade / hitbox / origem"],
  ["F", "Espelhar X"],
  ["Tab E", "Estúdio / Arena (pelo toolbar)"],
  ["E", "Exportar"],
  ["?", "Este painel"],
  ["WASD", "Mover na Arena"],
  ["Shift / Espaço", "Correr / pular"],
  ["J / K / S", "Ataque / magia / agachar"],
  ["Alt + arrastar", "Pan na folha"],
  ["Scroll", "Zoom na folha"],
  ["Duplo clique", "Adicionar quadro à animação"],
];

export function HelpModal() {
  const { state, dispatch } = useLab();
  if (!state.ui.helpOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={() => dispatch({ type: "SET_UI", patch: { helpOpen: false } })}
    >
      <div
        className="w-[min(480px,92vw)] rounded-2xl border border-white/10 bg-[#0e1320] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Atalhos do laboratório</h2>
          <Btn onClick={() => dispatch({ type: "SET_UI", patch: { helpOpen: false } })}>fechar</Btn>
        </div>
        <div className="space-y-1">
          {ROWS.map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 rounded-md px-1 py-1 text-xs">
              <span className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[11px] text-cyan-200">{k}</span>
              <span className="text-zinc-400">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
