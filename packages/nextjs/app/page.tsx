"use client";

import { AttackPanel } from "./_components/AttackPanel";
import { BossPanel } from "./_components/BossPanel";
import { Leaderboard } from "./_components/Leaderboard";
import { LicensePanel } from "./_components/LicensePanel";
import { LiveFeed } from "./_components/LiveFeed";
import { OwnerPanel } from "./_components/OwnerPanel";
import { PastRaids } from "./_components/PastRaids";
import type { NextPage } from "next";

const Home: NextPage = () => {
  return (
    <div className="grow w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <header className="text-center space-y-2 pt-4">
          <h1 className="text-4xl sm:text-5xl font-black tracking-widest text-primary">BOSS_SLAYER</h1>
          <p className="opacity-60 text-sm max-w-2xl mx-auto">
            The community burns <span className="font-mono font-bold">CLAWD</span> to kill an AI Boss. When HP hits
            zero, the pot auto-splits four ways. Boss resets. Repeat forever.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column: Boss stage */}
          <div className="lg:col-span-2 space-y-6">
            <BossPanel />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <LicensePanel />
              <AttackPanel />
            </div>

            <Leaderboard />
          </div>

          {/* Right column: live + history */}
          <div className="space-y-6">
            <LiveFeed />
            <OwnerPanel />
            <PastRaids />
          </div>
        </div>

        <footer className="opacity-50 text-center text-xs pt-4 pb-16">
          Pot splits on kill: <span className="text-success">30%</span> Reload (equal share) ·{" "}
          <span className="text-success">50%</span> Heavy Hitters (pro-rata) · <span className="text-success">15%</span>{" "}
          Sniper (final blow) · <span className="text-success">5%</span> Lucky Drop (5 random)
        </footer>
      </div>
    </div>
  );
};

export default Home;
