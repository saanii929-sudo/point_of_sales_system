'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface StaggerContainerProps {
    children: React.ReactNode;
    delayChildren?: number;
    staggerChildren?: number;
    className?: string;
}

export function StaggerContainer({
    children,
    delayChildren = 0.1,
    staggerChildren = 0.1,
    className,
}: StaggerContainerProps) {
    return (
        <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
            variants={{
                hidden: {},
                visible: {
                    transition: {
                        staggerChildren,
                        delayChildren,
                    },
                },
            }}
            className={cn(className)}
        >
            {children}
        </motion.div>
    );
}

export const staggerItemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            type: 'spring',
            damping: 20,
            stiffness: 100,
        },
    },
};
