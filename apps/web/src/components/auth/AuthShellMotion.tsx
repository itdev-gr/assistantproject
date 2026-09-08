'use client';

import { motion } from 'framer-motion';
import { fadeUp, stagger } from '@/components/public/motion';

/** Client boundary for the auth shell's entrance animations. */

export function AuthStagger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={stagger} initial="hidden" animate="visible">
      {children}
    </motion.div>
  );
}

export function AuthItem({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div className={className} variants={fadeUp}>
      {children}
    </motion.div>
  );
}
