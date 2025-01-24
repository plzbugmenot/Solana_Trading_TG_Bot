import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { getWalletBalance } from "../../utils/utils";
import { BotCallBack } from "../../config/constants";
import { IUser } from "../../utils/type";

export const getSettingCaption = async (userData: IUser) => {
  const wallet = Keypair.fromSecretKey(bs58.decode(userData.private_key));
  // console.log(userData);
  const solBal = await getWalletBalance(wallet.publicKey);
  const auto = userData.auto ? "✅" : "❌";
  const snipe_amnt = userData.snipe_amnt;

  const inline_keyboard_setting = [
    [
      {
        text: `💳 Wallet (${solBal} SOL)`,
        callback_data: BotCallBack.PK_COMMAND,
      },
    ],
    [
      {
        text: "🤖 Auto Buy/Sell " + auto,
        callback_data: BotCallBack.AUTO_COMMAND,
      },
      {
        text: `💰 Swap Auto Amount ${snipe_amnt} SOL`,
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
