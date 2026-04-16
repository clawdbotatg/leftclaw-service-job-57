# Audit Report — Cycle 1

## MUST FIX

- [ ] **[HIGH]** Frontend target network excludes Base — `packages/nextjs/scaffold.config.ts:20-22` — `targetNetworks` is set to `[chains.foundry]` only. `Deploy.s.sol` has a dedicated `chainid == 8453` branch that wires `BossSlayer` to the real CLAWD token at `0x9f86dB9fc6f7c9408e8Fda3Ff8ce4e78ac7a6b07` and transfers `owner` to the client (`0x7E6Db18aea6b54109f4E5F34242d4A8786E0C471`). Once the IPFS frontend ships, users will land on it, see "wrong network / foundry expected", and be unable to transact on Base. Change to `[chains.base]` before the production frontend is uploaded. (Also add a Base RPC override pointing at Alchemy — `scaffold.config.ts` currently falls back to public RPCs for any non-configured chain.)

- [ ] **[HIGH]** Predictable on-chain RNG allows the Heavy Hitter split to be drained — `packages/foundry/contracts/BossSlayer.sol:118-123` — The crit roll is `keccak256(blockhash(block.number - 1), msg.sender, attackNonce) % 100`. Every input is known to the caller at the top of their transaction, so a contract or bundler can simulate `attack()` off-chain and **only submit** when the outcome is a crit. Because `damageDealt[msg.sender]` is credited with the full (uncapped) rolled damage and the Heavy Hitter split (50% of pot) is distributed pro-rata by `damageDealt`, a selective-crit attacker gets ~7× the damage-per-200-CLAWD of an honest attacker and can capture a disproportionate share of the pot (including any owner-injected bounty). In a lightly-contested raid the same attacker can also collect the Sniper (15%), Reload (30%) and Lucky (5%) shares, recycling burn into net-positive extraction. Replace with a commit-reveal scheme, Chainlink VRF, or at minimum remove `msg.sender` from the seed and resolve the crit at a later block so the caller cannot precompute the outcome before broadcasting.

## KNOWN ISSUES

- **[LOW]** `uri(uint256)` returns empty string — `packages/foundry/contracts/BossSlayer.sol:84-87` — Slayer Licenses (ERC-1155 id 0) have no metadata, so wallets / marketplaces show a blank NFT. Acceptable to ship: licenses are utility-only, the UI renders them from contract state, and the contract has no setter to add a URI later. Noted so the team can add a metadata setter in a future cycle if they want discoverability.

- **[LOW]** Owner can permanently brick the game — `packages/foundry/contracts/BossSlayer.sol:12` (inherits `Ownable`) — Standard OZ `Ownable` exposes `renounceOwnership()`, and `startRaid` / `injectBounty` are `onlyOwner`. If the client renounces, no new raid can ever start and the pot from the currently-active raid can still settle on a kill, but future raids are impossible. This is inherited OZ behavior and does not put user funds at risk; acceptable to ship. Documented operationally rather than fixed in code.

- **[LOW]** Settlement gas scales with unique-attacker count — `BossSlayer.sol:199-263`, `BossSlayer.sol:149-171` — `_settle()` runs three full-length loops over `attackers`, and `startRaid()` does a full-length clear of the prior raid's state. The finisher pays the settlement gas. On Base (30M block gas) this comfortably handles thousands of unique attackers, so this is not a realistic DoS for the intended scale, but extreme popularity could cause the kill-shot tx to get expensive. Acceptable given Base's low fees and the game design.

- **[LOW]** Lucky Drop RNG shares the same predictable-seed weakness — `BossSlayer.sol:239` — Seed is `keccak256(blockhash(block.number - 1), raidId)`. The finisher can compute the Lucky draw outcome in advance and decide whether to land the killing blow. Impact is capped (Lucky share is only 5% of pot, and the finisher is at most one of the 5 picks), so acceptable, but worth bundling into the same VRF/commit-reveal fix as the crit issue above.

- **[LOW]** `damageDealt` credits overkill but `hpLoss` floors — `BossSlayer.sol:125-130` — Comment documents the design choice (full rolled damage counts toward the Heavy share as a "finisher reward"). This is intentional but asymmetric: the final blow attacker is effectively paid a crit-style bonus on the Heavy split even if they didn't crit. Acceptable — noted so it isn't mistaken for a bug in a later review cycle.

- **[INFO]** Tab-title template keeps SE-2 branding — `packages/nextjs/utils/scaffold-eth/getMetadata.ts:7` — `titleTemplate = "%s | Scaffold-ETH 2"`. The root title `layout.tsx` overrides to "BOSS_SLAYER · …" correctly, but any future sub-page would render the template and leak SE-2 branding. No sub-pages exist today, so not a ship blocker.

- **[INFO]** `og:image` points at `/thumbnail.jpg` — `getMetadata.ts:9` — The default template thumbnail is still used for social unfurls. The `metadataBase` resolves to an absolute URL, so the link is technically valid, but the image itself is the SE-2 default until the team replaces `public/thumbnail.jpg`. Cosmetic.

- **[INFO]** No USD values shown next to CLAWD amounts — `packages/nextjs/app/_components/*.tsx` — QA skill recommends pairing token displays with USD context (e.g. "3,750 CLAWD (~$X)"). CLAWD on Base has no canonical USD oracle wired up here, so the omission is acceptable; users see raw CLAWD amounts consistently.

- **[INFO]** BossSlayer contract address is not surfaced in the UI — `packages/nextjs/app/page.tsx` — QA skill recommends rendering the deployed contract address via `<Address/>`. Users can still find it via the block explorer once deployed, but visibility is a nice-to-have.

- **[INFO]** `externalContracts.ts` ABI for Base CLAWD is a minimal ERC-20 subset — `packages/nextjs/contracts/externalContracts.ts:4-90` — Enough for the UI's needs (`balanceOf`, `allowance`, `approve`). Acceptable; just worth knowing when someone later wants to call a CLAWD function that isn't in this trimmed ABI.

- **[INFO]** No Phantom connector configured — `packages/nextjs/services/web3/wagmiConfig.ts` (uses stock RainbowKit connectors) — QA skill recommends adding Phantom explicitly so Phantom holders aren't locked out. Acceptable for v1.

## Summary

- Must Fix: 2 items
- Known Issues: 10 items
- Audit frameworks followed: contract audit (ethskills), QA audit (ethskills)
