import * as chains from "viem/chains";

export type BaseConfig = {
  targetNetworks: readonly chains.Chain[];
  pollingInterval: number;
  alchemyApiKey: string;
  rpcOverrides?: Record<number, string>;
  walletConnectProjectId: string;
  burnerWalletMode: "localNetworksOnly" | "allNetworks" | "disabled";
};

export type ScaffoldConfig = BaseConfig;

// Known issue: DEFAULT_ALCHEMY_API_KEY and walletConnectProjectId below are SE-2 shared defaults
// tracked in the public repo. Set NEXT_PUBLIC_ALCHEMY_API_KEY, NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID,
// and ALCHEMY_API_KEY in Vercel/CI env config before going live; shared defaults rate-limit under real traffic.
export const DEFAULT_ALCHEMY_API_KEY = "cR4WnXePioePZ5fFrnSiR";

const scaffoldConfig = {
  // The networks on which your DApp is live
  targetNetworks: [chains.base],
  // The interval at which your front-end polls the RPC servers for new data
  // Reduced to 2000ms for Base (≈2s block time on L2)
  pollingInterval: 2000,
  // This is ours Alchemy's default API key.
  // You can get your own at https://dashboard.alchemyapi.io
  // It's recommended to store it in an env variable:
  // .env.local for local testing, and in the Vercel/system env config for live apps.
  alchemyApiKey: process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || DEFAULT_ALCHEMY_API_KEY,
  // Alchemy RPC override for Base — prevents fallback to public RPCs.
  rpcOverrides: {
    [chains.base.id]:
      `https://base-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY || DEFAULT_ALCHEMY_API_KEY}`,
  },
  // This is ours WalletConnect's default project ID.
  // You can get your own at https://cloud.walletconnect.com
  // It's recommended to store it in an env variable:
  // .env.local for local testing, and in the Vercel/system env config for live apps.
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || "3a8170812b534d0ff9d794f19a901d64",
  // Configure Burner Wallet visibility:
  // - "localNetworksOnly": only show when all target networks are local (hardhat/anvil)
  // - "allNetworks": show on any configured target networks
  // - "disabled": completely disable
  burnerWalletMode: "localNetworksOnly",
} as const satisfies ScaffoldConfig;

export default scaffoldConfig;
