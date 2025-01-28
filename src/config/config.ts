import TelegramBot from "node-telegram-bot-api";
import * as dotenv from "dotenv";
import { Commitment, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import { UserService } from "../model/user.service";
import { BotMessageService } from "../service/msgService/msgService";
import { SwapTxnService } from "../model/txn.service";
dotenv.config();

export const rpcUrl: string =
  process.env.RPC_URL || "https://api.mainnet-beta.solana.com";
export const wssUrl: string =
  process.env.WSS_URL || "ws://api.mainnet-beta.solana.com";

export const MONGO_URL = process.env.MONGO_URI || "";

export const connection = new Connection(rpcUrl, { wsEndpoint: wssUrl });
export const metaplex = new Metaplex(connection);
export const COMMITMENT_LEVEL = "confirmed" as Commitment;
export const PUMP_WALLET = new PublicKey(
  "39azUYFWPz3VHgKCf3VChUwbpURdCHRxjWVowf5jUJjg"
);
export const blockEngineUrl = "tokyo.mainnet.block-engine.jito.wtf";

export const TG_BOT_TOKEN = process.env.BOT_TOKEN;

export const config = {
  logPath: "src/logs/logs",
  logLevel: "info",
  lastBlock_Update_cycle: 1000,
};
const bot_wallet_pub_key =
  process.env.BOT_WALLET_PUBLIC_KEY ||
  "54YAAqshj8BD5WJCsfy9vSCpgK8pC9NqW2cuKPrbUZqp";
export const BOT_WALLET = new PublicKey(bot_wallet_pub_key);

export const MAX_CHECK_JITO = 20;
export const GasFee = 0.0001;
export const CU = 100_000;

export const userService = new UserService();
export const msgService = new BotMessageService();
export const txnService = new SwapTxnService();

export const bot = new TelegramBot(TG_BOT_TOKEN!, {
  polling: true,
  webHook: false,
  onlyFirstMatch: true,
  filepath: false,
});

let INVITE_LINK_HEADER: string;

// Initialize the invite link
(async () => {
  const botInfo = await bot.getMe();
  INVITE_LINK_HEADER = `https://t.me/${botInfo.username}`;
})();

export { INVITE_LINK_HEADER };

export const REFER_PERCENT = [80, 3, 1.5, 1, 0.5];
export const BOT_FEE_PERCENT = 50; // 1%
export const USER_DISCOUNT_PERCENT = 10; // 10%
