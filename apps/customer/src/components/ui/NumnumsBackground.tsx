type WavyRowProps = {
  waveOffset?: number
}

function WavyRow({ waveOffset = 0 }: WavyRowProps) {
  const full = "numnumnum  ".repeat(6)
  return (
    <div
      className="flex shrink-0 select-none whitespace-nowrap font-bold text-[#EADFCE]/25 text-[72px] md:text-[110px]"
      style={{ fontFamily: "var(--font-display)", letterSpacing: "0.2em" }}
    >
      {full.split("").map((char, index) => (
        <span
          key={index}
          className="inline-block"
          style={{ transform: `translateY(${Math.sin((index + waveOffset) * 0.65) * 8}px)` }}
        >
          {char}
        </span>
      ))}
    </div>
  )
}

const ROWS = Array.from({ length: 30 }, (_, i) => ({
  waveOffset: i * 5,
  stagger: i % 2 === 1,
  animationName: i % 2 === 0 ? "bgRowLeft" : "bgRowRight",
  animationDelay: `${-(i * 1.4).toFixed(1)}s`,
}))

type NumnumsBackgroundProps = {
  animated?: boolean
}

export function NumnumsBackground({ animated = false }: NumnumsBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
    >
      <div
        style={{
          position: "absolute",
          top: "-80px",
          left: "-8%",
          width: "116%",
          transform: "rotate(-3deg)",
        }}
      >
        <div className="flex flex-col gap-7 md:gap-11">
          {ROWS.map(({ waveOffset, stagger, animationName, animationDelay }) => (
            <div
              key={waveOffset}
              style={{
                transform: stagger ? "translateX(-52px)" : undefined,
                animation: animated
                  ? `${animationName} 22s ease-in-out infinite alternate`
                  : undefined,
                animationDelay: animated ? animationDelay : undefined,
              }}
            >
              <WavyRow waveOffset={waveOffset} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
