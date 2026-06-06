import Image from "next/image";
import { getGreeting } from "@/lib/utils";

type GreetingBlockProps = {
  userName: string | null;
};

export function GreetingBlock({ userName }: GreetingBlockProps) {
  const greeting = getGreeting(userName);

  return (
    <div className="relative px-5 py-4">
      <h1 className="text-[32px] font-medium leading-tight tracking-[-0.01em] text-[#3A2A1F]">
        {greeting}
      </h1>
      <p className="mt-2 text-lg font-medium text-[#6F5B4B]">
        Here&apos;s what&apos;s next.
      </p>
      <div className="greeting-pot pointer-events-none absolute -bottom-4 right-5 z-0 h-[160px] w-[144px]">
        <Image
          src="/pot-angle.png"
          alt=""
          fill
          className="object-contain object-bottom"
          sizes="144px"
          priority
        />
      </div>
    </div>
  );
}
