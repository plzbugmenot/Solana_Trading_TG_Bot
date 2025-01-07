import {
  VersionedTransaction,
  TransactionMessage,
  TransactionInstruction,
  SystemProgram,
  PublicKey,
  LAMPORTS_PER_SOL,
  Keypair,
} from "@solana/web3.js";
import { NATIVE_MINT, TOKEN_PROGRAM_ID, getMint } from "@solana/spl-token";
import {
  jsonInfo2PoolKeys,
  Liquidity,
  LiquidityPoolKeys,
  Percent,
  Token,
  TokenAmount,
} from "@raydium-io/raydium-sdk";
import { fetchPoolInfoByMint } from "./formatAmmKeysById";
// import { SwapParam } from "../services/types";
import { connection } from "../../../config/config";
import { SwapParam } from "../../../utils/type";
import { getWalletTokenAccount } from "../../../utils/utils";
import { JitoAccounts } from "../jito/jito";
import bs58 from "bs58";
import { getLastValidBlockhash } from "../getBlock";

export const raydiumSwapTxn = async (swapParam: SwapParam): Promise<VersionedTransaction|null> => {
  const { private_key, mint, amount, slippage, tip, is_buy } = swapParam;
  const slippageP = new Percent(slippage, 100);

  const decimals = (await getMint(connection, mint)).decimals;
  const wallet = Keypair.fromSecretKey(bs58.decode(private_key));

  const WSOL_TOKEN = new Token(
    TOKEN_PROGRAM_ID,
    NATIVE_MINT,
    9,
    "WSOL",
    "WSOL"
  );
  const MINT_TOKEN = new Token(TOKEN_PROGRAM_ID, mint, decimals);
  const inputToken = is_buy ? WSOL_TOKEN : MINT_TOKEN;
  const outputToken = is_buy ? MINT_TOKEN : WSOL_TOKEN;
  const inDecimal = is_buy ? 9 : decimals;
  const inAmount = Number((amount * 10 ** inDecimal).toFixed(0));

  const inputTokenAmount = new TokenAmount(inputToken, inAmount);
  const walletTokenAccounts = await getWalletTokenAccount(
    connection,
    wallet.publicKey
  );
  const targetPoolInfo = await fetchPoolInfoByMint(mint.toBase58());
  if (targetPoolInfo === null) {
    // return await routeRaydiumSwap(swapParam);
    // TODO pumpfun
    console.log("Pool not found on Raydium");
    return null;
  }
  const poolKeys = jsonInfo2PoolKeys(targetPoolInfo) as LiquidityPoolKeys;

  const { amountOut, minAmountOut } = Liquidity.computeAmountOut({
    poolKeys: poolKeys,
    poolInfo: await Liquidity.fetchInfo({ connection, poolKeys }),
    amountIn: inputTokenAmount,
    currencyOut: outputToken,
    slippage: slippageP,
  });

  // -------- step 2: create instructions by SDK function --------
  const { innerTransactions } = await Liquidity.makeSwapInstructionSimple({
    connection,
    poolKeys,
    userKeys: {
      tokenAccounts: walletTokenAccounts,
      owner: wallet.publicKey,
    },
    amountIn: inputTokenAmount,
    amountOut: minAmountOut,
    fixedSide: "in",
    makeTxVersion: 0,
  });

  const feeInstructions = SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: new PublicKey(JitoAccounts[0]),
    lamports: tip * LAMPORTS_PER_SOL,
  });
  const instructions: TransactionInstruction[] = [];
  instructions.push(
    ...innerTransactions.flatMap((tx: any) => tx.instructions),
    feeInstructions
  );

  const blockhash = getLastValidBlockhash();
  if (!blockhash) {
    console.error("Failed to retrieve blockhash from cache");
    throw new Error("Failed to retrieve blockhash from cache");
  }
  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash,
    instructions,
  }).compileToV0Message();
  return new VersionedTransaction(messageV0);
};
