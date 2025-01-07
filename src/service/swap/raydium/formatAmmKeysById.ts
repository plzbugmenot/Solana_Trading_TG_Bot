import {
  ApiPoolInfoV4,
  LIQUIDITY_STATE_LAYOUT_V4,
  Liquidity,
  MARKET_STATE_LAYOUT_V3,
  Market,
  SPL_MINT_LAYOUT,
  MAINNET_PROGRAM_ID,
} from "@raydium-io/raydium-sdk";
import { PublicKey } from "@solana/web3.js";
import { NATIVE_MINT } from "@solana/spl-token";
import { connection } from "../../../config/config";

// Function to fetch pool info using a mint address
export async function fetchPoolInfoByMint(
  mint: string
): Promise<ApiPoolInfoV4 | null> {
  try {
    const mintAddress = new PublicKey(mint);

    // Fetch program accounts for Raydium's AMM program (AmmV4)
    const accounts = await connection.getProgramAccounts(
      MAINNET_PROGRAM_ID.AmmV4, // Raydium AMM V4 Program ID
      {
        filters: [
          { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span }, // Ensure the correct data size for liquidity pool state
          {
            memcmp: {
              // Memory comparison to match base mint
              offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("baseMint"),
              bytes: mintAddress.toBase58(),
            },
          },
          {
            memcmp: {
              offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("quoteMint"),
              bytes: NATIVE_MINT.toBase58(),
            },
          },
        ],
      }
    );

    if (accounts.length === 0) {
      // If no account was found with mint as baseMint, try matching it as quoteMint
      const quoteAccounts = await connection.getProgramAccounts(
        MAINNET_PROGRAM_ID.AmmV4, // Raydium AMM V4 Program ID
        {
          filters: [
            { dataSize: LIQUIDITY_STATE_LAYOUT_V4.span }, // Ensure the correct data size for liquidity pool state
            {
              memcmp: {
                // Memory comparison to match quote mint
                offset: LIQUIDITY_STATE_LAYOUT_V4.offsetOf("quoteMint"),
                bytes: mintAddress.toBase58(),
              },
            },
          ],
        }
      );

      if (quoteAccounts.length === 0) {
        // throw new Error(`No pool found for mint: ${mint}`);
        console.log(`No pool found for mint: ${mint}`);
        return null;
      }

      // Use the first account found where mint is quoteMint
      const poolAccount = quoteAccounts[0];
      return await decodePoolAndMarketInfo(poolAccount, mint);
    }

    // Use the first account found where mint is baseMint
    const poolAccount = accounts[0];
    return await decodePoolAndMarketInfo(poolAccount, mint);
  } catch (error) {
    throw error;
  }
}
// Helper function to decode pool and market info
async function decodePoolAndMarketInfo(
  poolAccount: any,
  mint: any
): Promise<ApiPoolInfoV4> {
  const poolState = LIQUIDITY_STATE_LAYOUT_V4.decode(poolAccount.account.data);
  console.log(
    `- Pool account found for Mint: ${mint}, Pool ID: ${poolAccount.pubkey.toString()}`
  );

  // Fetch the market account using the decoded marketId
  const marketAccount = await connection.getAccountInfo(poolState.marketId);
  if (!marketAccount) {
    throw new Error("Market account not found");
  }

  const marketInfo = MARKET_STATE_LAYOUT_V3.decode(marketAccount.data);

  // Fetch LP mint information
  const lpMintAccount = await connection.getAccountInfo(poolState.lpMint);
  if (!lpMintAccount) {
    throw new Error("LP mint account not found");
  }

  const lpMintInfo = SPL_MINT_LAYOUT.decode(lpMintAccount.data);

  // // Calculate the market authority
  // const marketAuthority = PublicKey.createProgramAddressSync(
  //   [
  //     marketInfo.ownAddress.toBuffer(),
  //     marketInfo.vaultSignerNonce.toArrayLike(Buffer, "le", 8),
  //   ],
  //   MAINNET_PROGRAM_ID.OPENBOOK_MARKET
  // );

  // Log and return the full set of pool data
  const poolData: ApiPoolInfoV4 = {
    id: poolAccount.pubkey.toString(), // Pool ID
    baseMint: poolState.baseMint.toString(),
    quoteMint: poolState.quoteMint.toString(),
    lpMint: poolState.lpMint.toString(),
    baseDecimals: poolState.baseDecimal.toNumber(),
    quoteDecimals: poolState.quoteDecimal.toNumber(),
    lpDecimals: lpMintInfo.decimals,
    version: 4, // Set version as the number literal 4 (not a string)
    programId: poolAccount.account.owner.toString(),
    authority: Liquidity.getAssociatedAuthority({
      programId: poolAccount.account.owner,
    }).publicKey.toString(),
    openOrders: poolState.openOrders.toString(),
    targetOrders: poolState.targetOrders.toString(),
    baseVault: poolState.baseVault.toString(),
    quoteVault: poolState.quoteVault.toString(),
    withdrawQueue: poolState.withdrawQueue.toString(),
    lpVault: poolState.lpVault.toString(),
    marketVersion: 3,
    marketProgramId: poolState.marketProgramId.toString(),
    marketId: poolState.marketId.toString(),
    marketAuthority: Market.getAssociatedAuthority({
      programId: poolState.marketProgramId,
      marketId: poolState.marketId,
    }).publicKey.toString(),
    marketBaseVault: marketInfo.baseVault.toString(),
    marketQuoteVault: marketInfo.quoteVault.toString(),
    marketBids: marketInfo.bids.toString(),
    marketAsks: marketInfo.asks.toString(),
    marketEventQueue: marketInfo.eventQueue.toString(),
    lookupTableAccount: PublicKey.default.toString(),
  };

  console.log("- Full pool data:", poolData);

  return poolData;
}
