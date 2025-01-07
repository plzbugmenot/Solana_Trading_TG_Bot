import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, TransactionInstruction, TransactionMessage, VersionedTransaction } from "@solana/web3.js";
import { BuyInsParam, PumpData, SwapParam } from "../../../utils/type";
import bs58 from "bs58";
import { EVENT_AUTHORITY, GLOBAL, PUMP_FEE_RECIPIENT, PUMP_FUN_PROGRAM, RENT } from "./const";
import * as spl from "@solana/spl-token";
import { connection } from "../../../config/config";
import { bufferFromUInt64, calculateSplOut, readBigUintLE, sleepTime } from "../../../utils/utils";
import { JitoAccounts } from "../jito/jito";
import { SYSTEM_PROGRAM_ID } from "@raydium-io/raydium-sdk";
import { getLastValidBlockhash } from "../getBlock";


export const pumpfunSwap = async (swapParam: SwapParam, pumpData: PumpData): Promise<VersionedTransaction> => {
  const { private_key, mint, amount, slippage, tip, is_buy } = swapParam;

  const wallet = Keypair.fromSecretKey(bs58.decode(private_key));
  const ca = mint.toBase58();
  console.log(`- Starting buy/sell https://solscan.io/token/${ca}...`);
  const solIn = amount * LAMPORTS_PER_SOL;
  const maxSol = Math.floor(solIn * (1 + slippage / 100));
  const splOut = calculateSplOut(pumpData, solIn);
  // Early return if splOut is less than or equal to 0
  if (splOut <= 0) {
    console.log("Not enough tokens to buy, aborting...");
    throw new Error("Not enough balance to swap");
  }
  const buyParam = {
    mint: swapParam.mint,
    owner: wallet.publicKey,
    bondingCurve: pumpData.bondingCurve,
    associatedBondingCurve: pumpData.associatedBondingCurve,
    maxSol,
    splOut,
  };
  const buyInstructions: TransactionInstruction[] = getBuyInstruction(buyParam);
  buyInstructions.push(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: new PublicKey(JitoAccounts[0]),
      lamports: tip * LAMPORTS_PER_SOL
    })
  );

  const blockhash = getLastValidBlockhash();
  if (!blockhash) {
    console.error("Failed to retrieve blockhash from cache");
    throw new Error("Failed to retrieve blockhash from cache");
  }
  // console.log("blockhash", blockhash);
  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    instructions: buyInstructions,
    recentBlockhash: blockhash,
  }).compileToV0Message();

  return new VersionedTransaction(messageV0);
}

// export async function getPumpData(mint: PublicKey) {
//   // console.log("- Getting pump data...");
//   const mint_account = mint.toBuffer();
//   const [bondingCurve] = PublicKey.findProgramAddressSync(
//     [Buffer.from("bonding-curve"), mint_account],
//     PUMP_FUN_PROGRAM
//   );
//   const [associatedBondingCurve] = PublicKey.findProgramAddressSync(
//     [bondingCurve.toBuffer(), spl.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
//     spl.ASSOCIATED_TOKEN_PROGRAM_ID
//   );
//   const PUMP_CURVE_STATE_OFFSETS = {
//     VIRTUAL_TOKEN_RESERVES: 0x08,
//     VIRTUAL_SOL_RESERVES: 0x10,
//     REAL_TOKEN_RESERVES: 0x18,
//     REAL_SOL_RESERVES: 0x20,
//     TOTAL_SUPPLY: 0x28,
//   };

//   const response = await connection.getAccountInfo(bondingCurve);
//   if (response === null) {
//     await sleepTime(1000);
//     return await getPumpData(mint);
//     // throw new Error("curve account not found");
//   }

//   // Use BigInt to read the big numbers in the data buffer
//   const virtualTokenReserves = readBigUintLE(
//     response.data,
//     PUMP_CURVE_STATE_OFFSETS.VIRTUAL_TOKEN_RESERVES,
//     8
//   );
//   const virtualSolReserves = readBigUintLE(
//     response.data,
//     PUMP_CURVE_STATE_OFFSETS.VIRTUAL_SOL_RESERVES,
//     8
//   );
//   const realTokenReserves = readBigUintLE(
//     response.data,
//     PUMP_CURVE_STATE_OFFSETS.REAL_TOKEN_RESERVES,
//     8
//   );
//   const realSolReserves = readBigUintLE(
//     response.data,
//     PUMP_CURVE_STATE_OFFSETS.REAL_SOL_RESERVES,
//     8
//   );
//   const totalSupply = readBigUintLE(
//     response.data,
//     PUMP_CURVE_STATE_OFFSETS.TOTAL_SUPPLY,
//     8
//   );

//   const leftTokens = realTokenReserves - 206900000;
//   const initialRealTokenReserves = totalSupply - 206900000;
//   const progress = 100 - (leftTokens * 100) / initialRealTokenReserves;
//   const priceInSOL =
//     virtualSolReserves / 10 ** 9 / (virtualTokenReserves / 10 ** 6);
//   const marketCap = (priceInSOL * totalSupply) / 10 ** 6;

//   return {
//     bondingCurve,
//     associatedBondingCurve,
//     virtualSolReserves,
//     virtualTokenReserves,
//     realTokenReserves,
//     realSolReserves,
//     totalSupply,
//     progress,
//     priceInSOL,
//     marketCap,
//   };
// }

export function getBuyInstruction(buyParam: BuyInsParam) {
  const { mint, owner, bondingCurve, associatedBondingCurve, maxSol, splOut } =
    buyParam;

  // Get associated token address for the mint
  const tokenATA = spl.getAssociatedTokenAddressSync(mint, owner, true);

  // Create instruction to create the associated token account if it doesn't exist
  const createATAInstruction =
    spl.createAssociatedTokenAccountIdempotentInstruction(
      owner,
      tokenATA,
      owner,
      mint
    );

  // Keys for the transaction
  const buyKeys = [
    { pubkey: GLOBAL, isSigner: false, isWritable: false },
    { pubkey: PUMP_FEE_RECIPIENT, isSigner: false, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: false },
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
    { pubkey: tokenATA, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: true },
    { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: spl.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: RENT, isSigner: false, isWritable: false },
    { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
    { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false },
  ];

  // Data for the transaction
  const buyData = Buffer.concat([
    bufferFromUInt64("16927863322537952870"), // Some ID (as string)
    bufferFromUInt64(splOut), // SPL amount out
    bufferFromUInt64(maxSol), // Max SOL
  ]);

  // Create the buy instruction
  const buyInstruction = new TransactionInstruction({
    keys: buyKeys,
    programId: PUMP_FUN_PROGRAM,
    data: buyData,
  });

  return [createATAInstruction, buyInstruction];
}