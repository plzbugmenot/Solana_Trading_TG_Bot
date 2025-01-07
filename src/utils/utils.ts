import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";
import { connection, metaplex } from "../config/config";
import {
  SPL_ACCOUNT_LAYOUT,
  TOKEN_PROGRAM_ID,
  TokenAccount,
} from "@raydium-io/raydium-sdk";
import { BN } from "bn.js"; // Import BN class as a value
import { PumpData } from "./type";

export const getWalletBalance = async (wallet: PublicKey): Promise<string> => {
  const userBal = await connection.getBalance(wallet);
  const solBal = userBal / LAMPORTS_PER_SOL;
  return solBal.toFixed(3);
};
export const copy2clipboard = (text: string) => {
  return `<code class="text-entity-code clickable" role="textbox" tabindex="0" data-entity-type="MessageEntityCode">${text}</code>`;
};

export const isValidSolanaAddress = async (ca: string) => {
  const contractAddressMatch = /([1-9A-HJ-NP-Za-km-z]{32,44})/;
  const CA_Match = ca.match(contractAddressMatch);

  if (!CA_Match) return false;

  return true;
};

export async function getWalletTokenAccount(
  connection: Connection,
  wallet: PublicKey
): Promise<TokenAccount[]> {
  const walletTokenAccount = await connection.getTokenAccountsByOwner(wallet, {
    programId: TOKEN_PROGRAM_ID,
  });
  return walletTokenAccount.value.map((i) => ({
    pubkey: i.pubkey,
    programId: i.account.owner,
    accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
  }));
}

export async function sleepTime(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function bufferFromUInt64(value: number | string) {
  let buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
}

export function readBigUintLE(
  buf: Buffer,
  offset: number,
  length: number
): number {
  switch (length) {
    case 1:
      return buf.readUint8(offset);
    case 2:
      return buf.readUint16LE(offset);
    case 4:
      return buf.readUint32LE(offset);
    case 8:
      return Number(buf.readBigUint64LE(offset));
  }
  throw new Error(`unsupported data size (${length} bytes)`);
}

export function calculateSplOut(pumpData: PumpData, solIn: number): number {
  const virtualSolReserves = new BN(pumpData.virtualSolReserves); // Treat as value
  const virtualTokenReserves = new BN(pumpData.virtualTokenReserves); // Treat as value

  const e = new BN(solIn); // Treat as value
  const a = virtualSolReserves.mul(virtualTokenReserves); // BN methods
  const i = virtualSolReserves.add(e);
  const l = a.div(i).add(new BN(1));
  const tokensToBuy = virtualTokenReserves.sub(l);

  return tokensToBuy.toNumber();
}

export const getTokenInfoFromMint = async (ca: string) => {
  const mintAddress = new PublicKey(ca);
  const metadata = await metaplex.nfts().findByMint({ mintAddress });
  return metadata;
};

export async function simulateTxn(txn: VersionedTransaction) {
  const { value: simulatedTransactionResponse } =
    await connection.simulateTransaction(txn, {
      replaceRecentBlockhash: true,
      commitment: "processed",
    });
  const { err, logs } = simulatedTransactionResponse;
  console.log("\n🚀 Simulate ~", Date.now());
  if (err) {
    console.error("* Simulation Error:", err, logs);
    throw new Error(
      "Simulation txn. Please check your wallet balance and slippage." +
        err +
        logs
    );
  }
}


