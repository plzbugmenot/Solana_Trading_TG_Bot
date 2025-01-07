import { Keypair } from "@solana/web3.js";
import { UserData } from "../../utils/type";
import bs58 from "bs58";
import { getWalletBalance } from "../../utils/utils";
import { DISMISS_COMMAND, JITOFEE_COMMAND, PK_COMMAND } from "../../config/const";

export const getSettingCaption = async (userData: UserData) => {
  const wallet = Keypair.fromSecretKey(bs58.decode(userData.private_key));
  const solBal = await getWalletBalance(wallet.publicKey);

  const inline_keyboard_setting = [
    [
      {
        text: `💳 Wallet (${solBal} SOL)`,
        callback_data: JSON.stringify({
          command: PK_COMMAND,
        }),
      },
    ],
    [
      {
        text: `💸 Jito_Fee: ${userData.jito_fee} SOL`,
        callback_data: JSON.stringify({
          command: JITOFEE_COMMAND,
        }),
      },
    ],
    [
      {
        text: "❌ Close",
        callback_data: JSON.stringify({
          command: DISMISS_COMMAND,
        }),
      },
    ],
  ];
  return inline_keyboard_setting;
};
