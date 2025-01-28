import mongoose, { Schema } from "mongoose";
import { IUser } from "../utils/type";

const userSchema = new Schema({
  userid: { type: Number, required: true, unique: true },
  username: String,
  first_name: String,
  last_name: String,
  public_key: { type: String, required: true },
  private_key: { type: String, required: true },
  reward_address: String,
  setting_msg_id: {type: Number, default: 0},
  parent: {type: Number, default: 0},
  swap: {
    auto: { type: Boolean, default: false },
    amount_sol: { type: Number, default: 0.000001 },
    tip_sol: { type: Number, default: 0.0001 },
    slippage: { type: Number, default: 100 },
  },
  language: {
    type: String,
    enum: ["EN", "CH"],
    default: "EN",
  },
});

export class UserService {
  private UserModel = mongoose.model<IUser>("User", userSchema);

  async createUser(userData: Partial<IUser>): Promise<IUser> {
    const user = new this.UserModel({
      ...userData,
      reward_address: userData.public_key,
      swap: {
        auto: false,
        amount_sol: 0.000001,
        tip_sol: 0.0001,
        slippage: 100,
      },
      language: "EN",
    });
    return await user.save();
  }

  async getUserById(userid: number): Promise<IUser | null> {
    return await this.UserModel.findOne({ userid });
  }

  async isNewUser(userid: number): Promise<boolean> {
    const user = await this.UserModel.findOne({ userid });
    return !user;
  }

  async updateUser(
    userid: number,
    updateData: Partial<IUser>
  ): Promise<IUser | null> {
    return await this.UserModel.findOneAndUpdate(
      { userid },
      { $set: updateData },
      { new: true }
    );
  }

  async updateSwapSettings(
    userid: number,
    swapSettings: Partial<IUser["swap"]>
  ): Promise<IUser | null> {
    return await this.UserModel.findOneAndUpdate(
      { userid },
      { $set: { swap: swapSettings } },
      { new: true }
    );
  }

  async setLanguage(
    userid: number,
    language: "EN" | "CH"
  ): Promise<IUser | null> {
    return await this.UserModel.findOneAndUpdate(
      { userid },
      { $set: { language } },
      { new: true }
    );
  }

  async setParent(userid: number, parentId: number): Promise<IUser | null> {
    return await this.UserModel.findOneAndUpdate(
      { userid },
      { $set: { parent: parentId } },
      { new: true }
    );
  }

  async getAllUsers(): Promise<IUser[]> {
    return await this.UserModel.find();
  }

  async deleteUser(userid: number): Promise<boolean> {
    const result = await this.UserModel.deleteOne({ userid });
    return result.deletedCount > 0;
  }

  async updateAutoMode(userid: number, auto: boolean): Promise<IUser | null> {
    return await this.UserModel.findOneAndUpdate(
      { userid },
      { $set: { "swap.auto": auto } },
      { new: true }
    );
  }
}
