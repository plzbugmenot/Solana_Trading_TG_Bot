import TelegramBot from "node-telegram-bot-api";
import {
  bot,
  userService,
} from "./config/config";
import { getSettingCaption } from "./service/inline_key/setting";
import { callbackQueryHandler } from "./service/bot/callback.handler";
import { messageHandler } from "./service/bot/message.handler";
import { addNewUser, contractLink, hexToDec } from "./utils/utils";
import logger from "./logs/logger";
import { BotCaption, BotMenu } from "./config/constants";
import { connectDatabase } from "./config/db";
import { getWalletTokens } from "./service/token/token";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { newUserCreateAction } from "./service/userService/newUserAction";

const start_bot = () => {
  connectDatabase();
  logger.info("🚀 Starting bot...");
  try {
    bot.setMyCommands(BotMenu);

    // Handle plain /start command
    bot.onText(/^\/start$/, async (msg: TelegramBot.Message) => {
      await newUserCreateAction(bot, msg);
    });

    // Handle /start with referral code
    bot.onText(
      /\/start (.+)/,
      async (msg: TelegramBot.Message, match: RegExpExecArray | null) => {
        if (!match) return;

        const chatId = msg.chat.id;
        const referralCode = match[1];

        const existingUser = await userService.getUserById(chatId);

        if (!existingUser) {
          await newUserCreateAction(bot, msg);

          const userData = await userService.getUserById(chatId);
          if (!userData) return;

          const ReferDecNumber = hexToDec(referralCode);
          const refer_user = await userService.getUserById(ReferDecNumber);

          if (!refer_user) {
            bot.sendMessage(chatId, BotCaption.strInvalidReferUser);
            return;
          }
          if (refer_user.userid === userData.userid) return; // yourself refer

          await userService.setParent(userData.userid, ReferDecNumber);
          bot.sendMessage(
            chatId,
            `👍 You have been joined this bot from @${refer_user.username}`
          );
          bot.sendMessage(
            refer_user.userid,
            `@${userData.username} has referred you.`
          );
        }
      }
    );

    bot.onText(/\/setting/, async (msg: TelegramBot.Message) => {
      try {
        const isNewUser = await userService.isNewUser(msg.chat.id);
        if (isNewUser) await addNewUser(
          msg.chat.id,
          msg.chat.username,
          msg.chat.first_name,
          msg.chat.last_name
        );
        const userData = await userService.getUserById(msg.chat.id);
        if (!userData) return;
        const inline_keyboard = await getSettingCaption(userData);
        const sentMsg = await bot.sendMessage(msg.chat.id, BotCaption.SET_DES, {
          parse_mode: "HTML",
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard,
          },
        });
        if (userData.setting_msg_id)
          bot.deleteMessage(msg.chat.id, userData.setting_msg_id);
        userService.updateUser(msg.chat.id, {
          setting_msg_id: sentMsg.message_id,
        });
      } catch (e) {
        console.log(e);
      }
    });
    bot.onText(/\/help/, async (msg: TelegramBot.Message) => {
      bot.sendMessage(msg.chat.id, BotCaption.HelpCaption);
    });
    bot.onText(/\/position/, async (msg: TelegramBot.Message) => {
      const userData = await userService.getUserById(msg.chat.id);
      if (!userData) return;
      const wallet = Keypair.fromSecretKey(bs58.decode(userData.private_key));
      // const snipingTokens = await getSnipingTokens(userData.userid, wallet);
      const snipingTokens = await getWalletTokens(wallet);
      const caption =
        snipingTokens.length > 0
          ? snipingTokens
              .map((token) => {
                return `🔥 ${contractLink(token.mint)} ${token.amount}`;
              })
              .join("\n")
          : "No Sniping Tokens";
      bot.sendMessage(msg.chat.id, caption, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
      });
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
