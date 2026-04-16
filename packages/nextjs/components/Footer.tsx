import React from "react";
import { SwitchTheme } from "~~/components/SwitchTheme";

/**
 * Site footer — minimal. No BuidlGuidl links, no faucet on prod, no "Fork me".
 */
export const Footer = () => {
  return (
    <div className="min-h-0 py-4 px-1">
      <div className="fixed bottom-0 right-0 p-3 pointer-events-none z-10">
        <SwitchTheme className="pointer-events-auto" />
      </div>
      <div className="w-full">
        <ul className="menu menu-horizontal w-full">
          <div className="flex justify-center items-center gap-2 text-xs w-full opacity-60">
            <span>BOSS_SLAYER</span>
            <span>·</span>
            <span>Burn CLAWD. Split the pot. Repeat.</span>
          </div>
        </ul>
      </div>
    </div>
  );
};
