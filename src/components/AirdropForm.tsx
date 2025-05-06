"use client";

import { useState } from "react";
import { InputForm } from "./ui/InputField";

export default function AirdropForm() {
  const [tokenAddress, setTokenAddress] = useState<string>("");

  return (
    <div className="p-4 space-y-4">
      {" "}
      <InputForm
        label="Token Address"
        placeholder="Enter token contract address (e.g., 0x...)"
        value={tokenAddress}
        onChange={(e) => setTokenAddress(e.target.value)}
        type="text"
      />
    </div>
  );
}
