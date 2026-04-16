"use client";

import { Address } from "@scaffold-ui/components";
import { formatEther } from "viem";
import { useScaffoldEventHistory } from "~~/hooks/scaffold-eth";

export function PastRaids() {
  // Known issue: fromBlock: 0n scans from genesis. Works for a freshly deployed contract but will slow
  // as the chain grows. Anchor fromBlock to the deploy block in a future iteration.
  const { data: completeEvents, isLoading } = useScaffoldEventHistory({
    contractName: "BossSlayer",
    eventName: "RaidComplete",
    watch: true,
    fromBlock: 0n,
    blockData: false,
  });

  const rows = (completeEvents ?? []).slice().reverse();

  return (
    <div className="card bg-base-100 border border-base-300 shadow-md">
      <div className="card-body p-4">
        <h3 className="card-title text-sm uppercase tracking-widest opacity-70">
          <span>📜</span>
          Past Raids
        </h3>
        {isLoading ? (
          <div className="text-center opacity-50 py-6 text-sm">
            <span className="loading loading-spinner loading-sm"></span>
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center opacity-50 py-6 text-sm">No raids cleared yet. The boss awaits.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th className="text-[10px] uppercase opacity-60">Raid</th>
                  <th className="text-[10px] uppercase opacity-60 text-right">Pot</th>
                  <th className="text-[10px] uppercase opacity-60">Final Blow</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row: any, i) => {
                  const args = row.args ?? {};
                  return (
                    <tr key={`${row.transactionHash}-${i}`}>
                      <td className="font-mono">#{args.raidId?.toString() ?? "?"}</td>
                      <td className="font-mono text-right text-success">
                        {Number(formatEther(args.pot ?? 0n)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                      </td>
                      <td>
                        {args.finalBlowWallet && (
                          <Address address={args.finalBlowWallet} format="short" size="xs" onlyEnsOrAddress />
                        )}
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
