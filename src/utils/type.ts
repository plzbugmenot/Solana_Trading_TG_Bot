import { PublicKey } from "@solana/web3.js";

export type UserData = {
  username: string;
  private_key: string;
  snipe_amnt: number;
  jito_fee: number;
  from_t: number;
  to_t: number;
  is_on: boolean;
  t_on: boolean;
  msg_id?: number;
};

export type SwapParam = {
  private_key: string;
  mint: PublicKey;
  amount: number;
  tip: number;
  slippage: number;
  is_buy: boolean;
};

export type PumpData = {
  bondingCurve: PublicKey;
  associatedBondingCurve: PublicKey;
  virtualSolReserves: number;
  virtualTokenReserves: number;
  // realTokenReserves: number;
  // realSolReserves: number;
  totalSupply: number;
  marketCap: number;
};


export type BuyInsParam = {
  mint: PublicKey;
  owner: PublicKey;
  bondingCurve: PublicKey;
  associatedBondingCurve: PublicKey;
  maxSol: number;
  splOut: number;
};