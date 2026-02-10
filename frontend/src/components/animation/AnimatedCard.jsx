import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0 },
};

export default function AnimatedCard({
  delay = 0,
  className = '',
  hoverScale = 1.03,
  tapScale = 0.97,
  enableTap = false,
  children,
}) {
  return (
    <motion.div
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      transition={{
        duration: 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ scale: hoverScale }}
      whileTap={enableTap ? { scale: tapScale } : undefined}
      style={{ willChange: 'transform' }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
