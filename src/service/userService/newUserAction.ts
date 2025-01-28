import TelegramBot from "node-telegram-bot-api";
import { userService } from "../../config/config";
import {
  addNewUser,
  decToHex,
  generateReferalLink,
  getWalletBalance,
  shortenAddress,
} from "../../utils/utils";
import { BotCallBack, BotCaption } from "../../config/constants";
import { Keypair } from "@solana/web3.js";

import bs58 from "bs58";

export const startCmdAction = async (
  bot: TelegramBot,
  msg: TelegramBot.Message
) => {
  const isNewUser = await userService.isNewUser(msg.chat.id);
  if (isNewUser) {
    const totalUsers = (await userService.getAllUsers()).length;
    const newUserMsg = `You are currently the <b>${totalUsers}</b> on the waitlist for early access 🎖.

We will noify you as soon ass you have access!

<b>If you have an access code, please paste the link below to get started.</b>`;

    await bot.sendMessage(msg.chat.id, newUserMsg, {
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
  } else {
    // old user
    try {
      const UserData = await userService.getUserById(msg.chat.id);
      if (!UserData) return;
      // input referal link: https://t.me/zeussolbot?start=ref_F64RFI5N76
      const publicKey = Keypair.fromSecretKey(
        bs58.decode(UserData.private_key)
      ).publicKey;
      const solBal = await getWalletBalance(publicKey);
      const caption =
        `Hi, ` +
        (UserData.username
          ? `@${UserData.username}`
          : `🎉 ${UserData.first_name || ""} ${UserData.last_name || ""}`) +
        `\n${BotCaption.strWelcome}
Wallet address: ${shortenAddress(publicKey.toBase58(), 6)}
Wallet balance: ${solBal} SOL

🔗Referral link: <code>${generateReferalLink(UserData.userid)}</code>

✔️Send contract address to start trading. Please follow official accounts for more info and help.

Docs | Twitter | Telegram
`;
      const inline_keyboard_start = [
        [
          {
            text: "⚙ Settings",
            callback_data: BotCallBack.SETTING_COMMAND,
          },
          {
            text: "🔎 Snipe",
            callback_data: BotCallBack.SNIPER_COMMAND,
          },
        ],
        [
          {
            text: "👨‍👩‍👧 Copy Trading",
            callback_data: BotCallBack.COPY_TRADING_COMMAND,
          },
          {
            text: "🗣 Language",
            callback_data: BotCallBack.LANGUAGE_COMMAND,
          },
        ],
      ];

      await bot.sendMessage(msg.chat.id, caption, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: inline_keyboard_start,
        },
      });
    } catch (error) {
      console.log("error", error);
    }
  }
};
