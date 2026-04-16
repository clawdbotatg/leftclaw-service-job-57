"use client";

import { formatEther } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

const STATE = {
  HEALTHY: { label: "HEALTHY", art: "😈", glow: "from-emerald-500/30 to-emerald-900/10", bar: "bg-emerald-500" },
  DAMAGED: { label: "DAMAGED", art: "👹", glow: "from-amber-500/30 to-amber-900/10", bar: "bg-amber-500" },
  NEAR_DEATH: { label: "NEAR DEATH", art: "💀", glow: "from-rose-600/40 to-rose-900/10", bar: "bg-rose-500" },
} as const;

function getBossState(hp: bigint, maxHp: bigint) {
  if (maxHp === 0n) return STATE.HEALTHY;
  const pct = Number((hp * 100n) / maxHp);
  if (pct > 66) return STATE.HEALTHY;
  if (pct > 33) return STATE.DAMAGED;
  return STATE.NEAR_DEATH;
}

export function BossPanel() {
  const { data: raidInfo } = useScaffoldReadContract({
    contractName: "BossSlayer",
    functionName: "getRaidInfo",
    watch: true,
  });

  const raidId = raidInfo?.[0] ?? 0n;
  const bossHP = raidInfo?.[1] ?? 0n;
  const bossMaxHP = raidInfo?.[2] ?? 0n;
  const pot = raidInfo?.[3] ?? 0n;
  const attackerCount = raidInfo?.[4] ?? 0n;
  const raidActive = raidInfo?.[5] ?? false;

  const state = getBossState(bossHP, bossMaxHP);
  const pct = bossMaxHP > 0n ? Number((bossHP * 10000n) / bossMaxHP) / 100 : 0;

  return (
    <div className={`card bg-gradient-to-b ${state.glow} border border-base-300 shadow-xl`}>
      <div className="card-body gap-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-widest opacity-70">
          <span>Raid #{raidId.toString()}</span>
          <span className={raidActive ? "text-success" : "text-error"}>{raidActive ? "● LIVE" : "○ INTERMISSION"}</span>
        </div>

        <div className="flex flex-col items-center justify-center py-6 select-none">
          <div
            className={`text-[9rem] leading-none drop-shadow-[0_0_40px_rgba(239,68,68,0.4)] ${!raidActive ? "grayscale opacity-50" : ""}`}
          >
            {state.art}
          </div>
          <div className="mt-2 text-sm font-black tracking-[0.4em] opacity-80">{state.label}</div>
        </div>

        <div className="space-y-1">
          <div className="flex items-baseline justify-between text-sm">
            <span className="font-mono font-bold">{bossHP.toString()} HP</span>
            <span className="opacity-60 font-mono">/ {bossMaxHP.toString()}</span>
          </div>
          <div className="w-full bg-base-300 rounded-full h-4 overflow-hidden border border-base-content/10">
            <div
              className={`h-full ${state.bar} transition-all duration-500 shadow-[inset_0_0_10px_rgba(0,0,0,0.3)]`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div className="stat bg-base-200 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-widest opacity-60">Prize pot</div>
            <div className="text-xl font-mono font-bold text-primary">
              {Number(formatEther(pot)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] opacity-50">CLAWD</div>
          </div>
          <div className="stat bg-base-200 rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-widest opacity-60">Slayers in</div>
            <div className="text-xl font-mono font-bold">{attackerCount.toString()}</div>
            <div className="text-[10px] opacity-50">unique wallets</div>
          </div>
        </div>
      </div>
    </div>
  );
}
