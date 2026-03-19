'use client';

import { HTMLMotionProps, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface InteractiveCardProps extends HTMLMotionProps<'div'> {
    children: React.ReactNode;
    className?: string;
    glowColor?: string;
}

export function InteractiveCard({
    children,
    className,
    glowColor = 'rgba(16, 185, 129, 0.15)', // Default Emerald
    ...props
}: InteractiveCardProps) {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <motion.div
            onHoverStart={() => setIsHovered(true)}
            onHoverEnd={() => setIsHovered(false)}
            whileHover={{ y: -5, scale: 1.02 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            className={cn(
                'relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50',
                ' transition-shadow duration-300 overflow-hidden',
                className
            )}
            {...props}
        >
            {/* Dynamic Glow Effect */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: isHovered ? 1 : 0 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `radial-gradient(circle at center, ${glowColor} 0%, transparent 70%)`,
                }}
            />

            {/* Content wrapper to keep it above the glow */}
            <div className="relative z-10">{children}</div>
        </motion.div>
    );
}
