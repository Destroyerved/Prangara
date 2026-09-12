import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { number } from "../../lib/format";
const revealed = new Set<string>();
/** Display interpolation only; final values are returned by the data source. */
export function AnimatedValue({
  value,
  recordKey,
  kind = "number",
}: {
  value: number;
  recordKey: string;
  kind?: "number" | "money";
}) {
  const reduce = useReducedMotion();
  const current = useMotionValue(value);
  const divisor =
    kind === "money"
      ? Math.abs(value) >= 1e7
        ? 1e7
        : Math.abs(value) >= 1e5
          ? 1e5
          : 1
      : 1;
  const format = (n: number) =>
    kind === "money"
      ? "₹" + number(n / divisor, divisor > 1 ? 2 : 0)
      : number(n);
  const display = useTransform(current, format);
  useEffect(() => {
    if (reduce || revealed.has(recordKey)) {
      current.set(value);
      return;
    }
    current.set(0);
    const animation = animate(current, value, {
      duration: 0.65,
      ease: [0.22, 1, 0.36, 1],
      onComplete: () => {
        revealed.add(recordKey);
      },
    });
    return () => animation.stop();
  }, [current, value, recordKey, reduce]);
  return (
    <motion.span className="animated-value" aria-label={format(value)}>
      {display}
    </motion.span>
  );
}
