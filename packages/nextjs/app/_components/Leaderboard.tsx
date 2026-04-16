"use client";

import { Address } from "@scaffold-ui/components";
import { formatEther } from "viem";
import { useScaffoldReadContract } from "~~/hooks/scaffold-eth";

export function Leaderboard() {
  const { data: lb } = useScaffoldReadContract({
    contractName: "BossSlayer",
    functionName: "getLeaderboard",
    args: [10n],
    watch: true,
  });

  const { data: raidInfo } = useScaffoldReadContract({
    contractName: "BossSlayer",
    functionName: "getRaidInfo",
    watch: true,
  });
  const pot = raidInfo?.[3] ?? 0n;

  const { data: totalDamage } = useScaffoldReadContract({
    contractName: "BossSlayer",
    functionName: "totalDamageDealt",
    watch: true,
  });

  const wallets = lb?.[0] ?? [];
  const damages = lb?.[1] ?? [];

  return (
    <div className="card bg-base-100 border border-base-300 shadow-md">
      <div className="card-body p-4">
        <h3 className="card-title text-sm uppercase tracking-widest opacity-70">
          <span>🏆</span>
          Leaderboard
        </h3>
        {wallets.length === 0 ? (
          <div className="text-center opacity-50 py-6 text-sm">No slayers yet. Be the first.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th className="text-[10px] uppercase opacity-60">#</th>
                  <th className="text-[10px] uppercase opacity-60">Slayer</th>
                  <th className="text-[10px] uppercase opacity-60 text-right">DMG</th>
                  <th className="text-[10px] uppercase opacity-60 text-right">Est. Heavy</th>
                </tr>
              </thead>
              <tbody>
                {wallets.map((w, i) => {
                  const dmg = damages[i] ?? 0n;
                  const heavy = totalDamage && totalDamage > 0n ? (((pot * 50n) / 100n) * dmg) / totalDamage : 0n;
                  return (
                    <tr key={w}>
                      <td className="font-mono font-bold">{i + 1}</td>
                      <td>
                        <Address address={w} format="short" size="sm" onlyEnsOrAddress />
                      </td>
                      <td className="font-mono text-right">{dmg.toString()}</td>
                      <td className="font-mono text-right text-success text-xs">
                        {Number(formatEther(heavy)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
