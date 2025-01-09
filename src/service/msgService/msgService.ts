import mongoose, { Schema, Document } from "mongoose";

interface IBotMessage extends Document {
  messageId: number;
  userId: number;
  contractAddress?: string;
  message?: string;
  timestamp: Date;
}

const botMessageSchema = new Schema({
  messageId: { type: Number, required: true },
  userId: { type: Number, required: true },
  contractAddress: { type: String },
  message: { type: String },
  timestamp: { type: Date, default: Date.now },
});

// Create compound index for faster queries
botMessageSchema.index({ userId: 1, messageId: 1 });

export class BotMessageService {
  private MessageModel = mongoose.model<IBotMessage>(
    "BotMessage",
    botMessageSchema
  );

  async saveMessage(
    messageId: number,
    userId: number,
    contractAddress?: string,
    message?: string
  ): Promise<IBotMessage> {
    const botMessage = new this.MessageModel({
      messageId,
      userId,
      contractAddress,
      message,
    });
    return await botMessage.save();
  }

  async getMessagesByUser(userId: number): Promise<IBotMessage[]> {
    return await this.MessageModel.find({ userId });
  }

  async getMessageById(
    messageId: number,
    userId: number
  ): Promise<IBotMessage | null> {
    const msg = await this.MessageModel.findOne({
      messageId: Number(messageId),
      userId: Number(userId),
    });
    return msg;
  }

  async getMessgeByFilter(key:any){
    return await this.MessageModel.find(key);
  }

  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    const result = await this.MessageModel.deleteOne({ messageId, userId });
    return result.deletedCount > 0;
  }
}
