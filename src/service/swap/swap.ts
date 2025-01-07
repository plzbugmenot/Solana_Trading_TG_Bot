import { Keypair, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { raydiumSwapTxn } from "./raydium/raydium.swap";
import { JitoBundleService } from "./jito/jito";
import { pumpfunSwap } from "./pumpfun/pumpfun";
import { PumpData, SwapParam } from "../../utils/type";
import { jupiterSwapTxn } from "./jupiter/jupiter";
import bs58 from "bs58";
import { simulateTxn } from "../../utils/utils";

const Pumpfun_API = "https://frontend-api.pump.fun/coins/";
export const swap = async (swapParam: SwapParam) => {
  const { private_key, mint, amount, slippage, tip, is_buy } = swapParam;
  const wallet = Keypair.fromSecretKey(bs58.decode(private_key));

  try {
    let vTxn = await raydiumSwapTxn(swapParam);
    if (!vTxn) {
      const url = Pumpfun_API + mint.toBase58();
      const isPump = await fetch(url);
      if (isPump.status === 200) {
        const data = await isPump.json();
        const pumpData: PumpData = {
          bondingCurve: new PublicKey(data.bonding_curve),
          associatedBondingCurve: new PublicKey(data.associated_bonding_curve),
          virtualSolReserves: Number(data.virtual_sol_reserves),
          virtualTokenReserves: Number(data.virtual_token_reserves),
          totalSupply: Number(data.total_supply),
          marketCap: Number(data.usd_market_cap),
        };
        vTxn = await pumpfunSwap(swapParam, pumpData);
      } else {
        console.log("Not found token on Pumpfun");
        vTxn = await jupiterSwapTxn(swapParam);
      }
    }
    vTxn.sign([wallet]);
    await simulateTxn(vTxn);
    return await confirmVtxn(vTxn);
  } catch (e) {
    console.log("Error while swap txn");
  }
};

export const confirmVtxn = async (vTxn: VersionedTransaction) => {
  const jitoInstance = new JitoBundleService();
  const signature = await jitoInstance.sendTransaction(vTxn.serialize());
  return signature;
  // console.log("https://solscan.io/tx/" + signature);
};
