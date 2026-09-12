"use client"

import { motion } from "motion/react"

import { cn } from "@/lib/utils"

const STAGGER = 0.03

export function TextRoll({
  children,
  className,
  center = false,
  isHovered,
}: {
  children: string
  className?: string
  center?: boolean
  isHovered?: boolean
}) {
  const letters = children.split("")

  return (
    <motion.span
      initial="initial"
      animate={isHovered !== undefined ? (isHovered ? "hovered" : "initial") : undefined}
      whileHover={isHovered === undefined ? "hovered" : undefined}
      className={cn(
        "relative inline-block overflow-hidden align-middle leading-[1.15] py-[1px]",
        className
      )}
      style={{
        lineHeight: 1.15,
      }}
    >
      {/* Top Text (Slides up) */}
      <span className="block whitespace-nowrap">
        {letters.map((l, i) => {
          const delay = center
            ? STAGGER * Math.abs(i - (letters.length - 1) / 2)
            : STAGGER * i

          return (
            <motion.span
              variants={{
                initial: {
                  y: 0,
                },
                hovered: {
                  y: "-100%",
                },
              }}
              transition={{
                duration: 0.32,
                ease: [0.33, 1, 0.68, 1],
                delay,
              }}
              className="inline-block"
              key={i}
            >
              {l === " " ? "\u00A0" : l}
            </motion.span>
          )
        })}
      </span>

      {/* Bottom Text (Slides in from bottom) */}
      <span className="absolute inset-0 block whitespace-nowrap" aria-hidden="true">
        {letters.map((l, i) => {
          const delay = center
            ? STAGGER * Math.abs(i - (letters.length - 1) / 2)
            : STAGGER * i

          return (
            <motion.span
              variants={{
                initial: {
                  y: "100%",
                },
                hovered: {
                  y: 0,
                },
              }}
              transition={{
                duration: 0.32,
                ease: [0.33, 1, 0.68, 1],
                delay,
              }}
              className="inline-block"
              key={i}
            >
              {l === " " ? "\u00A0" : l}
            </motion.span>
          )
        })}
      </span>
    </motion.span>
  )
}

export default TextRoll
