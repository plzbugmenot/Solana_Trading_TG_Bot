import { Keypair } from "@solana/web3.js";
import { UserData } from "../../utils/type";
import bs58 from "bs58";
import { getWalletBalance } from "../../utils/utils";
import { BotCallBack } from "../../config/constants";

export const getSettingCaption = async (userData: UserData) => {
  const wallet = Keypair.fromSecretKey(bs58.decode(userData.private_key));
  // console.log(userData);
  const solBal = await getWalletBalance(wallet.publicKey);

  const inline_keyboard_setting = [
    [
      {
        text: `💳 Wallet (${solBal} SOL)`,
        callback_data: BotCallBack.PK_COMMAND,
      },
    ],
    [
      {
        text: `💰 Swap_Amount: ${userData.snipe_amnt} SOL`,
        callback_data: BotCallBack.SNIPE_AMOUNT_COMMAND,
      },
    ],
    [
      {
        text: `💸 Jito_Fee: ${userData.jito_fee} SOL`,
        callback_data: BotCallBack.JITOFEE_COMMAND,
      },
      {
        text: `⚖ Slippage: ${userData.slippage} %`,
        callback_data: BotCallBack.SLIPPAGE_COMMAND,
      },
    ],
    [
      {
        text: "❌ Close",
        callback_data: BotCallBack.DISMISS_COMMAND,
      },
    ],
  ];
  return inline_keyboard_setting;
};
