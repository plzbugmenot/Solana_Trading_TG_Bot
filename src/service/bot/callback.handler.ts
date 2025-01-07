import TelegramBot from "node-telegram-bot-api";
import { userdataList } from "../userService/user.service";
import { DISMISS_COMMAND, inline_keyboard_close, JITOFEE_COMMAND, PK_COMMAND, RUN_COMMAND, SET_JITOFEE, SET_PK } from "../../config/const";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { copy2clipboard } from "../../utils/utils";
import { getSettingCaption } from "../setting/setting";



export const callbackQueryHandler = async (
  bot: TelegramBot,
  cb_query: TelegramBot.CallbackQuery
) => {
  try {
    const { data: cbData, message: cbMsg } = cb_query;
    if (!cbData || !cbMsg) return;

    const data = JSON.parse(cbData);
    const opts = {
      chat_id: cbMsg.chat.id,
      message_id: cbMsg.message_id,
    };

    const userData = userdataList.get(opts.chat_id);
    if (!userData) return;
    let Set_COMMAND;
    if (data.command.includes(DISMISS_COMMAND)) {
      bot.deleteMessage(opts.chat_id, opts.message_id);
      return;
    }else if (data.command.includes(PK_COMMAND)) {
      const wallet = Keypair.fromSecretKey(bs58.decode(userData.private_key)).publicKey.toBase58();
      const caption = `⚠️ <b>Don't share your wallet private key</b> ⚠️\n\n💳 Your wallet: ${copy2clipboard(wallet)}\n🔑 Private Key: <tg-spoiler><i>${userData.private_key}</i></tg-spoiler>`;
      bot.sendMessage(opts.chat_id, caption, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {   
          inline_keyboard: inline_keyboard_close
        },
      });
      return;
    } else if (data.command.includes(RUN_COMMAND)) {
      userData.is_on = !userData.is_on;
      userdataList.set(opts.chat_id, userData);
      const inline_keyboard = await getSettingCaption(userData);
      bot.editMessageReplyMarkup({ inline_keyboard }, opts);
      return;
    } else if (data.command.includes(JITOFEE_COMMAND)) {
      Set_COMMAND = SET_JITOFEE;
    } else if (data.command.includes(PK_COMMAND)) {
      Set_COMMAND = SET_PK;
    } else {
      return;
    }

    bot.sendMessage(cbMsg.chat.id, Set_COMMAND, {
      parse_mode: "HTML",
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (error) {
    console.log("-callbackQueryHandler-", error);
  }
};