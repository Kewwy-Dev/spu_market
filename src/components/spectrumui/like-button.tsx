/**
 * Spectrum UI — LikeButton
 *
 * An interactive heart button with spring pop physics, a multi-colored particle
 * burst on like, and an optional rolling count display. Supports controlled and
 * uncontrolled usage, size variants, custom particle colors, and reduced motion.
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

export interface LikeButtonProps {
  /** Controlled liked state. Leave undefined for uncontrolled usage */
  liked?: boolean
  /** Initial liked state when uncontrolled. Default false */
  defaultLiked?: boolean
  /** Fires with the next liked state on every toggle */
  onLikedChange?: (liked: boolean) => void
  /** Like total excluding the current user (+1 is shown while liked; 1000+ compacts to e.g. 1.2K) */
  count?: number
  /** Hide or show the rolling counter even when count is specified. Default true */
  showCount?: boolean
  /** Visual size of the button. Default "md" */
  size?: "sm" | "md" | "lg"
  /** Custom color array cycled across burst particles */
  particleColors?: string[]
  /** Accessible name for screen readers. Default "Like" */
  label?: string
  /** Optional native title attribute */
  title?: string
  /** Disables pointer and keyboard interaction. Default false */
  disabled?: boolean
  /** Additional class names merged with default styling */
  className?: string
  /** Optional click handler (e.g. for stopping propagation inside cards) */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DEFAULT_PARTICLE_COLORS = [
  "#e6007e",
  "#f43f5e",
  "#fb7185",
  "#f59e0b",
  "#a855f7",
]

const ICON_SIZES: Record<"sm" | "md" | "lg", number> = {
  sm: 16,
  md: 20,
  lg: 24,
}

const PARTICLES = [
  { angle: -90, distance: 20, size: 5 },
  { angle: -45, distance: 22, size: 4 },
  { angle: 0, distance: 20, size: 5 },
  { angle: 45, distance: 22, size: 4 },
  { angle: 90, distance: 20, size: 5 },
  { angle: 135, distance: 22, size: 4 },
  { angle: 180, distance: 20, size: 5 },
  { angle: -135, distance: 22, size: 4 },
]

const HEART_POP_KEYFRAMES = [1, 0.72, 1.28, 1]
const HEART_POP_TRANSITION: Transition = {
  duration: 0.42,
  times: [0, 0.22, 0.58, 1],
  ease: "easeOut",
}

const ROLL_SPRING: Transition = {
  type: "spring",
  stiffness: 420,
  damping: 30,
}

function formatCompactCount(value: number): string {
  if (value >= 1_000_000) {
    const formatted = (value / 1_000_000).toFixed(1)
    return `${formatted.endsWith(".0") ? formatted.slice(0, -2) : formatted}M`
  }
  if (value >= 1_000) {
    const formatted = (value / 1_000).toFixed(1)
    return `${formatted.endsWith(".0") ? formatted.slice(0, -2) : formatted}K`
  }
  return String(value)
}

// ─── Component ───────────────────────────────────────────────────────────────

export function LikeButton({
  liked: likedProp,
  defaultLiked = false,
  onLikedChange,
  count,
  showCount = true,
  size = "md",
  particleColors = DEFAULT_PARTICLE_COLORS,
  label = "Like",
  title,
  disabled = false,
  className,
  onClick,
}: LikeButtonProps) {
  const prefersReducedMotion = useReducedMotion()
  const isControlled = likedProp !== undefined
  const [uncontrolledLiked, setUncontrolledLiked] = useState(defaultLiked)
  const isLiked = isControlled ? Boolean(likedProp) : uncontrolledLiked

  const [burstKey, setBurstKey] = useState(0)
  const [showBurst, setShowBurst] = useState(false)
  const prevLikedRef = useRef(isLiked)
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!prevLikedRef.current && isLiked && !prefersReducedMotion) {
      setBurstKey((k) => k + 1)
      setShowBurst(true)
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current)
      burstTimerRef.current = setTimeout(() => setShowBurst(false), 600)
    }
    prevLikedRef.current = isLiked
  }, [isLiked, prefersReducedMotion])

  useEffect(() => {
    return () => {
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current)
    }
  }, [])

  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(event)
      if (disabled) return

      const nextLiked = !isLiked
      if (!isControlled) {
        setUncontrolledLiked(nextLiked)
      }
      if (nextLiked && !prefersReducedMotion) {
        setBurstKey((k) => k + 1)
        setShowBurst(true)
        if (burstTimerRef.current) clearTimeout(burstTimerRef.current)
        burstTimerRef.current = setTimeout(() => setShowBurst(false), 600)
      }
      onLikedChange?.(nextLiked)
    },
    [disabled, isControlled, isLiked, onClick, onLikedChange, prefersReducedMotion]
  )

  const iconSize = ICON_SIZES[size]
  const hasCount = showCount && typeof count === "number"
  const displayCount = hasCount ? count + (isLiked ? 1 : 0) : 0
  const formattedCount = hasCount ? formatCompactCount(displayCount) : ""
  const palette =
    particleColors.length > 0 ? particleColors : DEFAULT_PARTICLE_COLORS

  return (
    <motion.button
      type="button"
      aria-label={label}
      aria-pressed={isLiked}
      title={title ?? label}
      disabled={disabled}
      onClick={handleClick}
      whileTap={disabled || prefersReducedMotion ? undefined : { scale: 0.9 }}
      className={cn(
        "spectrum-like-btn",
        `spectrum-like-btn--${size}`,
        isLiked && "is-liked",
        hasCount && "has-count",
        className
      )}
    >
      <span className="spectrum-like-heart-wrap" aria-hidden="true">
        {showBurst && !prefersReducedMotion && (
          <span key={burstKey} className="spectrum-like-particles">
            {PARTICLES.map((p, idx) => {
              const rad = (p.angle * Math.PI) / 180
              const tx = Math.cos(rad) * p.distance
              const ty = Math.sin(rad) * p.distance
              const color = palette[idx % palette.length]
              return (
                <motion.span
                  key={idx}
                  className="spectrum-like-particle"
                  style={{
                    width: p.size,
                    height: p.size,
                    backgroundColor: color,
                  }}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 1 }}
                  animate={{
                    x: tx,
                    y: ty,
                    scale: [0, 1.15, 0],
                    opacity: [1, 1, 0],
                  }}
                  transition={{
                    duration: 0.52,
                    ease: "easeOut",
                  }}
                />
              )
            })}
          </span>
        )}

        <motion.svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 24 24"
          fill={isLiked ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth={1.9}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="spectrum-like-svg"
          animate={
            prefersReducedMotion
              ? undefined
              : isLiked
              ? { scale: HEART_POP_KEYFRAMES }
              : { scale: 1 }
          }
          transition={
            isLiked && !prefersReducedMotion
              ? HEART_POP_TRANSITION
              : { duration: 0.15, ease: "easeOut" }
          }
        >
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
        </motion.svg>
      </span>

      {hasCount && (
        <span className="spectrum-like-count">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={formattedCount}
              className="spectrum-like-count-value"
              initial={
                prefersReducedMotion
                  ? false
                  : { y: isLiked ? 10 : -10, opacity: 0 }
              }
              animate={{ y: 0, opacity: 1 }}
              exit={
                prefersReducedMotion
                  ? undefined
                  : { y: isLiked ? -10 : 10, opacity: 0 }
              }
              transition={ROLL_SPRING}
            >
              {formattedCount}
            </motion.span>
          </AnimatePresence>
        </span>
      )}
    </motion.button>
  )
}

export default LikeButton
