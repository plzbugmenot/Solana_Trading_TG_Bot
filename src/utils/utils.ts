import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  VersionedTransaction,
} from "@solana/web3.js";
import { connection, INVITE_LINK_HEADER, metaplex, userService } from "../config/config";
import {
  SPL_ACCOUNT_LAYOUT,
  TOKEN_PROGRAM_ID,
  TokenAccount,
} from "@raydium-io/raydium-sdk";
import { BN } from "bn.js"; // Import BN class as a value
import { PumpData, UserData } from "./type";
import bs58 from "bs58";

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

export const addNewUser = async (userid: number, username: string) => {
  const private_key = bs58.encode(Keypair.generate().secretKey);
  const newUser: UserData = {
    userid,
    username,
    private_key,
    snipe_amnt: 0.000001,
    jito_fee: 0.000001,
    slippage: 100,
  };
  await userService.createUser(newUser);
  return newUser;
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
  const cleanHex = hexString.replace('0x', '');
  return parseInt(cleanHex, 16);
};

export const generateReferalLink = (userid: number) => {
  const ref = decToHex(userid);
  return `${INVITE_LINK_HEADER}?start=${ref}`;
};
