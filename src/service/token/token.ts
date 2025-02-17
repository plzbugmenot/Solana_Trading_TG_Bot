import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { connection, userService } from "../../config/config";
import { TOKEN_PROGRAM_ID } from "@raydium-io/raydium-sdk";
import { AccountLayout } from "@solana/spl-token";

import { formatNumber } from "../../utils/utils";

export async function getWalletTokens(wallet: Keypair) {
  const walletAddress = wallet.publicKey;
  const pubKey = new PublicKey(walletAddress);

  const tokenAccounts = await connection.getTokenAccountsByOwner(
    walletAddress,
    {
      programId: TOKEN_PROGRAM_ID,
    }
  );

  const tokens = await Promise.all(
    tokenAccounts.value.map(async (ta) => {
      const accountData = AccountLayout.decode(ta.account.data);
      const mintInfo = await connection.getAccountInfo(
        new PublicKey(accountData.mint)
      );
      if (!mintInfo) {
        throw new Error(`Failed to fetch mint info for ${accountData.mint}`);
      }

      return {
        mint: accountData.mint.toBase58(),
        amount: formatNumber(Number(accountData.amount) / LAMPORTS_PER_SOL),
      };
    })
  );
  return tokens;
}

/*
│ (index) │ mint                                           │ amount     │
├─────────┼────────────────────────────────────────────────┼────────────┤
│ 0       │ 'D3cyNBRdYpKwbXUjaf37v7sDC3sRBxgy1rpyek5qpump' │ 357.666547 │
│ 1       │ '4QFtsuiTQHug2b5ZxsTUUrn1N1nf63s1j2157oeypump' │ 357.666547 │
│ 2       │ 'G8sRq12bKmPzsbmFBka3fH6hhTieM6YexytErehhpump' │ 357.666547 │
*/
