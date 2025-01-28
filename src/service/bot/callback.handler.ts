import TelegramBot from "node-telegram-bot-api";
import {
  AutoSwapAmount,
  BotCallBack,
  BotCaption,
  inline_keyboard_close,
} from "../../config/constants";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { addNewUser, copy2clipboard } from "../../utils/utils";
import { getSettingCaption } from "../inline_key/setting";
import { msgService, userService } from "../../config/config";
import { buySwap } from "../swap/swap";

export const callbackQueryHandler = async (
  bot: TelegramBot,
  cb_query: TelegramBot.CallbackQuery
) => {
  try {
    const cb_query_cmd = cb_query.data; // This contains your SWAP_SOL_01, SWAP_SOL_02 etc
    // console.log("cb_query.data => ", data);
    let ca = null;
    const chatId = cb_query.message?.chat.id;
    const messageId = cb_query.message?.message_id || 0;
    if (!cb_query_cmd || !chatId) return;

    // Check if user exists and create if not
    const isNewUser = await userService.isNewUser(chatId);
    if (isNewUser) {
      await addNewUser(
        chatId,
        cb_query.from.username,
        cb_query.from.first_name,
        cb_query.from.last_name
      );
    }

    const userData = await userService.getUserById(chatId);
    if (!userData) return;
    let Set_COMMAND;
    switch (cb_query_cmd) {
      case BotCallBack.DISMISS_COMMAND:
        console.log("DISMISS_COMMAND");
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
      case BotCallBack.AUTO_COMMAND:
        await userService.updateAutoMode(chatId, !userData.swap.auto);
        const updated_userData = await userService.getUserById(chatId);
        if (!updated_userData) return;
        const inline_keyboard = await getSettingCaption(updated_userData);
        // console.log("inline_keyboard", inline_keyboard);
        await bot.editMessageReplyMarkup(
          { inline_keyboard },
          {
            message_id: updated_userData.setting_msg_id,
            chat_id: chatId,
          }
        );
        Set_COMMAND = updated_userData.swap.auto
          ? BotCaption.AUTO_SWAP_ON
          : BotCaption.AUTO_SWAP_OFF;
        break;
      default:
        const detected_command = cb_query_cmd.split("_");
        if (detected_command[0] === "swapsol") {
          ca = detected_command[2];
          if (detected_command[1] === "x") {
            Set_COMMAND = BotCaption.strInputSwapSolAmount;
            break;
          } else {
            const idx = Number(detected_command[1]) - 1;
            const swapAmount = AutoSwapAmount[idx];
            buySwap(bot, chatId, userData, swapAmount, ca);
          }
        }
        return;
    }

    const sendMsg = await bot.sendMessage(chatId, Set_COMMAND, {
      parse_mode: "HTML",
      reply_markup: {
        force_reply: cb_query_cmd !== BotCallBack.AUTO_COMMAND ? true : false,
      },
    });
    if (ca) msgService.saveMessage(sendMsg.message_id, chatId, ca);
  } catch (error) {
    console.log("-callbackQueryHandler-", error);
  }
};
