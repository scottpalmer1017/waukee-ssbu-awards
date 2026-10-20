import VotingFlow from "@/components/VotingFlow";

export default function Home() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="arena-bg" aria-hidden />
      <VotingFlow />
    </div>
  );
}
