import { isValidSolanaAddress } from "./utils/utils";

const test = async () => {
  const ca = "D3cyNBRdYpKwbXUjaf37v7sDC3sRBxgy1rpyek5qpump";
  const isCA = await isValidSolanaAddress(ca);
  console.log(isCA);
};
test();
