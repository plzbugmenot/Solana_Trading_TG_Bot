import { PublicKey } from "@solana/web3.js";
import { config, connection } from "../../config/config";

let lastValidBlockhash = "";
let cachedSolPrice = 100; // Default price

// Function to fetch the latest blockhash and cache it
export async function fetchLastValidBlockhash() {
  const tmpSolPrice = await getSolPrice();
  cachedSolPrice = tmpSolPrice === 0 ? cachedSolPrice : tmpSolPrice;
  // if (!isSniping()) return;
  // console.log("lastValidBlockhash", lastValidBlockhash);
  try {
    const { blockhash } = await connection.getLatestBlockhash();
    lastValidBlockhash = blockhash;
    // console.log("Last valid blockhash:", blockhash);
  } catch (error) {
    // console.error("Error fetching last valid blockhash:", error);
  }
}

// Keep fetching the last valid blockhash every 100ms
setInterval(fetchLastValidBlockhash, config.lastBlock_Update_cycle);

// Function to get the cached last valid blockhash
export function getLastValidBlockhash(): string {
  // console.log("lastValidBlockhash return: ", lastValidBlockhash);
  return lastValidBlockhash;
}

export const getCachedSolPrice = () => {
  return cachedSolPrice;
};

async function getSignaturesCount() {
  const signatures = await connection.getSignaturesForAddress(
    new PublicKey(""),
    { until: "" }
  );
}

const getSolPrice = async () => {
  const WSOL = "So11111111111111111111111111111111111111112";
  const SOL_URL = `https://api.jup.ag/price/v2?ids=${WSOL}`;
  try {
    const BaseURL = SOL_URL;
    const response = await fetch(BaseURL);
    const data = await response.json();
    const price = data.data[WSOL]?.price;
    return price;
  } catch (error) {
    // logger.error("Error fetching SOL price: " + error);
    return 0;
  }
};
