export enum BotCallBack {
  PK_COMMAND = "pk_message",
  RUN_COMMAND = "run_message",
  TIMECHECK_COMMAND = "timecheck_message",
  SNIPE_AMOUNT_COMMAND = "snipe_amount_message",
  SLIPPAGE_COMMAND = "slippage_message",
  JITOFEE_COMMAND = "jitofee_buy_message",
  T_FROM_COMMAND = "t_from_message",
  T_TO_COMMAND = "t_to_message",
  DISMISS_COMMAND = "dismiss_message",
  AUTO_COMMAND = "auto_message",
  AUTO_AMOUNT_COMMAND = "auto_amount_message",

  SWAP_SOL_01 = "swapsol_1",
  SWAP_SOL_02 = "swapsol_2",
  SWAP_SOL_x = "swapsol_x",
}

export enum BotCaption {
  strInputSwapSolAmount = `💰 Enter Swap SOL Amount`,
  strInvalidSolAmount = `⚠️ Invalid Swap SOL Amount ⚠️`,
  strInvalidSolanaTokenAddress = `⚠️ Invalid Solana Token Address ⚠️`,

  HelpCaption = `🚀 TG Solana Trading Bot 🚀`,

  strWelcome = `<b>Welcome to Solana Trading bot</b> 🎉\n\nThe Unique Solana Trading Bot.\n`,

  SET_JITOFEE = `💸 Jito Tip SOL Amount \n\n<i>💲 Enter SOL Value in format "0.0X"</i>`,
  SET_SNIPE_AMOUNT = `💰 Snipe Amount \n\n<i>💲 Enter Snipe Amount in format "0.0X"</i>`,
  SET_SLIPPAGE = `⚖ Slippage \n\n<i>💲 Enter Slippage in format "xx%"</i>`,
  SET_PK = `🔑 Private KEY \n\n<i>💲 Enter Wallet Private KEY</i>`,

  SET_DES = `⚙ User Setting.\nYou can set any settings on here. You can set any settings on here.`,

  SWAP_FAILED = `⚠️ Swap Failed ⚠️`,

  AUTO_SWAP_ON = "🔔 Auto Swap ON",
  AUTO_SWAP_OFF = "🔕 Auto Swap OFF",
}

export const HTML_MODE = { parse_mode: "HTML" };

export const REPLY_MODE = {
  parse_mode: "HTML" as const,
  reply_markup: {
    force_reply: true,
  },
};

export const inline_keyboard_close = [
  [
    {
      text: "❌ Close",
      callback_data: BotCallBack.DISMISS_COMMAND,
    },
  ],
];

export const BotMenu = [
  {
    command: "start",
    description: "💥 Start",
  },
  {
    command: "setting",
    description: "⚙️ setting",
  },
  {
    command: "position",
    description: "💰 Position",
  },
  { command: "help", description: "❓ Help" },
];

export const AutoSwapAmount = [0.00001, 0.00002];
