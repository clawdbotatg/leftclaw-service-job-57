# 🏗 Scaffold-ETH 2

<h4 align="center">
  <a href="https://docs.scaffoldeth.io">Documentation</a> |
  <a href="https://scaffoldeth.io">Website</a>
</h4>

🧪 An open-source, up-to-date toolkit for building decentralized applications (dapps) on the Ethereum blockchain. It's designed to make it easier for developers to create and deploy smart contracts and build user interfaces that interact with those contracts.

> [!NOTE]
> 🤖 Scaffold-ETH 2 is AI-ready! It has everything agents need to build on Ethereum. Check `.agents/`, `.claude/`, `.opencode` or `.cursor/` for more info.

⚙️ Built using NextJS, RainbowKit, Foundry, Wagmi, Viem, and Typescript.

- ✅ **Contract Hot Reload**: Your frontend auto-adapts to your smart contract as you edit it.
- 🪝 **[Custom hooks](https://docs.scaffoldeth.io/hooks/)**: Collection of React hooks wrapper around [wagmi](https://wagmi.sh/) to simplify interactions with smart contracts with typescript autocompletion.
- 🧱 [**Components**](https://docs.scaffoldeth.io/components/): Collection of common web3 components to quickly build your frontend.
- 🔥 **Burner Wallet & Local Faucet**: Quickly test your application with a burner wallet and local faucet.
- 🔐 **Integration with Wallet Providers**: Connect to different wallet providers and interact with the Ethereum network.

![Debug Contracts tab](https://github.com/scaffold-eth/scaffold-eth-2/assets/55535804/b237af0c-5027-4849-a5c1-2e31495cccb1)

## Requirements

Before you begin, you need to install the following tools:

- [Node (>= v20.18.3)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

## Quickstart

To get started with Scaffold-ETH 2, follow the steps below:

1. Install dependencies if it was skipped in CLI:

```
cd my-dapp-example
yarn install
```

2. Run a local network in the first terminal:

```
yarn chain
```

This command starts a local Ethereum network using Foundry. The network runs on your local machine and can be used for testing and development. You can customize the network configuration in `packages/foundry/foundry.toml`.

3. On a second terminal, deploy the test contract:

```
yarn deploy
```

This command deploys a test smart contract to the local network. The contract is located in `packages/foundry/contracts` and can be modified to suit your needs. The `yarn deploy` command uses the deploy script located in `packages/foundry/script` to deploy the contract to the network. You can also customize the deploy script.

4. On a third terminal, start your NextJS app:

```
yarn start
```

Visit your app on: `http://localhost:3000`. You can interact with your smart contract using the `Debug Contracts` page. You can tweak the app config in `packages/nextjs/scaffold.config.ts`.

Run smart contract test with `yarn foundry:test`

- Edit your smart contracts in `packages/foundry/contracts`
- Edit your frontend homepage at `packages/nextjs/app/page.tsx`. For guidance on [routing](https://nextjs.org/docs/app/building-your-application/routing/defining-routes) and configuring [pages/layouts](https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts) checkout the Next.js documentation.
- Edit your deployment scripts in `packages/foundry/script`


## Documentation

Visit our [docs](https://docs.scaffoldeth.io) to learn how to start building with Scaffold-ETH 2.

To know more about its features, check out our [website](https://scaffoldeth.io).

## Contributing to Scaffold-ETH 2

We welcome contributions to Scaffold-ETH 2!

Please see [CONTRIBUTING.MD](https://github.com/scaffold-eth/scaffold-eth-2/blob/main/CONTRIBUTING.md) for more information and guidelines for contributing to Scaffold-ETH 2.
## Known Issues

The following issues were identified in the security audit and are accepted for v1:

- **[LOW] Empty NFT metadata URI** — `BossSlayer.sol` — `uri(uint256)` returns an empty string. Slayer Licenses (ERC-1155 id 0) have no on-chain or off-chain metadata, so wallets and marketplaces display a blank NFT. The UI reads balances directly from contract state, so this does not affect gameplay. A URI setter can be added in a future cycle.

- **[LOW] Ownable: renounceOwnership risk** — `BossSlayer.sol` — OZ `Ownable` exposes `renounceOwnership()`. If the owner calls it, `startRaid()` and `injectBounty()` become permanently inaccessible. No user funds are at risk (an active raid still settles on the kill blow); this is an operational risk accepted by the contract owner.

- **[LOW] Settlement gas scales with unique-attacker count** — `BossSlayer.sol` — `_settle()` runs three full-length loops over the `attackers` array; `startRaid()` clears the prior raid's state in a full-length loop. The finisher pays settlement gas. On Base (30M block gas limit) this is safe for thousands of unique attackers at current game scale. May become expensive for extremely high-participation raids.

- **[LOW] Lucky Drop RNG uses predictable blockhash seed** — `BossSlayer.sol` `_payLucky()` — The lucky-winner draw seed is `keccak256(blockhash(block.number - 1), raidId)`. The finisher can compute the lucky-winner set before landing the kill blow. Impact is capped at 5% of pot. Acceptable for v1; bundle into a VRF/commit-reveal extension in a future cycle.

- **[LOW] damageDealt credits overkill damage** — `BossSlayer.sol` — Full rolled damage (including overkill past 0 HP) is credited to `damageDealt`. HP subtraction is floored at 0. This is an intentional finisher-bonus design: the killing blow attacker earns a proportionally larger Heavy Hitter share. Asymmetric but not a bug.

- **[INFO] SE-2 branding in tab-title template** — `getMetadata.ts` — `titleTemplate` still reads `"%s | Scaffold-ETH 2"`. No sub-pages exist today so this is not visible, but any future sub-page would leak SE-2 branding. Fix by updating the template string.

- **[INFO] Default OG image** — `getMetadata.ts` — `og:image` resolves to the SE-2 default `/thumbnail.jpg`. Replace `public/thumbnail.jpg` with a BOSS_SLAYER–branded image for proper social unfurls.

- **[INFO] No USD values next to CLAWD amounts** — Frontend components show raw CLAWD amounts without a USD equivalent. CLAWD has no canonical on-chain USD oracle wired in v1. Acceptable; add a price feed in a future cycle if desired.

- **[INFO] BossSlayer contract address not surfaced in UI** — The deployed contract address is not displayed via `<Address/>` on the main page. Users can find it via the block explorer after deployment.

- **[INFO] Minimal CLAWD ABI in externalContracts.ts** — Only `balanceOf`, `allowance`, `approve`, `transfer`, and a few other standard ERC-20 functions are included. Sufficient for the current UI; add more selectors if future features need them.

- **[INFO] No Phantom wallet connector** — Stock RainbowKit connectors are used. Phantom holders on Base may need to use the generic injected connector. Add an explicit Phantom connector in a future cycle if desired.
