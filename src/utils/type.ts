import { Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";

export type SwapParam = {
  private_key: string;

  mint: PublicKey;
  amount: number;
  tip: number;
  slippage: number;
  is_buy: boolean;
  referredUsers: IReferrePercent[];
};

export type BuyInsParam = {
  mint: PublicKey;
  owner: PublicKey;
  bondingCurve: PublicKey;
  associatedBondingCurve: PublicKey;
  maxSol: number;
  splOut: number;
};

export interface IReferrePercent {
  publick_key: string;
  percent: number;
}

export interface ISwapTxResponse {
  vTxn: VersionedTransaction;
  inAmount: number;
  outAmount: number;
}

export type SellInsParam = {
  mint: PublicKey;
  owner: PublicKey;
  bondingCurve: PublicKey;
  associatedBondingCurve: PublicKey;
  splIn: number;
};

export type AmountsParam = {
  solSpent: number;
  splBought: number;
  solIn: number;
};

export type PumpData = {
  bondingCurve: PublicKey;
  associatedBondingCurve: PublicKey;
  virtualSolReserves: number;
  virtualTokenReserves: number;
  realTokenReserves: number;
  realSolReserves: number;
  totalSupply: number;
  progress: number;
  priceInSOL: number;
  marketCap: number;
};

export interface ISwapTxn {
  userid: number;
  txHash: string;
  mint: string;
  txTime: number;
  swap: {
    auto: boolean;
    token_amount: number;
    price_usd: number;
    swap: "BUY" | "SELL";
    tip_usd: number;
  };
}

export interface IUser {
  userid: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  public_key: string;
  private_key: string;
  setting_msg_id?: number;
  parent?: number;
  swap: {
    auto: boolean;
    amount_sol: number;
    tip_sol: number;
    slippage: number;
  };
  language: "EN" | "CH";
}
