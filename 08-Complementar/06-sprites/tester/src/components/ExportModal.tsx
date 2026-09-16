import { useMemo, useState } from "react";
import { useLab } from "../lab/store";
import { buildExports, pretty } from "../lab/export";
import { downloadBlob, downloadDataUrl } from "../lab/geometry";
import { Btn } from "./ui";
import { cn } from "../utils/cn";

const TABS = [
  { id: "project", label: "Projeto" },
  { id: "phaser", label: "Phaser Anims" },
  { id: "atlas", label: "Atlas Hash" },
  { id: "code", label: "Código" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function ExportModal() {
  const { state, frames, dispatch } = useLab();
  const [tab, setTab] = useState<TabId>("project");
  const [copied, setCopied] = useState(false);
  const bundle = useMemo(() => buildExports(state, frames, true), [state, frames]);

  if (!state.ui.exportOpen) return null;

  const texts: Record<TabId, string> = {
    project: pretty(bundle.project),
    phaser: pretty(bundle.phaserAnims),
    atlas: pretty(bundle.atlasHash),
    code: bundle.snippet,
  };
  const names: Record<TabId, string> = {
    project: "sprite-lab-project.json",
    phaser: "phaser-anims.json",
    atlas: "atlas.json",
    code: "phaser-snippet.js",
  };

  async function copy() {
    await navigator.clipboard.writeText(texts[tab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6"
      onClick={() => dispatch({ type: "SET_UI", patch: { exportOpen: false } })}
    >
      <div
        className="flex h-[min(720px,90vh)] w-[min(860px,94vw)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0e1320] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
          <div>
            <div className="text-sm font-semibold text-white">Exportar animação</div>
            <div className="text-[11px] text-zinc-500">JSON pronto para jogos web com Phaser, atlas e round-trip do laboratório.</div>
          </div>
          <Btn onClick={() => dispatch({ type: "SET_UI", patch: { exportOpen: false } })}>fechar</Btn>
        </div>
        <div className="flex gap-1 border-b border-white/8 px-3 pt-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-t-md px-3 py-1.5 text-xs",
                tab === t.id ? "bg-white/8 text-cyan-200" : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <pre className="min-h-0 flex-1 overflow-auto p-4 font-mono text-[11px] leading-relaxed text-cyan-100/80">
          {texts[tab]}
        </pre>
        <div className="flex flex-wrap items-center gap-2 border-t border-white/8 px-4 py-3">
          <Btn variant="cyan" onClick={copy}>
            {copied ? "copiado" : "copiar"}
          </Btn>
          <Btn variant="solid" onClick={() => downloadBlob(names[tab], texts[tab], tab === "code" ? "text/javascript" : "application/json")}>
            baixar JSON
          </Btn>
          {state.asset && (
            <Btn variant="solid" onClick={() => downloadDataUrl(`${(state.asset?.name || "sprite").replace(/\s+/g, "_")}.png`, state.asset!.dataUrl)}>
              baixar PNG
            </Btn>
          )}
          <Btn
            variant="ghost"
            onClick={() => {
              const pack = pretty({
                ...bundle.project,
                phaser: bundle.phaserAnims,
                atlas: bundle.atlasHash,
                snippet: bundle.snippet,
              });
              downloadBlob("sprite-lab-pack.json", pack);
            }}
          >
            pack completo
          </Btn>
        </div>
      </div>
    </div>
  );
}
