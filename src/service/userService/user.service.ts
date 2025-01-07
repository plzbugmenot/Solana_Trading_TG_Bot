import { Keypair } from "@solana/web3.js";
import { UserData } from "../../utils/type";
import bs58 from "bs58";
import { saveUserData } from "../../logs/userData";

export const userdataList = new Map<number, UserData>();

export const isNewUser = (chatid: number) => {
  if (userdataList.get(chatid) == undefined) {
    return true;
  }
  return false;
};

export const addNewUser = (chatid: number, username: string) => {
  const private_key = bs58.encode(Keypair.generate().secretKey);
  const newUser: UserData = {
    username,
    private_key,
    snipe_amnt: 0.01,
    jito_fee: 0.01,
    from_t: 0,
    to_t: 24,
    is_on: false,
    t_on: false,
  };
  saveUserData(newUser);
  userdataList.set(chatid, newUser);
};
