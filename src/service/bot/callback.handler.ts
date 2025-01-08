import TelegramBot from "node-telegram-bot-api";
import { userdataList } from "../userService/user.service";
import {
  BotCallBack,
  BotCaption,
  inline_keyboard_close,
} from "../../config/constants";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { copy2clipboard } from "../../utils/utils";
import { getSettingCaption } from "../setting/setting";

export const callbackQueryHandler = async (
  bot: TelegramBot,
  cb_query: TelegramBot.CallbackQuery
) => {
  try {
    const data = cb_query.data; // This contains your SWAP_SOL_01, SWAP_SOL_02 etc
    console.log("cb_query.data => ", data);
    const chatId = cb_query.message?.chat.id;
    const messageId = cb_query.message?.message_id || 0;
    if (!data || !chatId) return;

    const userData = userdataList.get(chatId);
    if (!userData) return;
    let Set_COMMAND;
    switch (data) {
      case BotCallBack.DISMISS_COMMAND:
        bot.deleteMessage(chatId, messageId);
        return;

      case BotCallBack.PK_COMMAND:
        const wallet = Keypair.fromSecretKey(
          bs58.decode(userData.private_key)
        ).publicKey.toBase58();
        const caption = `⚠️ <b>Don't share your wallet private key</b> ⚠️\n\n💳 Your wallet: ${copy2clipboard(
          wallet
        )}\n🔑 Private Key: <tg-spoiler><i>${
          userData.private_key
        }</i></tg-spoiler>`;
        bot.sendMessage(chatId, caption, {
          parse_mode: "HTML",
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: inline_keyboard_close,
          },
        });
        return;

      case BotCallBack.RUN_COMMAND:
        userData.is_on = !userData.is_on;
        userdataList.set(chatId, userData);
        const inline_keyboard = await getSettingCaption(userData);
        bot.editMessageReplyMarkup(
          { inline_keyboard },
          {
            chat_id: chatId,
            message_id: messageId,
          }
        );
        return;

      case BotCallBack.JITOFEE_COMMAND:
        Set_COMMAND = BotCaption.SET_JITOFEE;
        break;

      case BotCallBack.PK_COMMAND:
        Set_COMMAND = BotCaption.SET_PK;
        break;

      case BotCallBack.SNIPE_AMOUNT_COMMAND:
        Set_COMMAND = BotCaption.SET_SNIPE_AMOUNT;
        break;

      case BotCallBack.SLIPPAGE_COMMAND:
        Set_COMMAND = BotCaption.SET_SLIPPAGE;
        break;

      case BotCallBack.SWAP_SOL_01:
        console.log("SWAP_SOL_01");
        return;

      case BotCallBack.SWAP_SOL_02:
        console.log("SWAP_SOL_02");
        return;

      case BotCallBack.SWAP_SOL_x:
        Set_COMMAND = BotCaption.strInputSwapSolAmount;
        break;

      default:
        return;
    }

    bot.sendMessage(chatId, Set_COMMAND, {
      parse_mode: "HTML",
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (error) {
    console.log("-callbackQueryHandler-", error);
  }
};
