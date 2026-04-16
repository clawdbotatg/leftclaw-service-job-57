"use client";

import { useMemo } from "react";
import { formatEther } from "viem";
import { useAccount, useBlockNumber } from "wagmi";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const ATTACK_COST = 200n * 10n ** 18n;

export function AttackPanel() {
  const { address } = useAccount();
  const { data: bossSlayerInfo } = useDeployedContractInfo({ contractName: "BossSlayer" });
  const bossSlayerAddress = bossSlayerInfo?.address;

  const { data: raidInfo } = useScaffoldReadContract({
    contractName: "BossSlayer",
    functionName: "getRaidInfo",
    watch: true,
  });
  const pot = raidInfo?.[3] ?? 0n;
  const attackerCount = raidInfo?.[4] ?? 0n;
  const raidActive = raidInfo?.[5] ?? false;

  const { data: licenseBalance } = useScaffoldReadContract({
    contractName: "BossSlayer",
    functionName: "balanceOf",
    args: address ? [address, 0n] : [undefined, 0n],
    watch: true,
  });

  const { data: myStats } = useScaffoldReadContract({
    contractName: "BossSlayer",
    functionName: "getDamage",
    args: [address],
    watch: true,
  });
  const myDamage = myStats?.[0] ?? 0n;
  const myAttacks = myStats?.[1] ?? 0n;

  const { data: allowance } = useScaffoldReadContract({
    contractName: "Clawd",
    functionName: "allowance",
    args: address && bossSlayerAddress ? [address, bossSlayerAddress] : [undefined, undefined],
    watch: true,
  });

  const { data: totalDamage } = useScaffoldReadContract({
    contractName: "BossSlayer",
    functionName: "totalDamageDealt",
    watch: true,
  });

  // Pending commit-reveal state for the connected wallet.
  const { data: pendingAttack } = useScaffoldReadContract({
    contractName: "BossSlayer",
    functionName: "pendingAttacks",
    args: [address],
    watch: true,
  });
  const pendingCommitBlock = pendingAttack?.[0] ?? 0n;
  const hasPending = pendingCommitBlock > 0n;

  // Current block number — used to decide if the reveal window is open.
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const currentBlock = blockNumber ?? 0n;

  const canReveal = hasPending && currentBlock > pendingCommitBlock;
  const isExpired = hasPending && currentBlock > pendingCommitBlock + 255n;

  const { writeContractAsync, isMining } = useScaffoldWriteContract({ contractName: "BossSlayer" });
  const { writeContractAsync: approveClawd } = useScaffoldWriteContract({ contractName: "Clawd" });

  const hasLicense = (licenseBalance ?? 0n) > 0n;
  const hasAllowance = (allowance ?? 0n) >= ATTACK_COST;

  // Estimated payouts (pre-settlement projection based on current pot/damage distribution).
  const estReload = useMemo(() => {
    if (!attackerCount || attackerCount === 0n) return 0n;
    return (pot * 30n) / 100n / attackerCount;
  }, [pot, attackerCount]);

  const estHeavy = useMemo(() => {
    if (!totalDamage || totalDamage === 0n) return 0n;
    return (((pot * 50n) / 100n) * myDamage) / totalDamage;
  }, [pot, totalDamage, myDamage]);

  const handleCommit = async () => {
    try {
      await writeContractAsync({ functionName: "commitAttack" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleReveal = async () => {
    try {
      await writeContractAsync({ functionName: "revealAttack" });
    } catch (e) {
      console.error(e);
    }
  };

  const handleApprove = async () => {
    if (!bossSlayerAddress) return;
    try {
      await approveClawd({
        functionName: "approve",
        args: [bossSlayerAddress, 2n ** 256n - 1n],
      });
    } catch (e) {
      console.error(e);
    }
  };

  const commitDisabled = !address || !raidActive || !hasLicense || isMining || hasPending;
  const revealDisabled = !address || isMining || !canReveal || isExpired;

  const commitReason = !address
    ? "Connect wallet"
    : !raidActive
      ? "Raid not active"
      : !hasLicense
        ? "Need Slayer License"
        : !hasAllowance
          ? "Approve CLAWD first"
          : hasPending
            ? "Reveal your pending attack first"
            : "";

  return (
    <div className="card bg-base-100 border border-base-300 shadow-md">
      <div className="card-body gap-3">
        <h3 className="card-title text-sm uppercase tracking-widest opacity-70 flex items-center gap-2">
          <span>⚔️</span>
          Attack
        </h3>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-base-200 rounded p-2">
            <div className="opacity-60">Your damage</div>
            <div className="font-mono font-bold text-base">{myDamage.toString()}</div>
          </div>
          <div className="bg-base-200 rounded p-2">
            <div className="opacity-60">Your attacks</div>
            <div className="font-mono font-bold text-base">{myAttacks.toString()}</div>
          </div>
          <div className="bg-base-200 rounded p-2">
            <div className="opacity-60">Est. Reload (30%)</div>
            <div className="font-mono text-success">
              {Number(formatEther(estReload)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
          <div className="bg-base-200 rounded p-2">
            <div className="opacity-60">Est. Heavy (50%)</div>
            <div className="font-mono text-success">
              {Number(formatEther(estHeavy)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="text-[11px] opacity-60 pt-1">
          Costs <span className="font-mono">200 CLAWD</span> (100 burn + 100 pot). 5% crit = 10× damage. Attack is a
          two-step commit/reveal — commit locks in your CLAWD, reveal resolves the crit.
        </div>

        {hasPending && !isExpired && (
          <div className="alert alert-info text-xs py-2">
            <span>
              Attack committed at block {pendingCommitBlock.toString()}.{" "}
              {canReveal ? "Ready to reveal!" : "Waiting for next block…"}
            </span>
          </div>
        )}

        {isExpired && (
          <div className="alert alert-warning text-xs py-2">
            <span>Pending attack expired ({">"} 255 blocks). Reveal to clear your state, then commit again.</span>
          </div>
        )}

        {!hasPending && (hasAllowance || !address) ? (
          <button
            className={`btn ${raidActive && !commitDisabled ? "btn-error" : "btn-disabled"} btn-lg`}
            disabled={commitDisabled}
            onClick={handleCommit}
          >
            {isMining ? <span className="loading loading-spinner"></span> : <span className="text-xl">🗡️</span>}
            {commitReason || "COMMIT ATTACK"}
          </button>
        ) : !hasPending ? (
          <button className="btn btn-primary btn-sm" onClick={handleApprove}>
            Approve CLAWD to Attack
          </button>
        ) : null}

        {hasPending && (
          <button
            className={`btn ${canReveal && !revealDisabled ? "btn-success" : "btn-disabled"} btn-lg`}
            disabled={revealDisabled}
            onClick={handleReveal}
          >
            {isMining ? <span className="loading loading-spinner"></span> : <span className="text-xl">✨</span>}
            {isExpired ? "CLEAR EXPIRED ATTACK" : canReveal ? "REVEAL ATTACK" : "Waiting for next block…"}
          </button>
        )}
      </div>
    </div>
  );
}
