import { ConnectButton } from "@rainbow-me/rainbowkit";
export default function Home() {
  return (
    <main className="p-8">
      {" "}
      <div className="flex justify-end mb-4">
        <ConnectButton />
      </div>
      <h1>Home</h1>
    </main>
  );
}
