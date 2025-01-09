import { isValidSolanaAddress } from "./utils/utils";

const test = async () => {
  const ca = "asd";
  const isCA = await isValidSolanaAddress(ca);
  console.log("isCA", isCA);
};
test();
