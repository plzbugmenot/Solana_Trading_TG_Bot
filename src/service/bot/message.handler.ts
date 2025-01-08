import TelegramBot from "node-telegram-bot-api";
import { userdataList } from "../userService/user.service";
import { getSettingCaption } from "../setting/setting";
import {
  BotCallBack,
  BotCaption,

} from "../../config/constants";
import { getTokenInfoFromMint, isValidSolanaAddress } from "../../utils/utils";
import {
  _is_buy,
  _slippage,
  _tip,
  connection,
  PRIVATE_KEY,
} from "../../config/config";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { SwapParam } from "../../utils/type";
import { swap } from "../swap/swap";

export const messageHandler = async (
  bot: TelegramBot,
  msg: TelegramBot.Message
) => {
  try {
    const messageText = msg.text;
    const userData = userdataList.get(msg.chat.id);
    if (!userData) return;
    const { reply_to_message } = msg;
    if (!messageText) return;
    if (reply_to_message && reply_to_message.text) {
      const { text } = reply_to_message;
      const regex = /^[0-9]+(\.[0-9]+)?$/;
      const isNumber = regex.test(messageText) === true;
      const reply_message_id = reply_to_message.message_id;

      bot.deleteMessage(msg.chat.id, msg.message_id);
      bot.deleteMessage(msg.chat.id, reply_message_id);
      let res_msg;
      let isSwap: boolean = false;
      if (isNumber) {
        const value = Number(messageText);
        console.log("value", value);
        switch (text) {
          case BotCaption.SET_JITOFEE.replace(/<[^>]*>/g, ""):
            console.log("SET_JITOFEE", value);
            userData.jito_fee = value;
            userdataList.set(msg.chat.id, userData);
            res_msg = `Set to ${value}`;
            break;
          case BotCaption.SET_SNIPE_AMOUNT.replace(/<[^>]*>/g, ""):
            console.log("SET_SNIPE_AMOUNT", value);
            userData.snipe_amnt = value;
            userdataList.set(msg.chat.id, userData);
            res_msg = `Set to ${value}`;
            break;
          case BotCaption.SET_SLIPPAGE.replace(/<[^>]*>/g, ""):
            console.log("SET_SLIPPAGE", value);
            userData.slippage = value;
            userdataList.set(msg.chat.id, userData);
            res_msg = `Set to ${value}`;
            break;
          case BotCaption.strInputSwapSolAmount.replace(/<[^>]*>/g, ""):
            console.log("SET_SOL_AMOUNT", value);
            isSwap = true;
            const private_key = userData?.private_key || PRIVATE_KEY;

            console.log("1");
            // check balance
            const wallet = Keypair.fromSecretKey(bs58.decode(private_key));
            console.log("2");
            const solBal = await connection.getBalance(wallet.publicKey);
            const _tip_tmp = userData?.jito_fee || _tip;
            console.log("3");
            if (Number(solBal) <= value + _tip_tmp + 0.003) {
              res_msg = `⚠️ You don't have enough SOL to complete this transaction.⚠️\n Please top up your SOL balance.\nCurrent SOL balance: ${solBal} SOL`;
              const m_g = await bot.sendMessage(msg.chat.id, `Set as ${res_msg}`);
              return;
            }
            console.log("4");
            const swapParam: SwapParam = {
              private_key: private_key,
              mint: new PublicKey(messageText),
              amount: value,
              slippage: userData?.slippage || _slippage,
              tip: userData?.jito_fee || _tip,
              is_buy: _is_buy,
            };
            console.log("5");
            const txHash = await swap(swapParam);
            console.log("6");
            sendSwapTxMsg(bot, msg.chat.id, txHash);
            console.log("7");
            break;
        }
      }
      if (!isSwap) {
        console.log("8");
        const inline_keyboard = await getSettingCaption(userData);
        const settingMsgId = userData.msg_id;
        const m_g = await bot.sendMessage(msg.chat.id, `Set as ${res_msg}`);
        setTimeout(() => {
          bot.deleteMessage(msg.chat.id, m_g.message_id);
        }, 1000);
        bot.editMessageReplyMarkup(
          { inline_keyboard },
          {
            message_id: Number(settingMsgId),
            chat_id: msg.chat.id,
          }
        );
      }
    }
    else{
      const isCA = await isValidSolanaAddress(messageText);
      if (isCA) {
        await sendTokenInfoMsg(bot, msg.chat.id, messageText);
      } else {
        // bot.sendMessage(chatId, BotCaption.strInvalidSolanaTokenAddress);
      }
    }
  } catch (error) {
    console.log("-messageHandler-", error);
  }
};

export const sendTokenInfoMsg = async (
  bot: TelegramBot,
  chatId: number,
  ca: string
) => {
  const tokenInfo = await getTokenInfoFromMint(ca);
  // console.log("new token info", tokenInfo);
  const Info = `New Token Address detected.
${tokenInfo.name} (<b>${tokenInfo.symbol}</b>)
Please enter the amount of <b>${tokenInfo.symbol}</b> you want to buy.`;

  const inline_keyboard = [
    [
      { text: "💰 Buy 0.1 SOL", callback_data: BotCallBack.SWAP_SOL_01 },
      { text: "💰 Buy 0.3 SOL", callback_data: BotCallBack.SWAP_SOL_02 },
      { text: "💰 Buy X SOL", callback_data: BotCallBack.SWAP_SOL_x },
    ],
  ];

  bot.sendMessage(chatId, Info, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard,
    },
  });
};

export const sendSwapTxMsg = (
  bot: TelegramBot,
  chatId: number,
  txHash: string
) => {
  bot.sendMessage(chatId, `https://solscan.io/tx/${txHash}`, {
    parse_mode: "HTML",
    disable_web_page_preview: false,
  });
};
