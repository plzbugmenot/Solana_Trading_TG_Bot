export const HTML_MODE = {
  parse_mode: "HTML",
  disable_web_page_preview: true,
};

export const HelpCaption = `🚀 TG Solana Trading Bot 🚀`;

export const strWelcome =
  `<b>Welcome to Solana Trading bot</b> 🎉\n\n` +
  `The Unique Solana Trading Bot.\n`;
export const PK_COMMAND = "pk_message";
export const RUN_COMMAND = "run_message";
export const TIMECHECK_COMMAND = "timecheck_message";
export const SNIPE_AMOUNT_COMMAND = "snipe_amount_message";
export const JITOFEE_COMMAND = "jitofee_buy_message";
export const T_FROM_COMMAND = "t_from_message";
export const T_TO_COMMAND = "t_to_message";
export const DISMISS_COMMAND = "dismiss_message";
export const SET_DES = `⚙ User Setting.
You can set any settings on here. You can set any settings on here.`;
export const inline_keyboard_close = [
  [
    {
      text: "❌ Close",
      callback_data: JSON.stringify({
        command: DISMISS_COMMAND,
      }),
    },
  ],
];
export const SET_JITOFEE = `💸 Jito Tip SOL Amount \n\n<i>💲 Enter SOL Value in format "0.0X"</i>`;
export const SET_PK = `🔑 Private KEY \n\n<i>💲 Enter Wallet Private KEY</i>`;
