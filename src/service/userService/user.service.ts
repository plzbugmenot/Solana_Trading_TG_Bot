import mongoose, { Schema, Document } from "mongoose";

export interface IUser extends Document {
  userid: number;
  username: string;
  private_key: string;
  auto: boolean;
  snipe_amnt: number;
  jito_fee: number;
  slippage: number;
  setting_msg_id: number;
  ca: string[];
}

const userSchema = new Schema({
  userid: { type: Number, required: true, unique: true },
  username: { type: String, required: true },
  private_key: { type: String, required: true },
  auto: { type: Boolean, default: false },
  snipe_amnt: { type: Number, default: 0.000001 },
  jito_fee: { type: Number, default: 0.000001 },
  slippage: { type: Number, default: 100 },
  setting_msg_id: { type: Number, default: null },
  ca: { type: [String], default: [] },
});

export class UserServiceDB {
  private UserModel = mongoose.model<IUser>("User", userSchema);
  private autoSettingsMap: Map<number, boolean> = new Map();

  async createUser(userData: Partial<IUser>): Promise<IUser> {
    const user = new this.UserModel(userData);
    return await user.save();
  }

  async getUserById(userid: number): Promise<IUser | null> {
    const user = await this.UserModel.findOne({ userid });
    if (!user) return null;
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

  // Add this method to load auto settings
  async loadAutoSettings(): Promise<void> {
    const users = await this.UserModel.find({}, "userid auto");
    users.forEach((user) => {
      this.autoSettingsMap.set(user.userid, user.auto ? true : false);
    });
  }

  // Method to update auto setting
  async updateAutoSetting(userid: number, auto: boolean): Promise<void> {
    await this.UserModel.findOneAndUpdate({ userid }, { auto });
    this.autoSettingsMap.set(userid, auto);
  }

  // Alternative method to get as array of entries
  getAllAutoSettingsArray(): Array<[number, boolean]> {
    return Array.from(this.autoSettingsMap.entries());
  }
  // Method to get auto setting for a user
  getAutoSetting(userid: number): boolean {
    return this.autoSettingsMap.get(userid) || false;
  }

  // Add CA to user's array
  async addCA(userid: number, caAddress: string): Promise<IUser | null> {
    return await this.UserModel.findOneAndUpdate(
      { userid },
      { $addToSet: { ca: caAddress } },
      { new: true }
    );
  }

  // Remove CA from user's array
  async removeCA(userid: number, caAddress: string): Promise<IUser | null> {
    return await this.UserModel.findOneAndUpdate(
      { userid },
      { $pull: { ca: caAddress } },
      { new: true }
    );
  }

  // Get all CAs for a user
  async getUserCAs(userid: number): Promise<string[]> {
    const user = await this.UserModel.findOne({ userid });
    return user?.ca || [];
  }

  // Clear all CAs for a user
  async clearAllCAs(userid: number): Promise<IUser | null> {
    return await this.UserModel.findOneAndUpdate(
      { userid },
      { $set: { ca: [] } },
      { new: true }
    );
  }
}
