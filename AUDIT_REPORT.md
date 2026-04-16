# Audit Report — Cycle 3

## MUST FIX

- [ ] **[CRITICAL]** BossSlayer address is zero placeholder on Base — `packages/nextjs/contracts/deployedContracts.ts:613` — The `address` field for `BossSlayer` on chain 8453 is `0x0000000000000000000000000000000000000000`. Every frontend transaction will route to the zero address and revert silently; users cannot interact with the contract at all. The file comment notes this is overwritten by the deploy worker after `yarn deploy --network base`. Confirm the actual deployment has completed and this field contains the live contract address before going live; do not ship the frontend with the placeholder.

## KNOWN ISSUES

- **[LOW]** `renounceOwnership()` permanently locks admin functions — `BossSlayer.sol:8` — Inheriting OZ `Ownable` exposes `renounceOwnership()`. If the client calls it, `startRaid()` and `injectBounty()` become permanently inaccessible. No user funds are at risk (an active raid still settles on kill). Acknowledged in contract NatDoc comment. Accepted operational risk.

- **[LOW]** Lucky Drop RNG is finisher-influenceable — `BossSlayer.sol:303` — `_payLucky` seeds its selection from `blockhash(block.number - 1)` at kill time. The finisher can compute the 5-winner set before choosing to land the killing blow. Impact is capped at 5% of pot. Acknowledged in code comment; acceptable for v1.

- **[LOW]** Settlement and `startRaid` run O(n) loops over unique attackers — `BossSlayer.sol:215-231, 260-327` — Three settlement loops plus one state-clear loop all iterate the full `attackers` array; the finisher pays that gas. Acceptable on Base at current game scale. Acknowledged in code comments.

- **[INFO]** Slayer License has no metadata URI — `BossSlayer.sol:103-106` — `uri()` returns an empty string; wallets and marketplaces show a blank NFT. Licenses are utility-only; the UI reads balance directly from contract state. Acknowledged in contract NatDoc comment. A URI setter can be added in a future cycle.

- **[INFO]** `NoAttackersToStart` error is defined but never used — `BossSlayer.sol:85` — The custom error is declared but no code path reverts with it. Dead code; no functional impact.

- **[INFO]** `damageDealt` credits full overkill damage — `BossSlayer.sol:180-185` — `damageDealt[msg.sender]` accumulates the full rolled damage even when actual HP loss is lower (boss dies mid-hit), giving the finisher a proportionally larger Heavy Split share. Acknowledged in contract NatDoc comment as intentional design; not a bug.

- **[INFO]** Missing test for zero-`initialOwner` constructor guard — `BossSlayer.t.sol:60-62` — Guard is correct in the contract; test coverage gap only. Acknowledged in test file comment.

- **[LOW]** `LicensePanel` approval missing `approveCooldown` second state — `LicensePanel.tsx:51-68` — Only the `approving` flag (click→hash gap) is present; the `approveCooldown` state (confirm→allowance-cache-refresh gap) is absent. Fast double-clicks after confirmation can send a redundant second approval. Risk is low (approval is idempotent). Acknowledged in code comment.

- **[LOW]** `AttackPanel` `approvalSubmitting` not cleared in a `finally` block — `AttackPanel.tsx:117-132` — The flag is cleared in both the success path and `catch`, but there is no `finally {}`. If an unexpected throw occurs after `await` resolves, the button becomes permanently stuck in this session. Functionally safe for normal flows; minor deviation from the recommended defensive pattern.

- **[LOW]** `approveCooldown` timeout is 1500 ms — `AttackPanel.tsx:127` — Base block time is ~2 s; the cooldown may expire before the allowance cache has refreshed, re-enabling the Approve button while the transaction is still confirming. 4000 ms is the recommended minimum.

- **[LOW]** Phantom wallet not in RainbowKit wallet list — `wagmiConnectors.tsx:20-28` — `phantomWallet` is not imported or added to the wallets array. Phantom users must use WalletConnect as a fallback to connect.

- **[INFO]** `wagmiConnectors.tsx` app name is the SE2 default — `wagmiConnectors.tsx:49` — `appName: "scaffold-eth-2"` appears in WalletConnect session UI and wallet pairing prompts. Should be "BOSS_SLAYER" or equivalent project name.

- **[INFO]** SE2 template README not replaced — `README.md` — The README still contains SE2 boilerplate ("Scaffold-ETH 2", template quickstart, documentation links). It does not describe BOSS_SLAYER.

- **[INFO]** Deployed contract address not shown on page — No component — None of the UI components display the BossSlayer contract address via `<Address/>`. Users cannot verify from the UI which contract they are interacting with.

- **[INFO]** CLAWD amounts displayed without USD equivalent — `BossPanel.tsx:71`, `AttackPanel.tsx:177-184`, `Leaderboard.tsx:54-64` — All token quantities are shown as raw CLAWD values with no USD conversion alongside them.

- **[LOW]** No mobile deep-link implementation — All transaction buttons — No `writeAndOpen`/`openWallet` helper is implemented. Mobile WalletConnect users must manually switch to their wallet app after initiating a transaction; the wallet app will not auto-open.

- **[INFO]** SE2 default Alchemy API key and WalletConnect project ID are hardcoded fallbacks — `scaffold.config.ts:17, 39` — If `NEXT_PUBLIC_ALCHEMY_API_KEY` and `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` are not set in the hosting environment, the app falls back to shared SE2 defaults that are rate-limited under real traffic. These env vars must be confirmed set on the hosting platform before going live.

- **[INFO]** `PastRaids` scans from block 0 — `PastRaids.tsx:10` — `fromBlock: 0n` will slow as the chain grows. Acknowledged in code comment; anchoring to the deploy block is a future improvement.

- **[INFO]** `getMetadata` title template retains "Scaffold-ETH 2" — `getMetadata.ts:8` — `titleTemplate = "%s | Scaffold-ETH 2"` would appear in any sub-page `<title>` tags. This is a single-page app with no sub-pages so there is no current user-visible impact.

## Summary
- Must Fix: 1 item
- Known Issues: 18 items
- Audit frameworks followed: contract audit (ethskills.com/audit/SKILL.md), QA audit (ethskills.com/qa/SKILL.md)
