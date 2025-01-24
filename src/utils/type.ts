import { PublicKey, VersionedTransaction } from "@solana/web3.js";

export type SwapParam = {
  private_key: string;
  mint: PublicKey;
  amount: number;
  tip: number;
  slippage: number;
  is_buy: boolean;
  referredUsers: IReferrePercent[]
};

export type BuyInsParam = {
  mint: PublicKey;
  owner: PublicKey;
  bondingCurve: PublicKey;
  associatedBondingCurve: PublicKey;
  maxSol: number;
  splOut: number;
};

export interface IUser {
  userid: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  public_key: string;
  private_key: string;
  auto?: boolean; // auto buy sell action
  snipe_amnt?: number; // invest per token
  jito_fee?: number;
  slippage?: number;
  setting_msg_id?: number;
  ca?: string[]; // ca list that I bought
  parent?: number; // refer of me
}

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
