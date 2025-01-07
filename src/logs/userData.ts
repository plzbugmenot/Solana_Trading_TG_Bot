import fs from "fs";
import path from "path";

interface UserData {
  username: string;
  private_key: string;
  snipe_amnt: number;
  jito_fee: number;
  from_t: number;
  to_t: number;
  is_on: boolean;
  t_on: boolean;
}

export const saveUserData = (userData: UserData) => {
  const filePath = path.join(__dirname, "../data/users.json");

  // Create directory if it doesn't exist
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Read existing data
  let users: UserData[] = [];
  if (fs.existsSync(filePath)) {
    const fileContent = fs.readFileSync(filePath, "utf-8");
    users = JSON.parse(fileContent);
  }

  // Add new user
  users.push(userData);

  // Save updated data
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2));
};
