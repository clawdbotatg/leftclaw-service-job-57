"use client";

import { useState } from "react";
import { parseEther } from "viem";
import { useAccount } from "wagmi";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

/** Admin-only panel. Only rendered when the connected wallet is the contract owner. */
export function OwnerPanel() {
  const { address } = useAccount();
  const [newHp, setNewHp] = useState("100000");
  const [bounty, setBounty] = useState("100000");

  const { data: owner } = useScaffoldReadContract({
    contractName: "BossSlayer",
    functionName: "owner",
  });

  const { data: bossSlayerInfo } = useDeployedContractInfo({ contractName: "BossSlayer" });
  const bossSlayerAddress = bossSlayerInfo?.address;

  const { data: allowance } = useScaffoldReadContract({
    contractName: "Clawd",
    functionName: "allowance",
    args: address && bossSlayerAddress ? [address, bossSlayerAddress] : [undefined, undefined],
    watch: true,
  });

  const { data: raidInfo } = useScaffoldReadContract({
    contractName: "BossSlayer",
    functionName: "getRaidInfo",
    watch: true,
  });
  const raidActive = raidInfo?.[5] ?? false;

  const { writeContractAsync: writeBoss, isMining } = useScaffoldWriteContract({ contractName: "BossSlayer" });
  const { writeContractAsync: approveClawd } = useScaffoldWriteContract({ contractName: "Clawd" });

  if (!address || !owner || address.toLowerCase() !== (owner as string).toLowerCase()) return null;

  const approve = async () => {
    if (!bossSlayerAddress) return;
    await approveClawd({ functionName: "approve", args: [bossSlayerAddress, 2n ** 256n - 1n] });
  };

  const handleStart = async () => {
    try {
      await writeBoss({ functionName: "startRaid", args: [BigInt(newHp || "0")] });
      notification.success("Raid started");
    } catch (e) {
      console.error(e);
    }
  };

  const handleInject = async () => {
    try {
      await writeBoss({ functionName: "injectBounty", args: [parseEther(bounty || "0")] });
      notification.success("Bounty injected");
    } catch (e) {
      console.error(e);
    }
  };

  const bountyAmount = parseEther(bounty || "0");
  const hasBountyAllowance = (allowance ?? 0n) >= bountyAmount;

  return (
    <div className="card bg-warning/5 border border-warning/40 shadow-md">
      <div className="card-body p-4 gap-2">
        <h3 className="card-title text-sm uppercase tracking-widest text-warning">
          <span>🛡️</span>
          Raid Master (Owner)
        </h3>

        <div className="space-y-2">
          <div className="text-xs opacity-70">Start a new raid (only when no raid is active)</div>
          <div className="join w-full">
            <input
              className="input input-bordered input-sm join-item flex-1 font-mono"
              type="number"
              value={newHp}
              onChange={e => setNewHp(e.target.value)}
              placeholder="New HP"
            />
            <button
              className="btn btn-warning btn-sm join-item"
              disabled={raidActive || isMining}
              onClick={handleStart}
            >
              Start Raid
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs opacity-70">Inject bounty (CLAWD) into active pot</div>
          <div className="join w-full">
            <input
              className="input input-bordered input-sm join-item flex-1 font-mono"
              type="number"
              value={bounty}
              onChange={e => setBounty(e.target.value)}
              placeholder="CLAWD amount"
            />
            {hasBountyAllowance ? (
              <button
                className="btn btn-warning btn-sm join-item"
                disabled={!raidActive || isMining}
                onClick={handleInject}
              >
                Inject
              </button>
            ) : (
              <button className="btn btn-primary btn-sm join-item" onClick={approve}>
                Approve
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
