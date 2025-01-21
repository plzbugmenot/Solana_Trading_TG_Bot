import TelegramBot from "node-telegram-bot-api";
import { userService } from "../../config/config";
import {
  addNewUser,
  generateReferalLink,
  getWalletBalance,
  shortenAddress,
} from "../../utils/utils";
import { BotCallBack, BotCaption } from "../../config/constants";
import { Keypair } from "@solana/web3.js";

import bs58 from "bs58";

export const newUserCreateAction = async (
  bot: TelegramBot,
  msg: TelegramBot.Message
) => {
  const username = msg.chat.username;
  if (!username) return;
  const isNewUser = await userService.isNewUser(msg.chat.id);
  let UserData;
  if (isNewUser) UserData = await addNewUser(msg.chat.id, username);
  else UserData = await userService.getUserById(msg.chat.id);
  if (!UserData) return;
  // input referal link: https://t.me/zeussolbot?start=r-F64RFI5N76

  const publicKey = Keypair.fromSecretKey(
    bs58.decode(UserData.private_key)
  ).publicKey;
  const solBal = await getWalletBalance(publicKey);

  const caption = `🎉 @${msg.chat.username}, ${BotCaption.strWelcome}
Wallet address: ${shortenAddress(publicKey.toBase58())}
Wallet balance: ${solBal} SOL

🔗Referral link: <code>${generateReferalLink(UserData.userid)}</code>

✔️Send contract address to start trading. Please follow official accounts for more info and help

Docs | Twitter | Telegram

⚠️Scam Alert: Do not click on any pinned ads in Telegram❗️
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
};
