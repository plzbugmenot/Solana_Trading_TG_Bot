import {
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { IReferrePercent } from "../../utils/type";
import { BOT_WALLET } from "../../config/config";
import { getLastValidBlockhash } from "./getBlock";

export const feeTransfer = async (
  wallet: PublicKey,
  referredUsers: IReferrePercent[],
  fee: number
) => {
  // fee: with lamport
  const instructions: TransactionInstruction[] = [];
  let total_percent = 100;
  for (const user of referredUsers) {
    if (Math.floor((fee * user.percent) / 100) === 0) continue;
    const receiver = new PublicKey(user.publick_key);
    const feeInstructions = SystemProgram.transfer({
      // fee for referrer
      fromPubkey: wallet,
      toPubkey: receiver,
      // lamports: 0,
      lamports: Math.floor((fee * user.percent) / 100),
    });
    instructions.push(feeInstructions);
    total_percent -= user.percent;
  }
  if (Math.floor((fee * total_percent) / 100) > 0) {
    const feeInstructions = SystemProgram.transfer({
      // fee transfer to bot
      fromPubkey: wallet,
      toPubkey: BOT_WALLET,
      // lamports: 1,
      lamports: Math.floor((fee * total_percent) / 100),
    });

    instructions.push(feeInstructions);
  }
  if (instructions.length === 0) return null;
  const blockhash = getLastValidBlockhash();
  if (!blockhash) {
    console.error("Failed to retrieve blockhash from cache");
    throw new Error("Failed to retrieve blockhash from cache");
  }
  const messageV0 = new TransactionMessage({
    payerKey: wallet,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();
  return new VersionedTransaction(messageV0);
};
