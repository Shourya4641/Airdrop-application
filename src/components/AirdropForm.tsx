"use client";
import { useState, useMemo, useEffect } from "react";
import { InputForm } from "./ui/InputField";
import { chainsToTSender, erc20Abi, tsenderAbi } from "@/constants";
import { useAccount, useChainId, useConfig, useWriteContract } from "wagmi";
import { readContract, waitForTransactionReceipt } from "@wagmi/core";
import { calculateTotal } from "@/utils";
import toast, { Toaster } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
export default function AirdropForm() {
  const [tokenAddress, setTokenAddress] = useState<string>("");
  const [recipients, setRecipients] = useState<string>("");
  const [amounts, setAmounts] = useState<string>("");
  const [isCheckingAllowance, setIsCheckingAllowance] = useState(false);
  const [initialized, setInitialized] = useState(false);

  const account = useAccount();
  const chainId = useChainId();
  const config = useConfig();
  const { writeContractAsync } = useWriteContract();

  const total: number = useMemo(() => {
    return calculateTotal(amounts);
  }, [amounts]);

  useEffect(() => {
    try {
      const savedData = localStorage.getItem("airdropFormData");
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        if (parsedData) {
          setTokenAddress(parsedData.tokenAddress || "");
          setRecipients(parsedData.recipients || "");
          setAmounts(parsedData.amounts || "");
        }
      }
    } catch (error) {
      console.error("Error loading data from localStorage:", error);
    }
    setInitialized(true);
  }, []);

  useEffect(() => {
    if (initialized) {
      try {
        const airdropForm = { tokenAddress, recipients, amounts };
        localStorage.setItem("airdropFormData", JSON.stringify(airdropForm));
      } catch (error) {
        console.error("Error saving to localStorage:", error);
        toast.error("Failed to save form data locally");
      }
    }
  }, [tokenAddress, recipients, amounts, initialized]);

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
      toast.error("Please enter a valid ERC20 token address (0x...).");
      return;
    }
    setIsCheckingAllowance(true);
    try {
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
            setIsCheckingAllowance(false);
            await executeAirdrop();
          }
        } catch (error) {
          console.error("Approval process error:", error);
          toast.error("Failed to approve token spending");
          setIsCheckingAllowance(false);
        }
      } else {
        console.log("Already approved.");
        setIsCheckingAllowance(false);
        await executeAirdrop();

        localStorage.removeItem("airdropFormData");

        setTokenAddress("");
        setRecipients("");
        setAmounts("");
      }
    } catch (error) {
      console.error("Error checking allowance:", error);
      toast.error("Failed to check token allowance");
      setIsCheckingAllowance(false);
    }
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
          total,
        ],
      });
      toast.promise(
        waitForTransactionReceipt(config, { hash: airdropTrxHash }),
        {
          loading: "Processing airdrop...",
          success: "Airdrop completed successfully!",
          error: "Airdrop failed",
        }
      );
    } catch (error) {
      console.error("Airdrop process error:", error);
      toast.error("Failed to execute airdrop");
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

        {/* Submit Button */}
        <div className="flex gap-2">
          <Button variant="outline" disabled={isCheckingAllowance}>
            {isCheckingAllowance ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking allowance
              </>
            ) : (
              "Check Allowance"
            )}
          </Button>

          <Button
            variant="destructive"
            type="button"
            onClick={() => {
              localStorage.removeItem("airdropFormData");

              setTokenAddress("");
              setRecipients("");
              setAmounts("");
            }}
          >
            Reset
          </Button>
        </div>
        <Toaster position="top-center" />
      </form>
    </div>
  );
}
