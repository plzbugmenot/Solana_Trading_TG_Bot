import TelegramBot from "node-telegram-bot-api";
import {
  _is_buy,
  _slippage,
  _tip,
  TG_BOT_TOKEN,
} from "./config/config";
import {
  addNewUser,
  isNewUser,
  userdataList,
} from "./service/userService/user.service";
import { getSettingCaption } from "./service/setting/setting";
import { callbackQueryHandler } from "./service/bot/callback.handler";
import {
  messageHandler,
  sendTokenInfoMsg,
} from "./service/bot/message.handler";
import { isValidSolanaAddress } from "./utils/utils";
import logger from "./logs/logger";
import { BotCaption, BotMenu } from "./config/constants";

const start_bot = () => {
  logger.info("🚀 Starting bot...");
  // Create a bot that uses 'polling' to fetch new updates
  if (!TG_BOT_TOKEN) return;
  try {
    const bot = new TelegramBot(TG_BOT_TOKEN, { polling: true });
    bot.setMyCommands(BotMenu);

    bot.onText(/\/start/, async (msg: TelegramBot.Message) => {
      const username = msg.chat.username;
      if (!username) return;
      if (isNewUser(msg.chat.id)) addNewUser(msg.chat.id, username);
      const caption = `🎉 @${msg.chat.username}, ${BotCaption.strWelcome}`;
      bot.sendMessage(msg.chat.id, caption, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
    });

    bot.onText(/\/setting/, async (msg: TelegramBot.Message) => {
      try {
        const username = msg.chat.username;
        if (!username) return;
        if (isNewUser(msg.chat.id)) addNewUser(msg.chat.id, username);
        const userData = userdataList.get(msg.chat.id);
        if (!userData) return;
        const inline_keyboard = await getSettingCaption(userData);
        const sentMsg = await bot.sendMessage(msg.chat.id, BotCaption.SET_DES, {
          parse_mode: "HTML",
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard,
          },
        });
        if (userData.msg_id) bot.deleteMessage(msg.chat.id, userData.msg_id);
        userData.msg_id = sentMsg.message_id;
        userdataList.set(msg.chat.id, userData);
      } catch (e) {
        console.log(e);
      }
    });
    bot.onText(/\/help/, async (msg: TelegramBot.Message) => {
      bot.sendMessage(msg.chat.id, BotCaption.HelpCaption);
    });
    bot.on("message", (msg: TelegramBot.Message) => {
      messageHandler(bot, msg);
    });
    bot.on("callback_query", async (cb_query: TelegramBot.CallbackQuery) => {
      callbackQueryHandler(bot, cb_query);
    });
  } catch (error) {
    console.log(error);
  }
};

start_bot();
