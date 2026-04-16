"use client";

import { useRef, useState } from "react";
import { Address } from "@scaffold-ui/components";
import { useScaffoldWatchContractEvent } from "~~/hooks/scaffold-eth";

type FeedItem = {
  id: string;
  kind: "attack" | "license" | "raidStart" | "raidComplete";
  wallet?: `0x${string}`;
  damage?: bigint;
  bossHP?: bigint;
  isCrit?: boolean;
  raidId?: bigint;
  pot?: bigint;
  ts: number;
};

const MAX_ITEMS = 40;

export function LiveFeed() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const counter = useRef(0);

  const pushItem = (item: Omit<FeedItem, "id" | "ts">) => {
    counter.current += 1;
    setItems(prev =>
      [{ ...item, id: `${Date.now()}-${counter.current}`, ts: Date.now() }, ...prev].slice(0, MAX_ITEMS),
    );
  };

  useScaffoldWatchContractEvent({
    contractName: "BossSlayer",
    eventName: "Attack",
    onLogs: logs => {
      logs.forEach(log => {
        const { raidId, attacker, damage, bossHP, isCrit } = (log as any).args ?? {};
        if (!attacker) return;
        pushItem({ kind: "attack", wallet: attacker, damage, bossHP, isCrit, raidId });
      });
    },
  });

  useScaffoldWatchContractEvent({
    contractName: "BossSlayer",
    eventName: "LicenseMinted",
    onLogs: logs => {
      logs.forEach(log => {
        const { wallet } = (log as any).args ?? {};
        if (!wallet) return;
        pushItem({ kind: "license", wallet });
      });
    },
  });

  useScaffoldWatchContractEvent({
    contractName: "BossSlayer",
    eventName: "RaidStarted",
    onLogs: logs => {
      logs.forEach(log => {
        const { raidId, newHP } = (log as any).args ?? {};
        pushItem({ kind: "raidStart", raidId, bossHP: newHP });
      });
    },
  });

  useScaffoldWatchContractEvent({
    contractName: "BossSlayer",
    eventName: "RaidComplete",
    onLogs: logs => {
      logs.forEach(log => {
        const { raidId, pot, finalBlowWallet } = (log as any).args ?? {};
        pushItem({ kind: "raidComplete", raidId, pot, wallet: finalBlowWallet });
      });
    },
  });

  return (
    <div className="card bg-base-100 border border-base-300 shadow-md">
      <div className="card-body p-4">
        <h3 className="card-title text-sm uppercase tracking-widest opacity-70">
          <span>📡</span>
          Live Feed
        </h3>
        <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
          {items.length === 0 ? (
            <div className="text-center opacity-40 py-6 text-sm">Waiting for attacks...</div>
          ) : (
            items.map(item => <FeedRow key={item.id} item={item} />)
          )}
        </div>
      </div>
    </div>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  if (item.kind === "attack") {
    return (
      <div
        className={`flex items-center justify-between text-xs gap-2 rounded px-2 py-1 ${item.isCrit ? "bg-success/20 border border-success/40" : "bg-base-200/50"}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {item.wallet && (
            <Address address={item.wallet} format="short" size="xs" onlyEnsOrAddress disableAddressLink />
          )}
          <span className={`font-mono ${item.isCrit ? "text-success font-bold" : ""}`}>
            -{item.damage?.toString()} {item.isCrit ? "CRIT!" : ""}
          </span>
        </div>
        <span className="opacity-60 font-mono">HP {item.bossHP?.toString()}</span>
      </div>
    );
  }
  if (item.kind === "license") {
    return (
      <div className="flex items-center gap-2 text-xs rounded px-2 py-1 bg-primary/10">
        <span>🪪</span>
        {item.wallet && <Address address={item.wallet} format="short" size="xs" onlyEnsOrAddress disableAddressLink />}
        <span className="opacity-70">minted a license</span>
      </div>
    );
  }
  if (item.kind === "raidStart") {
    return (
      <div className="text-xs rounded px-2 py-1 bg-info/10 text-info font-mono">
        ▲ Raid #{item.raidId?.toString()} started — {item.bossHP?.toString()} HP
      </div>
    );
  }
  if (item.kind === "raidComplete") {
    return (
      <div className="text-xs rounded px-2 py-1 bg-warning/10 text-warning flex items-center gap-2">
        <span>🏁 Raid #{item.raidId?.toString()} cleared</span>
        {item.wallet && (
          <>
            <span>· final blow:</span>
            <Address address={item.wallet} format="short" size="xs" onlyEnsOrAddress disableAddressLink />
          </>
        )}
      </div>
    );
  }
  return null;
}
