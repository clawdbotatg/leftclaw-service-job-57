"use client";

import { useMemo, useState } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { useDeployedContractInfo, useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { notification } from "~~/utils/scaffold-eth";

const LICENSE_COST = 5000n * 10n ** 18n;

export function LicensePanel() {
  const { address } = useAccount();
  const [approving, setApproving] = useState(false);

  const { data: bossSlayerInfo } = useDeployedContractInfo({ contractName: "BossSlayer" });
  const bossSlayerAddress = bossSlayerInfo?.address;

  const { data: licenseBalance } = useScaffoldReadContract({
    contractName: "BossSlayer",
    functionName: "balanceOf",
    args: address ? [address, 0n] : [undefined, 0n],
    watch: true,
  });

  const { data: clawdBalance } = useScaffoldReadContract({
    contractName: "Clawd",
    functionName: "balanceOf",
    args: [address],
    watch: true,
  });

  const { data: allowance } = useScaffoldReadContract({
    contractName: "Clawd",
    functionName: "allowance",
    args: address && bossSlayerAddress ? [address, bossSlayerAddress] : [undefined, undefined],
    watch: true,
  });

  const { writeContractAsync: approveClawd } = useScaffoldWriteContract({ contractName: "Clawd" });
  const { writeContractAsync: writeBossSlayer, isMining } = useScaffoldWriteContract({ contractName: "BossSlayer" });

  const hasEnoughCLAWD = useMemo(() => (clawdBalance ?? 0n) >= LICENSE_COST, [clawdBalance]);
  const hasAllowance = useMemo(() => (allowance ?? 0n) >= LICENSE_COST, [allowance]);

  const handleApprove = async () => {
    if (!bossSlayerAddress) return;
    try {
      setApproving(true);
      await approveClawd({
        functionName: "approve",
        args: [bossSlayerAddress, 2n ** 256n - 1n],
      });
    } catch (e) {
      console.error(e);
    } finally {
      setApproving(false);
    }
  };

  const handleMint = async () => {
    try {
      await writeBossSlayer({ functionName: "mintLicense" });
      notification.success("Slayer License minted");
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="card bg-base-100 border border-base-300 shadow-md">
      <div className="card-body gap-3">
        <h3 className="card-title text-sm uppercase tracking-widest opacity-70">
          <span>🪪</span>
          Slayer License
        </h3>

        <div className="flex items-center justify-between text-sm">
          <span className="opacity-60">Your licenses</span>
          <span className="font-mono font-bold text-lg">{(licenseBalance ?? 0n).toString()}</span>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className="opacity-60">Your CLAWD</span>
          <span className="font-mono">
            {Number(formatEther(clawdBalance ?? 0n)).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        </div>

        <div className="divider my-1"></div>

        <div className="text-xs opacity-70">
          Costs <span className="font-mono font-bold">5,000 CLAWD</span>. 25% burned, 75% to pot.
        </div>

        {!hasAllowance ? (
          <button className="btn btn-primary btn-sm" disabled={!address || approving} onClick={handleApprove}>
            {approving ? <span className="loading loading-spinner loading-xs"></span> : null}
            Approve CLAWD
          </button>
        ) : (
          <button
            className="btn btn-primary btn-sm"
            disabled={!address || !hasEnoughCLAWD || isMining}
            onClick={handleMint}
          >
            {isMining ? <span className="loading loading-spinner loading-xs"></span> : null}
            {hasEnoughCLAWD ? "Mint Slayer License" : "Not enough CLAWD"}
          </button>
        )}
      </div>
    </div>
  );
}
