"use client";

import Link from "next/link";
import { RainbowKitCustomConnectButton } from "~~/components/scaffold-eth";

/**
 * Site header — minimal, branded for BOSS_SLAYER.
 */
export const Header = () => {
  return (
    <div className="sticky lg:static top-0 navbar bg-base-100 min-h-0 shrink-0 justify-between z-20 shadow-md shadow-secondary px-2 sm:px-4">
      <div className="navbar-start w-auto lg:w-1/2">
        <Link href="/" passHref className="flex items-center gap-3 ml-2">
          <span className="text-2xl">🗡️</span>
          <div className="flex flex-col leading-tight">
            <span className="font-black tracking-widest text-primary">BOSS_SLAYER</span>
            <span className="text-[10px] uppercase tracking-[0.2em] opacity-60">Cooperative CLAWD Raid</span>
          </div>
        </Link>
      </div>
      <div className="navbar-end grow mr-2">
        <RainbowKitCustomConnectButton />
      </div>
    </div>
  );
};
