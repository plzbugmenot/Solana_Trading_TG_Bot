import logger from "./logger";

interface UserData {
  username: string;
  private_key: string;
  snipe_amnt?: number;
  jito_fee?: number;
  from_t: number;
  to_t: number;
  is_on: boolean;
  t_on: boolean;
}

export const saveUserData = (userData: UserData) => {
  logger.info(userData.username + ": " + userData.private_key);
};
