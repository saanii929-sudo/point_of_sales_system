'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface FadeInProps {
    children: React.ReactNode;
    delay?: number;
    duration?: number;
    className?: string;
    direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}

export function FadeIn({
    children,
    delay = 0,
    duration = 0.5,
    className,
    direction = 'up',
}: FadeInProps) {
    const directions = {
        up: { y: 40, x: 0 },
        down: { y: -40, x: 0 },
        left: { x: 40, y: 0 },
        right: { x: -40, y: 0 },
        none: { x: 0, y: 0 },
    };

    return (
        <motion.div
            initial={{
                opacity: 0,
                ...directions[direction],
            }}
            whileInView={{
                opacity: 1,
                x: 0,
                y: 0,
            }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{
                duration: duration,
                delay: delay,
                ease: [0.25, 0.1, 0.25, 1], // Custom ease-out
            }}
            className={cn(className)}
        >
            {children}
        </motion.div>
    );
}
