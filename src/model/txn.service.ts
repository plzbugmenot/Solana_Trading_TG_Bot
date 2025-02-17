import mongoose, { Schema } from "mongoose";
import { ISwapTxn } from "../utils/type";

const swapTxnSchema = new Schema({
  userid: { type: Number, required: true, index: true },
  txHash: { type: String, required: true, unique: true },
  mint: { type: String, required: true },
  txTime: { type: Number, required: true, index: true },
  swap: {
    auto: { type: Boolean, required: true },
    token_amount: { type: Number, required: true },
    price_usd: { type: Number, required: true },
    swap: { type: String, enum: ["BUY", "SELL"], required: true },
    tip_usd: { type: Number, required: true },
  },
});

export  class SwapTxnService {
  private SwapTxnModel = mongoose.model<ISwapTxn>("SwapTxn", swapTxnSchema);

  async saveSwapTxn(txnData: ISwapTxn): Promise<ISwapTxn> {
    const swapTxn = new this.SwapTxnModel(txnData);
    return await swapTxn.save();
  }

  async getSwapsByUser(userid: number): Promise<ISwapTxn[]> {
    return await this.SwapTxnModel.find({ userid }).sort({ txTime: -1 });
  }

  async getRecentSwaps(
    userid: number,
    limit: number = 20
  ): Promise<ISwapTxn[]> {
    return await this.SwapTxnModel.find({ userid })
      .sort({ txTime: -1 })
      .limit(limit);
  }

  async getSwapByTxHash(txHash: string): Promise<ISwapTxn | null> {
    return await this.SwapTxnModel.findOne({ txHash });
  }

  async getSwapsByMint(mint: string): Promise<ISwapTxn[]> {
    return await this.SwapTxnModel.find({ mint }).sort({ txTime: -1 });
  }

  async getUserSwapsByType(
    userid: number,
    swapType: "BUY" | "SELL"
  ): Promise<ISwapTxn[]> {
    return await this.SwapTxnModel.find({
      userid,
      "swap.swap": swapType,
    }).sort({ txTime: -1 });
  }
}
