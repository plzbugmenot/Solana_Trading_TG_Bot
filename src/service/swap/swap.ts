import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";
import { raydiumSwapTxn } from "./raydium/raydium.swap";
import { JitoBundleService } from "./jito/jito";
import { pumpfunSwap } from "./pumpfun/pumpfun";
import {
  IReferrePercent,
  ISwapTxn,
  IUser,
  PumpData,
  SwapParam,
} from "../../utils/type";
import { jupiterSwapTxn } from "./jupiter/jupiter";
import bs58 from "bs58";
import {
  formatNumber,
  getReferredUsers,
  getSignatureFromTransaction,
  getWalletBalance,
  simulateTxn,
} from "../../utils/utils";
import {
  BOT_FEE_PERCENT,
  connection,
  msgService,
  txnService,
  USER_DISCOUNT_PERCENT,
  userService,
} from "../../config/config";
import { sendSwapTxMsg } from "../bot/message.handler";
import TelegramBot from "node-telegram-bot-api";
import { BotCaption } from "../../config/constants";
import { feeTransfer } from "./feeTransfer";
import { get } from "mongoose";
import { getCachedSolPrice } from "./getBlock";
import { SwapTxnService } from "../../model/txn.service";
interface SwapResponse {
  txHash: string | null;
  inAmount: number | 0;
  outAmount: number | 0;
}
const swap = async (swapParam: SwapParam): Promise<SwapResponse> => {
  console.log("in swap func", swapParam);
  const { private_key, tip, is_buy, referredUsers } = swapParam;
  console.log(private_key);
  const wallet = Keypair.fromSecretKey(bs58.decode(private_key));

  try {
    // let {vTxn, inAmount, outAmount} = await raydiumSwapTxn(swapParam);
    let swapResponse = await raydiumSwapTxn(swapParam);
    let vTxn;
    let inAmount = 0;
    let outAmount = 0;
    if (swapResponse) {
      vTxn = swapResponse?.vTxn;
      inAmount = swapResponse?.inAmount;
      outAmount = swapResponse?.outAmount;
    } else {
      swapResponse = await pumpfunSwap(swapParam);
      if (swapResponse) {
        vTxn = swapResponse?.vTxn;
        inAmount = swapResponse?.inAmount;
        outAmount = swapResponse?.outAmount;
      } else {
        console.log("Not found token on Pumpfun");
        swapResponse = await jupiterSwapTxn(swapParam);
        vTxn = swapResponse?.vTxn;
        inAmount = swapResponse?.inAmount || 0;
        outAmount = swapResponse?.outAmount || 0;
      }
      if (!vTxn) {
        console.log("Not found token on Jupiter");
        return {
          txHash: null,
          inAmount: 0,
          outAmount: 0,
        };
      }
    }
    const total_percent =
      (BOT_FEE_PERCENT * (100 - USER_DISCOUNT_PERCENT)) / 100 / 100; // 0.9%
    const fee = is_buy ? inAmount * total_percent : outAmount * total_percent; // inamount, outamount with decimal
    const walletBalance = await getWalletBalance(wallet.publicKey); // no ramport sol 3.512345
    if ((fee + tip + inAmount) / LAMPORTS_PER_SOL + 0.003 > Number(walletBalance) && is_buy) {
      // buy swap wallet balance check
      return {
        txHash: null,
        inAmount: 0,
        outAmount: 0,
      };
    }
    const feeTxn = await feeTransfer(
      wallet.publicKey,
      referredUsers,
      fee
    ); // fee transfer
    let vTxns = [vTxn];
    if (feeTxn) {
      feeTxn.sign([wallet]);
      await simulateTxn(feeTxn);
      vTxns.push(feeTxn);
    }
    vTxn.sign([wallet]);
    await simulateTxn(vTxn);
    const txHash = await confirmVtxn(vTxns); // return tx hash
    if (txHash === null) {
      return {
        txHash: null,
        inAmount: 0,
        outAmount: 0,
      };
    }

    return {
      txHash,
      inAmount,
      outAmount,
    };
  } catch (e: any) {
    console.log("Error while swap txn", e || "");
    return {
      txHash: null,
      inAmount: 0,
      outAmount: 0,
    };
  }
};

export const confirmVtxn = async (vTxn: VersionedTransaction[]) => {
  const jitoInstance = new JitoBundleService();
  const tmp = vTxn.map((v) => v.serialize());
  const bundleId = await jitoInstance.sendBundle(tmp);
  const is_success = await jitoInstance.getBundleStatus(bundleId);
  if (is_success) {
    const txHash = getSignatureFromTransaction(vTxn[0]);
    return txHash;
  } else return null;
  // console.log("https://solscan.io/tx/" + signature);
};

export const buySwap = async (
  bot: TelegramBot,
  chat_id: number,
  userData: IUser,
  swapAmount: number,
  ca: string
) => {
  const private_key = userData?.private_key;
  if (!private_key) return;
  console.log("buyswap func", userData);
  const wallet = Keypair.fromSecretKey(bs58.decode(private_key));
  const solBal = await connection.getBalance(wallet.publicKey);
  console.log("wallet.publicKey", wallet.publicKey.toBase58(), solBal);
  const _tip_tmp = userData.swap.tip_sol;
  if (Number(solBal) <= swapAmount + _tip_tmp + 0.0003) {
    const res_msg = `⚠️ You don't have enough SOL to complete this transaction.⚠️\n Please top up your SOL balance.\nCurrent SOL balance: ${solBal} SOL`;
    await bot.sendMessage(chat_id, `${res_msg}`);
    return;
  }
  const referredUsers: IReferrePercent[] =
    (await getReferredUsers(userData.userid)) || [];
  // const currentSOLPrice = getCachedSolPrice();
  const swapParam: SwapParam = {
    private_key: private_key,
    mint: new PublicKey(ca),
    amount: swapAmount,
    slippage: userData.swap.slippage,
    tip: userData.swap.tip_sol,
    is_buy: true,
    referredUsers: referredUsers || [],
  };
  console.log("1");
  const { txHash, inAmount, outAmount } = await swap(swapParam);

  if (!txHash) {
    await bot.sendMessage(chat_id, BotCaption.SWAP_FAILED);
    return;
  }
  const swapMsgId = await sendSwapTxMsg(bot, chat_id, txHash);
  // const res_msg = `💰 Swap ${swapAmount} SOL successfully! 💰\n\n🔗 tx: ${txHash}`;
  const res_msg = `💰 Buy swap: ${formatNumber(inAmount)} SOL => ${formatNumber(
    outAmount
  )} token\n 🔗 tx: ${txHash}`;
  await msgService.saveMessage(swapMsgId, chat_id, ca, res_msg);
  const txn_save_data: ISwapTxn = {
    userid: userData.userid,
    txHash: txHash,
    mint: ca,
    txTime: Date.now(),
    swap: {
      auto: false,
      token_amount: outAmount,
      price_usd: 0,
      swap: "BUY",
      tip_usd: userData.swap.tip_sol,
    },
  };
  await txnService.saveSwapTxn(txn_save_data);
};
