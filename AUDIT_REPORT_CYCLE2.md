# Audit Report — Cycle 2

## MUST FIX

- [ ] **[HIGH]** AttackPanel approve button has no double-submission protection — `packages/nextjs/app/_components/AttackPanel.tsx:191` — The "Approve CLAWD to Attack" button has no `disabled` prop, no `approvalSubmitting` state, and no loading spinner. Per the QA audit framework, approve button protection is a critical ship-blocking requirement covering two windows: `approvalSubmitting` (signature request → hash return) and `approveCooldown` (confirmation → allowance cache refresh). A user who double-clicks fires multiple wallet approval prompts. Fix: add both states (feeding into `disabled`), a loading spinner, and destructure `isMining` from the `approveClawd` write hook so the commit button also knows an approval is in flight.

- [ ] **[HIGH]** Switch Network state not replacing the CTA button — `packages/nextjs/app/_components/AttackPanel.tsx`, `packages/nextjs/app/_components/LicensePanel.tsx` — Per the QA audit framework ("critical ship-blocking"), "the Switch Network state must replace the primary CTA button itself, not merely appear in a header dropdown." When connected to a non-Base chain the action buttons are disabled with misleading copy ("Raid not active") instead of a visible "Switch to Base" button replacing them in-place. Fix: check connected `chain.id` against the target network in each panel and render a Switch Network CTA in place of the action button when on the wrong chain.

## KNOWN ISSUES

- **[LOW]** `renounceOwnership()` permanently locks admin functions — `packages/foundry/contracts/BossSlayer.sol:7-8` — Inheriting OZ `Ownable` exposes `renounceOwnership()`. If the client calls it, `startRaid()` and `injectBounty()` become permanently inaccessible. No user funds are at risk (an active raid still settles on kill). Acknowledged in contract NatDoc comment. Accepted operational risk.

- **[LOW]** Lucky Drop RNG finisher-bias — `packages/foundry/contracts/BossSlayer.sol:297-327` — `_payLucky` seeds its selection from `blockhash(block.number - 1)` at kill time. The finisher can compute the lucky-winner set before landing the killing blow and choose whether to proceed. Impact is capped at 5% of pot. Acknowledged in contract NatDoc comment. Acceptable for v1; fix would bundle the lucky seed into the same commit-reveal extension used for crits.

- **[LOW]** Settlement gas scales with unique-attacker count — `packages/foundry/contracts/BossSlayer.sol:241-257` — `_settle()` runs three full-length loops over all unique attackers (reload, heavy, lucky); `startRaid()` clears the prior array. The finisher pays settlement gas. At extreme attacker counts this could approach Base's block gas limit (~30M). Acknowledged in contract NatDoc comment. Acceptable at current game scale; a future cycle could move to a pull-based claim model.

- **[LOW]** ERC-1155 Slayer License has no metadata URI — `packages/foundry/contracts/BossSlayer.sol:103-106` — `uri()` returns an empty string. Wallets and marketplaces show blank NFTs. Licenses are utility-only; the UI derives balance from contract state. Acknowledged in contract NatDoc comment. A URI setter can be added in a future cycle.

- **[LOW]** `LicensePanel` approve missing `approveCooldown` state — `packages/nextjs/app/_components/LicensePanel.tsx:45-57` — `LicensePanel` implements the `approving` state (covers signature-request → hash-return gap) but lacks a second `approveCooldown` state to cover the confirmation → allowance-cache-refresh gap. The QA skill requires both. Lower severity than the `AttackPanel` finding above since one guard is already in place; fast double-clicks after confirmation can still trigger a redundant second transaction.

- **[INFO]** Hardcoded fallback API keys committed in public files — `packages/nextjs/scaffold.config.ts`, `packages/foundry/.env.example` — `DEFAULT_ALCHEMY_API_KEY` and `walletConnectProjectId` in `scaffold.config.ts`, and the values of `ALCHEMY_API_KEY` and `ETHERSCAN_API_KEY` in `packages/foundry/.env.example`, are the SE-2 shared defaults and are tracked in the public repo. These are well-known shared keys, not project-specific secrets. However, the team must set their own `NEXT_PUBLIC_ALCHEMY_API_KEY`, `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID`, and `ALCHEMY_API_KEY` in Vercel/CI env config before going live; the shared defaults will rate-limit under real traffic.

- **[INFO]** `damageDealt` credits overkill in full — `packages/foundry/contracts/BossSlayer.sol:180-185` — `damageDealt[msg.sender]` accumulates the full rolled damage (100 or 1000) even when actual HP loss is lower (boss dies mid-hit), giving the finisher a proportionally boosted Heavy Split share. Acknowledged in contract NatDoc comment as intentional design. Not a bug.

- **[INFO]** `PastRaids` fetches events from `fromBlock: 0n` — `packages/nextjs/app/_components/PastRaids.tsx:9` — Scanning from block 0 works for a freshly deployed contract but will slow over time. Acceptable for v1; anchor `fromBlock` to the deploy block in a future iteration.

- **[INFO]** Missing test for zero-`initialOwner` constructor guard — `packages/foundry/test/BossSlayer.t.sol` — `test_constructor_rejectsZeroClawd` is present but there is no corresponding test for `require(initialOwner != address(0), "owner=0")`. The guard in the contract is correct; this is a coverage gap only.

## Summary

- Must Fix: 2 items
- Known Issues: 9 items
- Audit frameworks followed: contract audit (ethskills.com/audit/SKILL.md), QA audit (ethskills.com/qa/SKILL.md)
