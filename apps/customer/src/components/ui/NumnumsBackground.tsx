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
}))

export function NumnumsBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 select-none overflow-hidden"
    >
      {/*
        Start above the visible area so the -3° tilt doesn't leave an empty
        triangle at the top-left. 30 rows × ~100px each = ~3 000px total,
        covering any screen height. Single rotation on the whole block keeps
        every row perfectly parallel — no inter-row overlap.
      */}
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
          {ROWS.map(({ waveOffset, stagger }) => (
            <div
              key={waveOffset}
              style={{ transform: stagger ? "translateX(-52px)" : undefined }}
            >
              <WavyRow waveOffset={waveOffset} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
