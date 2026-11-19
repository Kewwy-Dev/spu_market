/**
 * Spectrum UI — StarRating
 *
 * An animated star rating input. Hovering previews the rating with a spring
 * fill and a small scale wave around the pointer, clicking commits with a pop
 * and a tiny amber sparkle burst, and an optional rolling value label tracks
 * the current or previewed rating. Works controlled or uncontrolled, supports
 * fractional read-only display, honors prefers-reduced-motion, and exposes
 * radiogroup semantics with full keyboard support.
 */

import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Transition,
} from "framer-motion"

const cn = (...classes: Array<string | false | null | undefined>) =>
  classes.filter(Boolean).join(" ")

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StarRatingProps {
  /** Controlled rating value. Leave undefined for uncontrolled usage */
  value?: number
  /** Initial rating when uncontrolled. Default 0 */
  defaultValue?: number
  /** Fires with the next rating on every commit */
  onValueChange?: (value: number) => void
  /** Number of stars rendered. Default 5 */
  max?: number
  /** Visual size of the stars. Default "md" */
  size?: "sm" | "md" | "lg"
  /** Clicking the committed star clears the rating to 0. Default true */
  allowClear?: boolean
  /** Display-only mode; supports fractional values like 4.3. Default false */
  readOnly?: boolean
  /** Show a rolling "4/5" value label next to the stars. Default false */
  showValue?: boolean
  /** Accessible name of the rating group. Default "Rating" */
  label?: string
  className?: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SPARKLE_COUNT = 5
const BURST_DURATION = 0.5

/** Snappy micro spring for the hover wave and star fills */
const FILL_SPRING: Transition = { type: "spring", stiffness: 500, damping: 30 }
/** Tight tween for un-fills so stars never overshoot past zero scale */
const UNFILL_TWEEN: Transition = { duration: 0.15, ease: "easeOut" }
/** Spring for the rolling value label digits */
const VALUE_SPRING: Transition = { type: "spring", stiffness: 400, damping: 30 }
/** Celebratory squash-and-stretch pop on commit */
const POP_KEYFRAMES = [1, 0.7, 1.3, 1]
const POP_TRANSITION: Transition = {
  duration: 0.45,
  times: [0, 0.25, 0.6, 1],
  ease: "easeOut",
}
/** Hovered star scale and the falloff applied to its direct neighbors */
const WAVE_PRIMARY_SCALE = 1.2
const WAVE_NEIGHBOR_SCALE = 1.08

const SIZES = {
  sm: { icon: 14, sizeClass: "spectrum-star-sm" },
  md: { icon: 22, sizeClass: "spectrum-star-md" },
  lg: { icon: 30, sizeClass: "spectrum-star-lg" },
} as const

const STAR_PATH =
  "M12 2L14.65 8.36L21.51 8.91L16.28 13.39L17.88 20.09L12 16.5L6.12 20.09L7.72 13.39L2.49 8.91L9.35 8.36Z"

const valueVariants = {
  enter: (direction: number) => ({ y: direction * 12, opacity: 0 }),
  center: { y: 0, opacity: 1 },
  exit: (direction: number) => ({ y: direction * -12, opacity: 0 }),
}

function formatValue(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

// ─── Star icon ───────────────────────────────────────────────────────────────

function StarIcon({
  size,
  filled = false,
  className,
}: {
  size: number
  filled?: boolean
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("spectrum-star-svg", className)}
    >
      <path d={STAR_PATH} />
    </svg>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

export function StarRating({
  value: valueProp,
  defaultValue = 0,
  onValueChange,
  max = 5,
  size = "md",
  allowClear = true,
  readOnly = false,
  showValue = false,
  label = "Rating",
  className,
}: StarRatingProps) {
  const shouldReduceMotion = useReducedMotion()
  const [internalValue, setInternalValue] = useState(defaultValue)
  const [hovered, setHovered] = useState<number | null>(null)
  const [burst, setBurst] = useState<{ key: number; index: number } | null>(
    null,
  )
  const starRefs = useRef<(HTMLButtonElement | null)[]>([])

  const value = valueProp ?? internalValue
  const { icon, sizeClass } = SIZES[size]
  const previewValue = !readOnly && hovered !== null ? hovered : value
  const valueWidthCh = Math.max(
    String(max).length,
    formatValue(previewValue).length,
  )

  const previousPreviewRef = useRef(previewValue)
  const direction = previewValue >= previousPreviewRef.current ? 1 : -1
  useEffect(() => {
    previousPreviewRef.current = previewValue
  }, [previewValue])

  const commitValue = useCallback(
    (next: number) => {
      if (valueProp === undefined) setInternalValue(next)
      onValueChange?.(next)
    },
    [valueProp, onValueChange],
  )

  const handleSelect = useCallback(
    (starValue: number) => {
      const next = allowClear && starValue === value ? 0 : starValue
      commitValue(next)
      if (next > 0 && !shouldReduceMotion) {
        setBurst((previous) => ({
          key: (previous?.key ?? 0) + 1,
          index: starValue - 1,
        }))
      }
    },
    [allowClear, value, commitValue, shouldReduceMotion],
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      let next: number
      switch (event.key) {
        case "ArrowRight":
        case "ArrowUp":
          next = Math.min(value + 1, max)
          break
        case "ArrowLeft":
        case "ArrowDown":
          next = Math.max(value - 1, 1)
          break
        case "Home":
          next = 1
          break
        case "End":
          next = max
          break
        default:
          return
      }
      event.preventDefault()
      if (next !== value) commitValue(next)
      starRefs.current[next - 1]?.focus()
    },
    [value, max, commitValue],
  )

  const getScale = (index: number) => {
    if (shouldReduceMotion || readOnly || hovered === null) return 1
    const distance = Math.abs(index + 1 - hovered)
    if (distance === 0) return WAVE_PRIMARY_SCALE
    if (distance === 1) return WAVE_NEIGHBOR_SCALE
    return 1
  }

  const focusIndex = value >= 1 && value <= max ? Math.round(value) - 1 : 0

  return (
    <div
      role={readOnly ? "img" : "radiogroup"}
      aria-label={
        readOnly ? `${label}: ${formatValue(value)} out of ${max}` : label
      }
      onKeyDown={readOnly ? undefined : handleKeyDown}
      onPointerLeave={readOnly ? undefined : () => setHovered(null)}
      className={cn("spectrum-star-rating", sizeClass, className)}
    >
      <div className="spectrum-star-track">
        {Array.from({ length: max }).map((_, index) => {
          const starValue = index + 1

          if (readOnly) {
            const fillPercent =
              Math.max(0, Math.min(1, value - index)) * 100
            return (
              <span key={index} className="spectrum-star-pad spectrum-star-readonly">
                <span
                  className="spectrum-star-box"
                  style={{ width: icon, height: icon }}
                >
                  <StarIcon size={icon} className="spectrum-star-empty" />
                  {fillPercent > 0 && (
                    <span
                      className="spectrum-star-filled"
                      style={{
                        clipPath: `inset(0 ${100 - fillPercent}% 0 0)`,
                      }}
                    >
                      <StarIcon size={icon} filled />
                    </span>
                  )}
                </span>
              </span>
            )
          }

          const filled = starValue <= previewValue
          const isBursting = burst?.index === index

          return (
            <button
              key={index}
              ref={(node) => {
                starRefs.current[index] = node
              }}
              type="button"
              role="radio"
              aria-checked={starValue === value}
              aria-label={`${starValue} ${starValue === 1 ? "star" : "stars"}`}
              tabIndex={index === focusIndex ? 0 : -1}
              onClick={() => handleSelect(starValue)}
              onPointerEnter={(event) => {
                if (event.pointerType === "mouse") setHovered(starValue)
              }}
              className="spectrum-star-pad spectrum-star-btn"
            >
              <motion.span
                className="spectrum-star-box"
                style={{ width: icon, height: icon }}
                initial={false}
                animate={
                  isBursting
                    ? { scale: POP_KEYFRAMES }
                    : { scale: getScale(index) }
                }
                transition={
                  isBursting
                    ? POP_TRANSITION
                    : shouldReduceMotion
                      ? { duration: 0 }
                      : FILL_SPRING
                }
              >
                <StarIcon size={icon} className="spectrum-star-empty" />
                <motion.span
                  className="spectrum-star-filled"
                  initial={false}
                  animate={{
                    scale: filled ? 1 : 0,
                    opacity: filled ? 1 : 0,
                  }}
                  transition={
                    shouldReduceMotion
                      ? { duration: 0 }
                      : filled
                        ? FILL_SPRING
                        : UNFILL_TWEEN
                  }
                >
                  <StarIcon size={icon} filled />
                </motion.span>
              </motion.span>

              {isBursting && (
                <span
                  aria-hidden="true"
                  className="spectrum-star-sparkles"
                >
                  {Array.from({ length: SPARKLE_COUNT }).map(
                    (_, sparkleIndex) => {
                      const angle =
                        (sparkleIndex / SPARKLE_COUNT) * Math.PI * 2 -
                        Math.PI / 2
                      const distance = icon * 1.2
                      const dotSize = Math.max(2, Math.round(icon * 0.16))
                      const burstKey = burst.key
                      return (
                        <motion.span
                          key={`sparkle-${burstKey}-${sparkleIndex}`}
                          className="spectrum-star-sparkle"
                          style={{ width: dotSize, height: dotSize }}
                          initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                          animate={{
                            x: Math.cos(angle) * distance,
                            y: Math.sin(angle) * distance,
                            scale: [0, 1, 0.3],
                            opacity: [1, 1, 0],
                          }}
                          transition={{
                            duration: BURST_DURATION,
                            ease: "easeOut",
                          }}
                          onAnimationComplete={
                            sparkleIndex === 0
                              ? () =>
                                  setBurst((current) =>
                                    current?.key === burstKey ? null : current,
                                  )
                              : undefined
                          }
                        />
                      )
                    },
                  )}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {showValue && (
        <span className="spectrum-star-value" aria-hidden="true">
          <span
            className="spectrum-star-value-roller"
            style={{ minWidth: `${valueWidthCh}ch` }}
          >
            <AnimatePresence
              mode="popLayout"
              initial={false}
              custom={direction}
            >
              <motion.span
                key={formatValue(previewValue)}
                className="spectrum-star-value-digit"
                custom={direction}
                variants={valueVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={shouldReduceMotion ? { duration: 0 } : VALUE_SPRING}
              >
                {formatValue(previewValue)}
              </motion.span>
            </AnimatePresence>
          </span>
          <span>/{max}</span>
        </span>
      )}
    </div>
  )
}
