import {
  AddressLookupTableAccount,
  LAMPORTS_PER_SOL,
  Connection,
  PublicKey,
  Keypair,
  TransactionMessage,
  VersionedTransaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { getMint, NATIVE_MINT } from "@solana/spl-token";
import axios from "axios";
import bs58 from "bs58";
import { JitoAccounts } from "../jito/jito";
import { ISwapTxResponse, SwapParam } from "../../../utils/type";
import { getLastValidBlockhash } from "../getBlock";
import { connection } from "../../../config/config";
import { isBN } from "bn.js";

function deserializeInstruction(instruction: any): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(instruction.programId),
    keys: instruction.accounts.map((key: any) => ({
      pubkey: new PublicKey(key.pubkey),
      isSigner: key.isSigner,
      isWritable: key.isWritable,
    })),
    data: Buffer.from(instruction.data, "base64"),
  });
}

export const jupiterSwapTxn = async (
  swapParam: SwapParam
): Promise<ISwapTxResponse | null> => {
  const { private_key, mint, amount, slippage, tip, is_buy } = swapParam;
  const wallet = Keypair.fromSecretKey(bs58.decode(private_key));

  const inputMint = is_buy ? NATIVE_MINT : mint;
  const outputMint = is_buy ? mint : NATIVE_MINT;
  const decimals = (await getMint(connection, mint)).decimals;
  const amountInLamports = is_buy
    ? amount * LAMPORTS_PER_SOL
    : amount * 10 ** decimals;

  //start building transaction
  const url = `https://quote-api.jup.ag/v6/quote?inputMint=${inputMint.toBase58()}\&outputMint=${outputMint.toBase58()}\&amount=${amountInLamports}\&slippageBps=${
    slippage * 100
  }`;
  const quoteResponse = (await axios.get(url)).data;
  console.log(quoteResponse);
  const outAmount = is_buy ? quoteResponse.outAmount / 10 ** decimals : quoteResponse.inAmount / LAMPORTS_PER_SOL;
  const instructions = (
    await axios.post(
      "https://quote-api.jup.ag/v6/swap-instructions",
      {
        // quoteResponse from /quote api
        quoteResponse,
        userPublicKey: wallet.publicKey.toBase58(),
        wrapAndUnwrapSol: true,
        dynamicSlippage: { maxBps: 5000 },
        dynamicComputeUnitLimit: true, // allow dynamic compute limit instead of max 1,400,000
        prioritizationFeeLamports: "auto", // or custom lamports: 1000
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    )
  ).data;

  const {
    tokenLedgerInstruction, // If you are using `useTokenLedger = true`.
    computeBudgetInstructions, // The necessary instructions to setup the compute budget.
    setupInstructions, // Setup missing ATA for the users.
    swapInstruction: swapInstructionPayload, // The actual swap instruction.
    cleanupInstruction, // Unwrap the SOL if `wrapAndUnwrapSol = true`.
    addressLookupTableAddresses, // The lookup table addresses that you can use if you are using versioned transaction.
  } = instructions;

  const getAddressLookupTableAccounts = async (
    keys: string[]
  ): Promise<AddressLookupTableAccount[]> => {
    const addressLookupTableAccountInfos =
      await connection.getMultipleAccountsInfo(
        keys.map((key) => new PublicKey(key))
      );

    return addressLookupTableAccountInfos.reduce((acc, accountInfo, index) => {
      const addressLookupTableAddress = keys[index];
      if (accountInfo) {
        const addressLookupTableAccount = new AddressLookupTableAccount({
          key: new PublicKey(addressLookupTableAddress),
          state: AddressLookupTableAccount.deserialize(accountInfo.data),
        });
        acc.push(addressLookupTableAccount);
      }

      return acc;
    }, new Array<AddressLookupTableAccount>());
  };

  const addressLookupTableAccounts: AddressLookupTableAccount[] = [];
  addressLookupTableAccounts.push(
    ...(await getAddressLookupTableAccounts(addressLookupTableAddresses))
  );

  const feeInstructions = SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: new PublicKey(JitoAccounts[0]),
    lamports: tip * LAMPORTS_PER_SOL,
  });
  const blockhash = getLastValidBlockhash();
  if (!blockhash) {
    console.error("Failed to retrieve blockhash from cache");
    throw new Error("Failed to retrieve blockhash from cache");
  }
  const messageV0 = new TransactionMessage({
    payerKey: wallet.publicKey,
    recentBlockhash: blockhash,
    instructions: [
      ...setupInstructions.map(deserializeInstruction),
      deserializeInstruction(swapInstructionPayload),
      deserializeInstruction(cleanupInstruction),
      feeInstructions,
    ],
  }).compileToV0Message(addressLookupTableAccounts);
  return {
    vTxn: new VersionedTransaction(messageV0),
    inAmount: amountInLamports,
    outAmount: outAmount,
  };
};
