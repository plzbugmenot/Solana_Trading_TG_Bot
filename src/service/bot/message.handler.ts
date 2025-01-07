import TelegramBot from "node-telegram-bot-api";
import { userdataList } from "../userService/user.service";
import { getSettingCaption } from "../setting/setting";
import { SET_JITOFEE } from "../../config/const";

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
      if (isNumber) {
        const amount = Number(messageText);
        if (text === SET_JITOFEE.replace(/<[^>]*>/g, ""))
          userData.jito_fee = amount;

        userdataList.set(msg.chat.id, userData);
        res_msg = `Set to ${amount}`;
      }
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
  } catch (error) {
    console.log("-messageHandler-", error);
  }
};
