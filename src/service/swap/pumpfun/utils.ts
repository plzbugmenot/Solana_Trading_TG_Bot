import {
    LAMPORTS_PER_SOL,
    PublicKey,
    TransactionInstruction,
    ComputeBudgetProgram,
    SystemProgram,
    Transaction,
    VersionedTransaction,
  } from "@solana/web3.js";
  import * as spl from "@solana/spl-token";
  import {
    EVENT_AUTHORITY,
    GLOBAL,
    PUMP_FEE_RECIPIENT,
    PUMP_FUN_PROGRAM,
    RENT,
    SYSTEM_PROGRAM_ID,
    TOKEN_DECIMALS,
  } from "./constant";
  import {
    bufferFromUInt64,
    getTokenPriceFromJupiter,
    readBigUintLE,
    sleepTime,
  } from "../../../utils/utils";

  
  import { BN } from "bn.js"; // Import BN class as a value
  import base58 from "bs58";
import { connection } from "../../../config/config";
import { JitoAccounts } from "../jito/jito";
import { AmountsParam, BuyInsParam, PumpData, SellInsParam } from "../../../utils/type";
  
  export async function getPumpData(mint: PublicKey): Promise<PumpData | null> {
    // console.log("- Getting pump data...");
    const mint_account = mint.toBuffer();
    const [bondingCurve] = PublicKey.findProgramAddressSync(
      [Buffer.from("bonding-curve"), mint_account],
      PUMP_FUN_PROGRAM
    );
    const [associatedBondingCurve] = PublicKey.findProgramAddressSync(
      [bondingCurve.toBuffer(), spl.TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
      spl.ASSOCIATED_TOKEN_PROGRAM_ID
    );
    const PUMP_CURVE_STATE_OFFSETS = {
      VIRTUAL_TOKEN_RESERVES: 0x08,
      VIRTUAL_SOL_RESERVES: 0x10,
      REAL_TOKEN_RESERVES: 0x18,
      REAL_SOL_RESERVES: 0x20,
      TOTAL_SUPPLY: 0x28,
    };
    const response = await connection.getAccountInfo(bondingCurve);
    if (response === null) {
      // await sleepTime(1000);
      // return await getPumpData(mint);
      // throw new Error("curve account not found");
      return null;
    }
    // Use BigInt to read the big numbers in the data buffer
    const virtualTokenReserves = readBigUintLE(
      response.data,
      PUMP_CURVE_STATE_OFFSETS.VIRTUAL_TOKEN_RESERVES,
      8
    );
    const virtualSolReserves = readBigUintLE(
      response.data,
      PUMP_CURVE_STATE_OFFSETS.VIRTUAL_SOL_RESERVES,
      8
    );
    const realTokenReserves = readBigUintLE(
      response.data,
      PUMP_CURVE_STATE_OFFSETS.REAL_TOKEN_RESERVES,
      8
    );
    const realSolReserves = readBigUintLE(
      response.data,
      PUMP_CURVE_STATE_OFFSETS.REAL_SOL_RESERVES,
      8
    );
    const totalSupply = readBigUintLE(
      response.data,
      PUMP_CURVE_STATE_OFFSETS.TOTAL_SUPPLY,
      8
    );
  
    const leftTokens = realTokenReserves - 206900000;
    const initialRealTokenReserves = totalSupply - 206900000;
    const progress = 100 - (leftTokens * 100) / initialRealTokenReserves;
    const priceInSOL =
      virtualSolReserves / 10 ** 9 / (virtualTokenReserves / 10 ** 6);
    const marketCap = (priceInSOL * totalSupply) / 10 ** 6;
  
    return {
      bondingCurve,
      associatedBondingCurve,
      virtualSolReserves,
      virtualTokenReserves,
      realTokenReserves,
      realSolReserves,
      totalSupply,
      progress,
      priceInSOL,
      marketCap,
    };
  }
  
  export async function getPumpTokenPriceUSD(
    mint: string,
    solPrice: number
  ): Promise<number> {
    let pumpPrice =
      Number((await getPumpData(new PublicKey(mint)))?.priceInSOL) * solPrice;
    if (!pumpPrice) pumpPrice = await getTokenPriceFromJupiter(mint);
    return pumpPrice;
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
  
  export function getSplOut(amounts: AmountsParam, origin = false): number {
    const { solSpent, splBought, solIn } = amounts;
  
    // Convert values to BN for accurate large integer arithmetic
    let virtualSolReserves = new BN(30 * LAMPORTS_PER_SOL);
    let virtualTokenReserves = new BN(1073000000 * TOKEN_DECIMALS);
    let realTokenReserves = new BN(793100000 * TOKEN_DECIMALS);
    if (!origin) {
      virtualSolReserves.add(new BN(solSpent));
      virtualTokenReserves.sub(new BN(splBought));
      realTokenReserves.sub(new BN(splBought));
    }
  
    const e = new BN(solIn);
    const a = virtualSolReserves.mul(virtualTokenReserves); // BN multiplication
    const i = virtualSolReserves.add(e);
    const l = a.div(i).add(new BN(1));
  
    let tokensToBuy = virtualTokenReserves.sub(l);
    tokensToBuy = BN.min(tokensToBuy, realTokenReserves); // BN min comparison
    let splOut = tokensToBuy.toNumber();
    if (splOut <= 0) return getSplOut(amounts, true);
    return splOut;
  }
  
  // Compute budget instruction for high-priority transactions
  export function GetComputeUnitLimitInstruction(units: number) {
    return ComputeBudgetProgram.setComputeUnitLimit({
      units,
    });
  }
  
  // Adding priority fee to the transaction
  export function GetComputeUnitePriceInstruction(microLamports: number) {
    return ComputeBudgetProgram.setComputeUnitPrice({
      microLamports,
    });
  }
  
  export function getJitoTipInstruction(owner: PublicKey, lamports: number) {
    return SystemProgram.transfer({
      fromPubkey: owner,
      toPubkey: new PublicKey(JitoAccounts[0]),
      lamports,
    });
  }
  
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
  
  export function getSellInstruction(
    sellParam: SellInsParam,
    closeAta: boolean = false
  ) {
    const { mint, owner, bondingCurve, associatedBondingCurve, splIn } =
      sellParam;
  
    // Get associated token address for the mint
    const tokenATA = spl.getAssociatedTokenAddressSync(mint, owner, true);
  
    // Keys for the transaction
    const sellKeys = [
      { pubkey: GLOBAL, isSigner: false, isWritable: false },
      { pubkey: PUMP_FEE_RECIPIENT, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: bondingCurve, isSigner: false, isWritable: true },
      { pubkey: associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: tokenATA, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: true },
      { pubkey: SYSTEM_PROGRAM_ID, isSigner: false, isWritable: false },
      {
        pubkey: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        isSigner: false,
        isWritable: false,
      },
      { pubkey: spl.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: EVENT_AUTHORITY, isSigner: false, isWritable: false },
      { pubkey: PUMP_FUN_PROGRAM, isSigner: false, isWritable: false },
    ];
  
    // Data for the sell transaction
    const sellData = Buffer.concat([
      bufferFromUInt64("12502976635542562355"), // Some ID (as string)
      bufferFromUInt64(splIn), // SPL input amount
      bufferFromUInt64(0), // Some other value
    ]);
  
    // Create the sell instruction
    const sellInstruction = new TransactionInstruction({
      keys: sellKeys,
      programId: PUMP_FUN_PROGRAM,
      data: sellData,
    });
  
    // Create close account instruction if necessary
    const closeIns = spl.createCloseAccountInstruction(tokenATA, owner, owner);
  
    const result = [sellInstruction];
    if (closeAta) result.push(closeIns);
  
    return result;
  }
  
  export function getSignature(
    transaction: Transaction | VersionedTransaction
  ): string {
    const signature =
      "signature" in transaction
        ? transaction.signature
        : transaction.signatures[0];
    if (!signature) {
      throw new Error(
        "Missing transaction signature, the transaction was not signed by the fee payer"
      );
    }
    return base58.encode(signature);
  }
  
  export async function getTokenBalance(
    walletAddress: string,
    tokenMintAddress: string
  ) {
    
    // Get associated token account
    const associatedTokenAddress = spl.getAssociatedTokenAddressSync(
      new PublicKey(tokenMintAddress),
      new PublicKey(walletAddress)
    );
  
    // Get account info
    const tokenAccountInfo = await connection.getTokenAccountBalance(associatedTokenAddress);
    
    return tokenAccountInfo.value.uiAmount;
  }