"use client";

import { useState, useMemo } from "react";
import { InputForm } from "./ui/InputField";
import { chainsToTSender, erc20Abi, tsenderAbi } from "@/constants";
import { useAccount, useChainId, useConfig, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "@wagmi/core";
import { calculateTotal } from "@/utils";
import toast, { Toaster } from "react-hot-toast";

export default function AirdropForm() {
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [recipients, setRecipients] = useState("");
  const [amounts, setAmounts] = useState<string>("");

  const account = useAccount();
  const chainId = useChainId();
  const config = useConfig();

  const {
    data: hash,
    isPending,
    error,
    writeContractAsync,
  } = useWriteContract();

  const total: number = useMemo(() => {
    return calculateTotal(amounts);
  }, [amounts]);

  async function handleSubmit() {
    console.log("Form submitted");
    console.log("Token Address:", tokenAddress);
    console.log("Recipients:", recipients);
    console.log("Amounts:", amounts);

    const tSenderAddress = chainsToTSender[chainId]?.tsender;

    if (!tSenderAddress) {
      console.log("No TSender address found for this chain");
      return;
    }

    if (!account.address) {
      toast.error("Please connect your wallet.");
      return;
    }

    if (!tokenAddress || !/^0x[a-fA-F0-9]{40}$/.test(tokenAddress)) {
      alert("Please enter a valid ERC20 token address (0x...).");
      return;
    }
    const result = await getApprovedAmount(
      tSenderAddress as `0x${string}`,
      tokenAddress as `0x${string}`,
      account.address
    );

    if (result < total) {
      try {
        const approvalHash = await writeContractAsync({
          abi: erc20Abi,
          address: tokenAddress as `0x${string}`,
          functionName: "approve",
          args: [tSenderAddress as `0x${string}`, BigInt(total)],
        });

        console.log("Approval transaction hash:", approvalHash);

        const approvalReceipt = await waitForTransactionReceipt(config, {
          hash: approvalHash,
        });

        console.log("Approval transaction receipt:", approvalReceipt);

        if (approvalReceipt.status !== "success") {
          throw new Error("Approval transaction failed.");
        } else {
          console.log("Approval transaction succeeded.");
          await executeAirdrop();
        }
      } catch (error) {
        console.error("Approval process error:", error);
        throw new Error("Failed to fetch token allowance.");
      }
    } else {
      console.log("Already approved.");
      await executeAirdrop();
    }

    console.log("Current Chain ID:", chainId);
    console.log("TSender Address for this chain:", tSenderAddress);
  }

  const executeAirdrop = async () => {
    try {
      const tSenderAddress = chainsToTSender[chainId]?.tsender;

      const recipientAddresses = recipients
        .split(/[, \n]+/)
        .map((addr) => addr.trim())
        .filter((addr) => addr !== "")
        .map((addr) => addr as `0x${string}`);

      const airdropAmounts = amounts
        .split(/[, \n]+/)
        .map((amt) => amt.trim())
        .filter((amt) => amt !== "")
        .map((amount) => BigInt(amount));

      const airdropTrxHash = await writeContractAsync({
        abi: tsenderAbi,
        address: tSenderAddress as `0x${string}`,
        functionName: "airdropERC20",
        args: [
          tokenAddress as `0x${string}`,
          recipientAddresses,
          airdropAmounts,
        ],
      });

      const airdropReceipt = await waitForTransactionReceipt(config, {
        hash: airdropTrxHash,
      });

      console.log("Airdrop transaction receipt:", airdropReceipt);
    } catch (error) {
      console.error("Airdrop process error:", error);
      throw new Error("Failed to execute airdrop.");
    }
  };

  async function getApprovedAmount(
    spenderAddress: `0x${string}`,
    erc20TokenAddress: `0x${string}`,
    ownerAddress: `0x${string}`
  ): Promise<bigint> {
    console.log(`Checking allowance for token ${erc20TokenAddress}`);
    console.log(`Owner: ${ownerAddress}`);
    console.log(`Spender: ${spenderAddress}`);

    try {
      const allowance = await readContract(config, {
        abi: erc20Abi,
        address: erc20TokenAddress,
        functionName: "allowance",
        args: [ownerAddress, spenderAddress],
      });

      console.log("Raw allowance response:", allowance);

      return allowance as bigint;
    } catch (error) {
      console.error("Error:", error);
      throw new Error("Failed to fetch token allowance.");
    }
  }
  return (
    <div className="p-4 space-y-4">
      {/* ✅ FORM STARTS HERE */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-4"
      >
        {/* Token Address Input */}
        <InputForm
          label="Token Address"
          placeholder="Enter token contract address (e.g., 0x...)"
          value={tokenAddress}
          onChange={(e) => setTokenAddress(e.target.value)}
          type="text"
        />

        {/* Recipients Input */}
        <InputForm
          label="Recipients"
          placeholder="Comma-separated addresses (e.g., 0x123...,0x456...)"
          value={recipients}
          onChange={(e) => setRecipients(e.target.value)}
          type="text"
          large
        />

        {/* Amounts Input */}
        <InputForm
          label="Amounts"
          placeholder="Comma-separated amounts (e.g., 10,20,30)"
          value={amounts}
          onChange={(e) => setAmounts(e.target.value)}
          type="text"
          large
        />

        <div>
          <strong>Total Amount: {total}</strong>
        </div>

        {/* ✅ Submit Button */}
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Check Allowance
        </button>
        <Toaster position="top-center" />
      </form>
    </div>
  );
}
