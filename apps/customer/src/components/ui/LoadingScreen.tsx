type LoadingScreenProps = {
  title?: string;
  message?: string;
};

// Full-screen loading state, styled to match the post-login "Signing you in" screen.
// Reserve this for the rare case where a page truly cannot render anything until
// data arrives — prefer rendering the layout immediately with skeletons instead.
export function LoadingScreen({ title = "Loading", message = "Just a moment..." }: LoadingScreenProps) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col overflow-hidden bg-white px-4 pb-4 pt-3 text-[#3A2A1F] md:max-w-[480px]">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <p className="text-[28px] font-semibold leading-none tracking-[-0.02em]">numnums</p>
        <div className="space-y-2">
          <h1 className="text-[32px] font-semibold leading-[1] tracking-[-0.03em]">{title}</h1>
          <p className="max-w-[280px] text-[18px] leading-[1.2] text-[#6F5B4B]">{message}</p>
        </div>
      </div>
    </main>
  );
}
