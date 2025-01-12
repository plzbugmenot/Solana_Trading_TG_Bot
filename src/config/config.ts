import * as dotenv from "dotenv";
import { Commitment, Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Metaplex } from "@metaplex-foundation/js";
import { UserServiceDB } from "../service/userService/user.service";
import { BotMessageService } from "../service/msgService/msgService";
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
};

export const PRIVATE_KEY =
  "BooFWpCR6tdnnScNBCASMRjLinBXga5WfZCjkY13iDJ57TFhz8ZSnspgxwWFy4UhiD8LDgreUwkjNKmnhPSaL4U";

export const MAX_CHECK_JITO = 20;
export const GasFee = 0.0001;
export const CU = 100_000;

export const _slippage = 100; // 100 %
export const _tip = 0.000001; // 0.000001 SOL
export const _is_buy = true;
export const _amount = 0.000001; // 0.000001 SOL

export const userService = new UserServiceDB();

export const msgService = new BotMessageService();
