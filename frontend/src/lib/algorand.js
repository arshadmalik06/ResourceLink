import { PeraWalletConnect } from "@perawallet/connect";
import algosdk from "algosdk";

// Create the PeraWalletConnect instance
export const peraWallet = new PeraWalletConnect();

// Initialize Algod client for Testnet
// We use the public nodely API for testnet
const algodToken = "";
const algodServer = "https://testnet-api.algonode.cloud";
const algodPort = 443;
export const algodClient = new algosdk.Algodv2(algodToken, algodServer, algodPort);

/**
 * Connect to Pera Wallet
 */
export async function connectWallet() {
  try {
    // Try to reconnect if a session already exists
    let accounts;
    try {
      accounts = await peraWallet.reconnectSession();
    } catch (e) {
      // Reconnect failed, no active session
    }

    if (!accounts || accounts.length === 0) {
      accounts = await peraWallet.connect();
    }
    
    peraWallet.connector?.on("disconnect", disconnectWallet);
    
    if (!accounts || accounts.length === 0) {
      throw new Error("No accounts found in Pera Wallet");
    }
    
    return accounts[0];
  } catch (error) {
    if (error?.data?.type !== "CONNECT_MODAL_CLOSED") {
      console.error("Failed to connect to Pera Wallet:", error);
      throw new Error("Failed to connect wallet");
    }
    return null;
  }
}

/**
 * Disconnect from Pera Wallet
 */
export function disconnectWallet() {
  peraWallet.disconnect();
}

/**
 * Send an ALGO payment transaction
 * @param {string} fromAddress The sender's Algorand address
 * @param {string} toAddress The receiver's Algorand address
 * @param {number} amountAlgo The amount in ALGO
 * @returns {string} The transaction ID
 */
export async function sendPaymentTransaction(fromAddress, toAddress, amountAlgo) {
  if (!fromAddress) throw new Error("Sender address is missing.");
  if (!toAddress) throw new Error("Receiver address is missing.");

  try {
    // 1. Get suggested params from the network
    const suggestedParams = await algodClient.getTransactionParams().do();

    // 2. Convert ALGO to MicroAlgos (1 ALGO = 1,000,000 MicroAlgos)
    const amountMicroAlgos = Math.floor(amountAlgo * 1_000_000);

    // 3. Create the payment transaction
    const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      sender: fromAddress,
      receiver: toAddress,
      amount: amountMicroAlgos,
      suggestedParams,
      note: new TextEncoder().encode("ResourceLink Booking Payment via x402"),
    });

    // 4. Sign the transaction with Pera Wallet
    const singleTxnGroups = [{ txn: txn, signers: [fromAddress] }];
    const signedTxn = await peraWallet.signTransaction([singleTxnGroups]);

    // 5. Submit the transaction to the network
    const txId = txn.txID().toString();
    await algodClient.sendRawTransaction(signedTxn).do();

    // 6. Wait for confirmation
    await algosdk.waitForConfirmation(algodClient, txId, 15);

    return txId;
  } catch (error) {
    console.error("Transaction failed:", error);
    throw error;
  }
}
