type WavyRowProps = {
  waveOffset?: number
}

const WAVY_CHARS = Array.from("numnumnum  ".repeat(6), (char, i) => ({ id: i, char }))

function WavyRow({ waveOffset = 0 }: WavyRowProps) {
  return (
    <div
      className="flex shrink-0 select-none whitespace-nowrap font-bold text-[#EADFCE]/25 text-[72px] md:text-[110px]"
      style={{ fontFamily: "var(--font-display)", letterSpacing: "0.2em" }}
    >
      {WAVY_CHARS.map(({ id, char }) => (
        <span
          key={id}
          className="inline-block"
          style={{ transform: `translateY(${(Math.sin((id + waveOffset) * 0.65) * 8).toFixed(4)}px)` }}
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
