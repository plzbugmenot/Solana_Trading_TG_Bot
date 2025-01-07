import { PublicKey } from "@solana/web3.js";
import { connection } from "../../config/config";

let lastValidBlockhash: string | null = null;

// Function to fetch the latest blockhash and cache it
async function fetchLastValidBlockhash() {
  try {
    const { blockhash } = await connection.getLatestBlockhash();
    lastValidBlockhash = blockhash;
  } catch (error) {
    console.error("Error fetching last valid blockhash:", error);
  }
}

// Keep fetching the last valid blockhash every 100ms
setInterval(fetchLastValidBlockhash, 600);

// Function to get the cached last valid blockhash
export function getLastValidBlockhash(): string | null {
  return lastValidBlockhash;
}

async function getSignaturesCount (){
  const signatures = await connection.getSignaturesForAddress(new PublicKey(""), {until: ""})
}