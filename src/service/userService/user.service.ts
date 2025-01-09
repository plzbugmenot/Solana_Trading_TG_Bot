import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  userid: number;
  username: string;
  private_key: string;
  snipe_amnt: number;
  jito_fee: number;
  slippage: number;
  setting_msg_id: number;
}

const userSchema = new Schema({
  userid: { type: Number, required: true, unique: true },
  username: { type: String, required: true },
  private_key: { type: String, required: true },
  snipe_amnt: { type: Number, default: 0.000001 },
  jito_fee: { type: Number, default: 0.000001 },
  slippage: { type: Number, default: 100 },
  setting_msg_id: { type: Number, default: null },
});

export class UserServiceDB {
  private UserModel = mongoose.model<IUser>("User", userSchema);

  async createUser(userData: Partial<IUser>): Promise<IUser> {
    const user = new this.UserModel(userData);
    return await user.save();
  }

  async getUserById(userid: number): Promise<IUser> {
    const user = await this.UserModel.findOne({ userid });
    if (!user) throw new Error("User not found");
    return user;
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

  async deleteUser(userid: number): Promise<boolean> {
    const result = await this.UserModel.deleteOne({ userid });
    return result.deletedCount > 0;
  }

  async getAllUsers(): Promise<IUser[]> {
    return await this.UserModel.find();
  }

  async isNewUser(userid: number): Promise<boolean> {
    const user = await this.UserModel.findOne({ userid });
    return user === null;
  }
}
