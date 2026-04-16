# BossSlayer

Cooperative CLAWD raid game on Base. The community burns CLAWD to kill an AI Boss. When HP hits zero the prize pot auto-splits four ways, the Boss resets, and it starts again.

**Live:** https://bafybeicdm3gi3dlxic5vz5jfjnczrbseza6iawrayxasuirdhlyqo2jrqm.ipfs.community.bgipfs.com/

**Contract:** [`0xaa6d25aadf97ab9ee8ee16adbe5efaa688a563b0`](https://basescan.org/address/0xaa6d25aadf97ab9ee8ee16adbe5efaa688a563b0) on Base

## How it works

**1. Get a Slayer License**

Mint an ERC-1155 Slayer License for 5,000 CLAWD. 1,250 CLAWD (25%) burns to `0xdead`, 3,750 CLAWD (75%) goes into the raid pot. You need a license to attack.

**2. Attack the Boss (commit-reveal)**

Each attack costs 200 CLAWD: 100 burns, 100 goes to pot. Attacks use a two-transaction commit-reveal so crit rolls can't be front-run. Commit in one block, reveal the next. The crit roll uses `blockhash(commitBlock)` — unknown at commit time.

- Normal hit: 100 damage
- Crit (5% chance): 1,000 damage

**3. Kill shot triggers auto-settlement**

When Boss HP hits zero the contract settles the pot immediately in the same transaction:

| Split | Share | Recipients |
|---|---|---|
| Reload | 30% | Equal share to every unique attacker |
| Heavy Hitters | 50% | Pro-rata by damage dealt |
| Sniper | 15% | Final blow wallet |
| Lucky Drop | 5% | 5 randomly selected attackers |

**4. Boss resets**

The owner starts a new raid with fresh HP and optionally injects a bounty to make the pot positive-sum before the community starts attacking.

## CLAWD token

[`0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07`](https://basescan.org/address/0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07) on Base.

## Running locally

Requirements: Node >= 20, Yarn, Git, Foundry.

```bash
yarn install

# Terminal 1 — local Anvil chain
yarn chain

# Terminal 2 — deploy contracts
yarn deploy

# Terminal 3 — frontend
yarn start
```

Open http://localhost:3000.

To run against Base mainnet contracts instead of local deployments, set `targetNetworks: [chains.base]` in `packages/nextjs/scaffold.config.ts`.

## Tech stack

- **Smart contracts:** Solidity 0.8.20, Foundry, OpenZeppelin (ERC-1155, Ownable, ReentrancyGuard, SafeERC20)
- **Frontend:** Next.js (App Router), RainbowKit, Wagmi, Viem, TypeScript, Tailwind CSS, DaisyUI
- **Scaffold:** Scaffold-ETH 2
- **Hosting:** IPFS via bgipfs

## Known issues

See the bottom of this file for accepted v1 limitations identified in the security audit. The significant ones:

- Lucky Drop RNG is predictable by the finisher (5% of pot exposure, acceptable for v1).
- Settlement gas scales linearly with unique-attacker count (safe on Base at current scale).
- Slayer License NFTs have no metadata URI (utility-only; UI reads balances from contract state directly).
- `renounceOwnership()` would permanently lock `startRaid()` and `injectBounty()` — operational risk for the owner.

---

Built by [leftclaw.services](https://leftclaw.services) for client `0x7E6Db18aea6b54109f4E5F34242d4A8786E0C471`.
