import TelegramBot from "node-telegram-bot-api";
import { getSettingCaption } from "../inline_key/setting";
import {
  AutoSwapAmount,
  BotCallBack,
  BotCaption,
} from "../../config/constants";
import {
  getTokenInfoFromMint,
  hexToDec,
  isReferralLink,
  isValidSolanaAddress,
  txnLink,
} from "../../utils/utils";
import {
  _is_buy,
  _slippage,
  _tip,
  msgService,
  userService,
} from "../../config/config";
import { buySwap } from "../swap/swap";
import logger from "../../logs/logger";

export const messageHandler = async (
  bot: TelegramBot,
  msg: TelegramBot.Message
) => {
  try {
    const messageText = msg.text;
    const userData = await userService.getUserById(msg.chat.id);
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
        switch (text) {
          case BotCaption.SET_JITOFEE.replace(/<[^>]*>/g, ""):
            // console.log("SET_JITOFEE", value);
            userData.jito_fee = value;
            await userService.updateUser(msg.chat.id, {
              jito_fee: value,
            });
            res_msg = `Set to ${value}`;
            break;
          case BotCaption.SET_SNIPE_AMOUNT.replace(/<[^>]*>/g, ""):
            // console.log("SET_SNIPE_AMOUNT", value);
            userData.snipe_amnt = value;
            await userService.updateUser(msg.chat.id, {
              snipe_amnt: value,
            });
            res_msg = `Set to ${value}`;
            break;
          case BotCaption.SET_SLIPPAGE.replace(/<[^>]*>/g, ""):
            // console.log("SET_SLIPPAGE", value);
            userData.slippage = value;
            await userService.updateUser(msg.chat.id, {
              slippage: value,
            });
            res_msg = `Set to ${value}`;
            break;
          case BotCaption.strInputSwapSolAmount.replace(/<[^>]*>/g, ""):
            // console.log("strInputSwapSolAmount", value);
            isSwap = true;
            const tmpMsg = await msgService.getMessageById(
              Number(reply_message_id),
              Number(userData.userid)
            );
            // const sss = await msgService.getMessgeByFilter({
            //   userid: Number(userData.userid),
            //   message_id: Number(reply_message_id),
            // });
            const ca = tmpMsg?.contractAddress;
            if (!ca) {
              logger.error("ca is null");
              return;
            }
            buySwap(bot, msg.chat.id, userData, value, ca);
            break;
        }
      }
      if (!isSwap) {
        const updated_userData = await userService.getUserById(userData.userid);
        if (!updated_userData) return;
        const inline_keyboard = await getSettingCaption(updated_userData);
        const settingMsgId = userData.setting_msg_id;
        const m_g = await bot.sendMessage(msg.chat.id, `Set as ${res_msg}`);
        setTimeout(() => {
          bot.deleteMessage(msg.chat.id, m_g.message_id);
        }, 1000);
        bot.editMessageReplyMarkup(
          { inline_keyboard },
          {
            message_id: settingMsgId,
            chat_id: msg.chat.id,
          }
        );
      }
    } else {
      const isCA = await isValidSolanaAddress(messageText);
      if (isCA) {
        const auto = userService.getAutoSetting(userData.userid);
        if (auto) {
          const swapAmount = userData.snipe_amnt;
          console.log("auto swap", swapAmount);
          buySwap(bot, msg.chat.id, userData, swapAmount, messageText);
        } else await sendTokenInfoMsg(bot, msg.chat.id, messageText);
      } else if (isReferralLink(messageText)) {
        // bot.sendMessage(chatId, BotCaption.strInvalidSolanaTokenAddress);
        const ReferDecNumber = hexToDec(messageText.split("?start=")[1]);
        if (userData.parent) {
          bot.sendMessage(msg.chat.id, BotCaption.strAlreadyRefer);
          return;
        }
        const refer_user = await userService.getUserById(ReferDecNumber);
        if (!refer_user) {
          bot.sendMessage(msg.chat.id, BotCaption.strInvalidReferUser);
          return;
        }
        await userService.updateUser(userData.userid, {
          parent: ReferDecNumber,
        });
        bot.sendMessage(msg.chat.id, BotCaption.strReferSuccess);
        bot.sendMessage(
          refer_user.userid,
          `${userData.username} has referred you.`
        );
      } else {
        return;
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
  let Info = "";
  // TODO no meta data case:
  if (tokenInfo)
    Info += `💎 ${tokenInfo.name.toUpperCase()} (<b>${tokenInfo.symbol}</b>)
📝 <code>${ca}</code>\n`;
  else Info += "⚠ Missing Metadata ⚠\n";
  Info += `\n💰 Please enter the amount of <b>${
    tokenInfo?.symbol || "Token"
  }</b> you want to swap.`;

  const endpoint = "_" + ca;
  const inline_keyboard = [
    [
      {
        text: `💰 Buy ${AutoSwapAmount[0]} SOL`,
        callback_data: BotCallBack.SWAP_SOL_01 + endpoint,
      },
      {
        text: `💰 Buy ${AutoSwapAmount[1]} SOL`,
        callback_data: BotCallBack.SWAP_SOL_02 + endpoint,
      },
      {
        text: "💰 Buy X SOL",
        callback_data: BotCallBack.SWAP_SOL_x + endpoint,
      },
    ],
    [
      {
        text: "❌ Close",
        callback_data: BotCallBack.DISMISS_COMMAND,
      },
    ],
  ];

  const sendMsg = await bot.sendMessage(chatId, Info, {
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: {
      inline_keyboard,
    },
  });
  // console.log("sendMsg", sendMsg.message_id);
};

export const sendSwapTxMsg = async (
  bot: TelegramBot,
  chatId: number,
  txHash: string
) => {
  const msg = `💰 Swap successful!
${txnLink(txHash)}`;
  const swapAlarm = await bot.sendMessage(chatId, msg, {
    parse_mode: "HTML",
    disable_web_page_preview: false,
  });
  return swapAlarm.message_id;
};
