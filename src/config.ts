import dotenv from "dotenv";
import chalk from "chalk";

dotenv.config();

export const config = {
  openrouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  bnbTestnetRpc: process.env.BNB_TESTNET_RPC ?? "",
  walletPrivateKey: process.env.WALLET_PRIVATE_KEY ?? "",
  pinataJwt: process.env.PINATA_JWT ?? "",
} as const;

/** Throws if OPENROUTER_API_KEY is not set. */
export function requireApiKey(): void {
  if (config.openrouterApiKey === "") {
    throw new Error(
      "OPENROUTER_API_KEY is not set. Add it to your .env file.\n" +
      "  Get a key at https://openrouter.ai/settings/keys",
    );
  }
}

/** Print a startup summary of which keys are configured. */
export function printKeyStatus(): void {
  const keys: { label: string; set: boolean }[] = [
    { label: "OPENROUTER_API_KEY (All models)", set: config.openrouterApiKey !== "" },
    { label: "BNB_TESTNET_RPC (Chain)", set: config.bnbTestnetRpc !== "" },
    { label: "WALLET_PRIVATE_KEY (Chain)", set: config.walletPrivateKey !== "" },
    { label: "PINATA_JWT (IPFS storage)", set: config.pinataJwt !== "" },
  ];

  for (const { label, set } of keys) {
    const icon = set ? chalk.green("\u2713") : chalk.red("\u2717");
    console.log(`  ${icon} ${set ? chalk.white(label) : chalk.gray(label)}`);
  }
  console.log();
}
