import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  connection,
  INVITE_LINK_HEADER,
  metaplex,
  REFER_PERCENT,
  userService,
} from "../config/config";
import {
  SPL_ACCOUNT_LAYOUT,
  TOKEN_PROGRAM_ID,
  TokenAccount,
} from "@raydium-io/raydium-sdk";
import { BN } from "bn.js"; // Import BN class as a value
import { IReferrePercent, IUser, PumpData } from "./type";
import axios from "axios";
import bs58 from "bs58";
import logger from "../logs/logger";

export const formatNumber = (num: number): string => {
  if (typeof num !== "number" || isNaN(num)) return "0";
  if (num === null) return "0.00";
  const absNum = Math.abs(num);
  if (absNum >= 1000000000) {
    return (Math.floor(absNum / 10000000) / 100).toFixed(2) + "B";
  } else if (absNum >= 1000000) {
    return (Math.floor(absNum / 10000) / 100).toFixed(2) + "M";
  } else if (absNum >= 1000) {
    return (Math.floor(absNum / 10) / 100).toFixed(2) + "K";
  }

  if (absNum < 1) {
    const str = num.toString();
    const [, decimal] = str.split(".");
    let zeroCount = 0;
    if (!decimal) return num.toFixed(2);
    for (const char of decimal) {
      if (char === "0") {
        zeroCount++;
      } else {
        break;
      }
    }

    if (zeroCount >= 2) {
      const subscript = zeroCount
        .toString()
        .split("")
        .map((n) => String.fromCharCode(0x2080 + parseInt(n)))
        .join("");

      const remainingDigits = parseFloat(
        `0.${decimal.slice(zeroCount)}`
      ).toFixed(4);
      return `0.0${subscript}${remainingDigits.slice(2)}`;
    }
    return num.toFixed(2);
  }
  return num.toFixed(2);
};

export const getWalletBalance = async (wallet: PublicKey): Promise<string> => {
  const userBal = await connection.getBalance(wallet);
  const solBal = userBal / LAMPORTS_PER_SOL;
  return solBal.toFixed(3);
};
export const copy2clipboard = (text: string) => {
  return `<code class="text-entity-code clickable" role="textbox" tabindex="0" data-entity-type="MessageEntityCode">${text}</code>`;
};

export const isValidSolanaAddress = async (ca: string) => {
  // Remove any whitespace and potential URL components
  const cleanCA = ca.trim().split("/").pop() || "";

  // Solana address regex pattern - matches 32-44 base58 characters
  const contractAddressMatch = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

  return contractAddressMatch.test(ca);
};

export const isReferralLink = (text: string): boolean => {
  const referralPattern = /^https:\/\/t\.me\/zeussolbot\?start=[\w\d]+$/;
  return referralPattern.test(text);
};

export async function getWalletTokenAccount(
  connection: Connection,
  wallet: PublicKey
): Promise<TokenAccount[]> {
  const walletTokenAccount = await connection.getTokenAccountsByOwner(wallet, {
    programId: TOKEN_PROGRAM_ID,
  });
  return walletTokenAccount.value.map((i) => ({
    pubkey: i.pubkey,
    programId: i.account.owner,
    accountInfo: SPL_ACCOUNT_LAYOUT.decode(i.account.data),
  }));
}

export async function sleepTime(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function bufferFromUInt64(value: number | string) {
  let buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(BigInt(value));
  return buffer;
}

export function readBigUintLE(
  buf: Buffer,
  offset: number,
  length: number
): number {
  switch (length) {
    case 1:
      return buf.readUint8(offset);
    case 2:
      return buf.readUint16LE(offset);
    case 4:
      return buf.readUint32LE(offset);
    case 8:
      return Number(buf.readBigUint64LE(offset));
  }
  throw new Error(`unsupported data size (${length} bytes)`);
}

export function calculateSplOut(pumpData: PumpData, solIn: number): number {
  const virtualSolReserves = new BN(pumpData.virtualSolReserves); // Treat as value
  const virtualTokenReserves = new BN(pumpData.virtualTokenReserves); // Treat as value

  const e = new BN(solIn); // Treat as value
  const a = virtualSolReserves.mul(virtualTokenReserves); // BN methods
  const i = virtualSolReserves.add(e);
  const l = a.div(i).add(new BN(1));
  const tokensToBuy = virtualTokenReserves.sub(l);

  return tokensToBuy.toNumber();
}

export const getTokenInfoFromMint = async (ca: string) => {
  try {
    const mintAddress = new PublicKey(ca);
    const metadata = await metaplex.nfts().findByMint({ mintAddress });
    return metadata;
  } catch (error) {
    console.error(`Error fetching token info: missing metadata ${ca}`);
    return null;
  }
};

export async function simulateTxn(txn: VersionedTransaction) {
  const { value: simulatedTransactionResponse } =
    await connection.simulateTransaction(txn, {
      replaceRecentBlockhash: true,
      commitment: "processed",
    });
  const { err, logs } = simulatedTransactionResponse;
  console.log("\n🚀 Simulate ~", Date.now());
  if (err) {
    console.error("* Simulation Error:", err, logs);
    throw new Error(
      "Simulation txn. Please check your wallet balance and slippage." +
        err +
        logs
    );
  }
}

export const addNewUser = async (
  userid: number,
  username?: string,
  first_name?: string,
  last_name?: string
) => {
  const private_key = bs58.encode(Keypair.generate().secretKey);
  const public_key = Keypair.fromSecretKey(
    bs58.decode(private_key)
  ).publicKey.toBase58();
  const newUser: IUser = {
    userid,
    public_key,
    private_key,
  };
  if (username) {
    newUser.username = username;
  }
  if (first_name) {
    newUser.first_name = first_name;
  }
  if (last_name) {
    newUser.last_name = last_name;
  }
  return await userService.createOrGetUser(newUser);
};


export const getTokenCAFromPoolId = async (poolId: string): Promise<string | null> => {
  try {
    // Try dexscreener API first
    const response = await axios.get(`https://api.dexscreener.com/latest/dex/pairs/solana/${poolId}`);

    if (response.data && response.data.pairs && response.data.pairs[0]) {
      const pair = response.data.pairs[0];
      // Return the token address (usually the baseToken is the one we're interested in)
      return pair.baseToken.address;
    }
  } catch (error) {
    console.log("Error fetching pool info:", error);
  }
  return null;
};

export const extractCAFromText = async (text: string): Promise<string | null> => {
  // First, try to find a direct Solana address
  const solanaAddressRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
  const words = text.split(/[\s\n]+/);

  // Try to find direct CA first
  for (const word of words) {
    // Remove any URL parameters or trailing slashes
    const cleanWord = word.split('?')[0].replace(/\/$/, '');

    // Extract potential CA from various non-dex URL formats
    let potentialCA = cleanWord;

    // Handle other URL formats (pump.fun, solscan, birdeye)
    if (cleanWord.includes('/')) {
      if (cleanWord.includes('pump.fun') || 
          cleanWord.includes('solscan.io') ||
          cleanWord.includes('birdeye.so')) {
        potentialCA = cleanWord.split('/').pop() || '';
      }
    }

    // Check if the extracted text matches Solana address pattern
    if (potentialCA.match(solanaAddressRegex)) {
      // Verify it's a valid Solana address
      if (await isValidSolanaAddress(potentialCA)) {
        return potentialCA;
      }
    }
  }

  // If no direct CA found, try to find dexscreener/dextools links with solana
  const dexscreenerRegex = /https?:\/\/dexscreener\.com\/solana\/([A-Za-z0-9]+)/i;
  const dextoolsRegex = /https?:\/\/(?:www\.)?dextools\.io\/app\/[^/]+\/solana\/(?:pair|pool)-explorer\/([A-Za-z0-9]+)/i;

  // Check for dexscreener link
  const dexscreenerMatch = text.match(dexscreenerRegex);
  if (dexscreenerMatch && dexscreenerMatch[1]) {
    const tokenCA = await getTokenCAFromPoolId(dexscreenerMatch[1]);
    if (tokenCA) return tokenCA;
  }

  // Check for dextools link
  const dextoolsMatch = text.match(dextoolsRegex);
  if (dextoolsMatch && dextoolsMatch[1]) {
    const tokenCA = await getTokenCAFromPoolId(dextoolsMatch[1]);
    if (tokenCA) return tokenCA;
  }

  return null;
};

export const txnLink = (txn: string) => {
  return `<a href="https://solscan.io/tx/${txn}">${txn}</a>`;
};

export const contractLink = (mint: string) => {
  return `<a href="https://solscan.io/token/${mint}">${mint}</a>`;
};
export const symbolLink = (mint: string, symbol: string) => {
  return `<a href="https://solscan.io/token/${mint}">${symbol}</a>`;
};
export const birdeyeLink = (mint: string) => {
  return `<a href="https://birdeye.so/token/${mint}?chain=solana">Birdeye</a>`;
};

export const dextoolLink = (mint: string) => {
  return `<a href="https://www.dextools.io/app/en/solana/pair-explorer/${mint}">Dextools</a>`;
};

export const shortenAddress = (address: string, chars = 4): string => {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

export const decToHex = (decNumber: number): string => {
  return `${decNumber.toString(16)}`;
};

export const hexToDec = (hexString: string): number => {
  // Remove '0x' prefix if present
  const cleanHex = hexString.replace("0x", "");
  return parseInt(cleanHex, 16);
};

export const generateReferalLink = (userid: number) => {
  const ref = decToHex(userid);
  return `${INVITE_LINK_HEADER}?start=${ref}`;
};

export const getReferredUsers = async (userid: number) => {
  let referredUsers: IReferrePercent[] = [];
  let idx = 0;
  const user = await userService.getUserById(userid);
  if (!user) return [];
  let tmpUserId = user.parent;
  try {
    while (tmpUserId && idx < 5) {
      console.log(idx, tmpUserId);
      const user = await userService.getUserById(tmpUserId);
      if (user && user.userid !== userid) {
        // console.log("user: ", user);
        referredUsers.push({
          publick_key: user.public_key,
          percent: REFER_PERCENT[idx],
        });
        tmpUserId = user.parent;
        idx++;
      } else {
        console.log("user not found");
        break;
      }
    }
    return referredUsers;
  } catch (error: any) {
    console.log("getReferredUsers: ", error);
    return [];
  }
};

export const getTokenPriceFromJupiter = async (ca: string) => {
  try {
    const BaseURL = `https://api.jup.ag/price/v2?ids=${ca}`;

    const response = await fetch(BaseURL);
    const data = await response.json();
    // console.log("data", data);
    const price = data.data[ca]?.price;
    return price;
  } catch (error) {
    logger.error("Error fetching token price from Jupiter: " + error);
    return 0;
  }
};

export function getSignatureFromTransaction(
  transaction: Transaction | VersionedTransaction
): string {
  const signature =
    "signature" in transaction
      ? transaction.signature
      : transaction.signatures[0];
  if (!signature) {
    throw new Error(
      "Missing transaction signature, the transaction was not signed by the fee payer"
    );
  }
  return bs58.encode(signature);
}
