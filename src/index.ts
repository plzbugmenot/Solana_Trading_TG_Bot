import TelegramBot from "node-telegram-bot-api";
import {
  _amount,
  _is_buy,
  _slippage,
  _tip,
  connection,
  PRIVATE_KEY,
  TG_BOT_TOKEN,
} from "./config/config";
import {
  addNewUser,
  isNewUser,
  userdataList,
} from "./service/userService/user.service";
import { HelpCaption, SET_DES, strWelcome } from "./config/const";
import { getSettingCaption } from "./service/setting/setting";
import { callbackQueryHandler } from "./service/bot/callback.handler";
import { messageHandler } from "./service/bot/message.handler";
import { getTokenInfoFromMint, isValidSolanaAddress } from "./utils/utils";
import { SwapParam } from "./utils/type";
import { Keypair, PublicKey } from "@solana/web3.js";
import { swap } from "./service/swap/swap";
import bs58 from "bs58";

const start_bot = () => {
  console.log("🚀 Starting bot...");
  // Create a bot that uses 'polling' to fetch new updates
  if (!TG_BOT_TOKEN) return;
  try {
    const bot = new TelegramBot(TG_BOT_TOKEN, { polling: true });

    // Listen for any kind of message. There are different kinds of messages.
    bot.on("message", async (msg) => {
      const chatId = msg.chat.id;
      const messageText = msg.text || "";
      const isCA = await isValidSolanaAddress(messageText);
      if (isCA) {
        // bot.sendMessage(chatId, "✅ Valid Solana token address detected: " + messageText);
        // Here you can add additional logic to handle the token address
        // TODO token info
        const tokenInfo = await getTokenInfoFromMint(messageText);

        const Info = `${tokenInfo.name} (${tokenInfo.symbol})`;
        console.log("new token info", Info);

        // TODO ASK user for amount
        const private_key = userdataList.get(chatId)?.private_key || "";
        const swapParam: SwapParam = {
          private_key: private_key,
          mint: new PublicKey(messageText),
          amount: _amount,
          slippage: _slippage,
          tip: _tip,
          is_buy: _is_buy,
        };
        // TODO check balance
        const wallet = Keypair.fromSecretKey(bs58.decode(private_key));
        const solBal = await connection.getBalance(wallet.publicKey);
        const caption = `⚠️ Please check your wallet SOL balance ⚠️\n Current Balance: ${solBal}SOL`;
        if(Number(solBal) <= _amount + _tip + 0.003) return bot.sendMessage(chatId, caption);

        // 
        const txHash = await swap(swapParam);
        bot.sendMessage(
          chatId,
          `${Info}\nhttps://solscan.io/tx/${txHash}`,
          {
            parse_mode: "HTML",
            disable_web_page_preview: false,
          }
        );
      } else {
        // bot.sendMessage(chatId, "This is not a valid Solana token address");
      }
    });

    bot.onText(/\/start/, async (msg: TelegramBot.Message) => {
      const username = msg.chat.username;
      if (!username) return;
      if (isNewUser(msg.chat.id)) addNewUser(msg.chat.id, username);
      const caption = `🎉 @${msg.chat.username}, ${strWelcome}`;
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
        const sentMsg = await bot.sendMessage(msg.chat.id, SET_DES, {
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
      bot.sendMessage(msg.chat.id, HelpCaption);
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
