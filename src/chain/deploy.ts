import { ethers } from "ethers";
import solc from "solc";
import chalk from "chalk";
import { config } from "../config.ts";

const SOL_PATH = decodeURIComponent(new URL("contracts/AIAgentsWar.sol", import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");
const DEPLOYED_PATH = decodeURIComponent(new URL("deployed.json", import.meta.url).pathname).replace(/^\/([A-Z]:)/, "$1");

async function main() {
  console.log(chalk.cyan("\n  Compiling AIAgentsWar.sol...\n"));

  // Read source
  const source = await Bun.file(SOL_PATH).text();

  // Compile with solc
  const input = JSON.stringify({
    language: "Solidity",
    sources: { "AIAgentsWar.sol": { content: source } },
    settings: {
      viaIR: true,
      optimizer: { enabled: true, runs: 200 },
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  });

  const output = JSON.parse(solc.compile(input));

  if (output.errors?.some((e: { severity: string }) => e.severity === "error")) {
    for (const err of output.errors) {
      console.log(chalk.red(`  ${err.formattedMessage}`));
    }
    process.exit(1);
  }

  const contract = output.contracts["AIAgentsWar.sol"]["AIAgentsWar"];
  const abi = contract.abi;
  const bytecode = contract.evm.bytecode.object;

  console.log(chalk.green("  Compilation successful!"));
  console.log(chalk.gray(`  ABI: ${abi.length} entries`));
  console.log(chalk.gray(`  Bytecode: ${bytecode.length / 2} bytes\n`));

  // Deploy
  if (!config.bnbTestnetRpc) {
    console.log(chalk.red("  BNB_TESTNET_RPC is not set in .env"));
    process.exit(1);
  }
  if (!config.walletPrivateKey) {
    console.log(chalk.red("  WALLET_PRIVATE_KEY is not set in .env"));
    process.exit(1);
  }

  const provider = new ethers.JsonRpcProvider(config.bnbTestnetRpc);
  const wallet = new ethers.Wallet(config.walletPrivateKey, provider);

  const balance = await provider.getBalance(wallet.address);
  console.log(chalk.gray(`  Deployer: ${wallet.address}`));
  console.log(chalk.gray(`  Balance:  ${ethers.formatEther(balance)} tBNB\n`));

  if (balance === 0n) {
    console.log(chalk.red("  No tBNB! Get some from https://www.bnbchain.org/en/testnet-faucet"));
    process.exit(1);
  }

  console.log(chalk.cyan("  Deploying to BNB Testnet...\n"));

  const factory = new ethers.ContractFactory(abi, bytecode, wallet);
  const deployed = await factory.deploy();
  await deployed.waitForDeployment();

  const address = await deployed.getAddress();

  console.log(chalk.green.bold(`  Contract deployed!`));
  console.log(chalk.white(`  Address:  ${address}`));
  console.log(chalk.cyan(`  Explorer: https://testnet.bscscan.com/address/${address}\n`));

  // Save deployed info
  await Bun.write(DEPLOYED_PATH, JSON.stringify({ address, abi }, null, 2));
  console.log(chalk.gray(`  Saved to src/chain/deployed.json\n`));
}

main().catch((err) => {
  console.error(chalk.red("  Deploy failed:"), err.message ?? err);
  process.exit(1);
});
