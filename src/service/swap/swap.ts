import { Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { raydiumSwapTxn } from "./raydium/raydium.swap";
import { JitoBundleService } from "./jito/jito";
import { pumpfunSwap } from "./pumpfun/pumpfun";
import { PumpData, SwapParam } from "../../utils/type";
import { jupiterSwapTxn } from "./jupiter/jupiter";
import bs58 from "bs58";
import { simulateTxn } from "../../utils/utils";
import { IUser } from "../userService/user.service";
import { connection, msgService } from "../../config/config";
import { sendSwapTxMsg } from "../bot/message.handler";
import TelegramBot from "node-telegram-bot-api";
import { BotMessageService } from "../msgService/msgService";

const Pumpfun_API = "https://frontend-api.pump.fun/coins/";
export const swap = async (swapParam: SwapParam) => {
  const { private_key, mint, amount, slippage, tip, is_buy } = swapParam;
  const wallet = Keypair.fromSecretKey(bs58.decode(private_key));

  try {
    let vTxn = await raydiumSwapTxn(swapParam);
    if (!vTxn) {
      const url = Pumpfun_API + mint.toBase58();
      const isPump = await fetch(url);
      if (isPump.status === 200) {
        const data = await isPump.json();
        const pumpData: PumpData = {
          bondingCurve: new PublicKey(data.bonding_curve),
          associatedBondingCurve: new PublicKey(data.associated_bonding_curve),
          virtualSolReserves: Number(data.virtual_sol_reserves),
          virtualTokenReserves: Number(data.virtual_token_reserves),
          totalSupply: Number(data.total_supply),
          marketCap: Number(data.usd_market_cap),
        };
        vTxn = await pumpfunSwap(swapParam, pumpData);
      } else {
        console.log("Not found token on Pumpfun");
        vTxn = await jupiterSwapTxn(swapParam);
      }
    }
    vTxn.sign([wallet]);
    await simulateTxn(vTxn);
    return await confirmVtxn(vTxn);
  } catch (e) {
    console.log("Error while swap txn");
  }
};

export const confirmVtxn = async (vTxn: VersionedTransaction) => {
  const jitoInstance = new JitoBundleService();
  const signature = await jitoInstance.sendTransaction(vTxn.serialize());
  return signature;
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

  // console.log("1");
  // check balance
  const wallet = Keypair.fromSecretKey(bs58.decode(private_key));
  // console.log("2");
  const solBal = await connection.getBalance(wallet.publicKey);
  const _tip_tmp = userData?.jito_fee;
  // console.log("3");
  if (Number(solBal) <= swapAmount + _tip_tmp + 0.0003) {
    const res_msg = `⚠️ You don't have enough SOL to complete this transaction.⚠️\n Please top up your SOL balance.\nCurrent SOL balance: ${solBal} SOL`;
    const m_g = await bot.sendMessage(chat_id, `Set as ${res_msg}`);
    return;
  }
  // console.log("4");
  const swapParam: SwapParam = {
    private_key: private_key,
    mint: new PublicKey(ca),
    amount: swapAmount,
    slippage: userData?.slippage,
    tip: userData?.jito_fee,
    is_buy: true,
  };
  // console.log("5");
  const txHash = await swap(swapParam);
  // console.log("6");
  const swapMsgId = await sendSwapTxMsg(bot, chat_id, txHash);
  // console.log("7");
  const res_msg = `💰 Swap ${swapAmount} SOL successfully! 💰\n\n🔗 tx: ${txHash}`;
  await msgService.saveMessage(chat_id, swapMsgId, ca, res_msg);
};
