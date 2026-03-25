
import React from "react";
import { cn } from "../../lib/utils";

interface GlassButtonProps extends React.HTMLAttributes<HTMLElement> {
    variant?: "primary" | "secondary" | "dark";
    fullWidth?: boolean;
    size?: "sm" | "md" | "lg";
    as?: any; // Allow any component/element type
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
}

/**
 * GlassButton - A modern, elevated button with glassmorphism effects.
 * Includes hover shimmer, scale, and premium typography.
 * Supports polymorphic rendering (as="div", as={Link}, etc.)
 */
export const GlassButton: React.FC<GlassButtonProps> = ({
    className,
    variant = "primary",
    fullWidth = false,
    size = "md",
    as: Component = "button",
    children,
    ...props
}) => {
    return (
        <Component
            className={cn(
                // Base Layout
                "relative group overflow-hidden transition-all duration-300 ease-out",
                "flex items-center justify-center gap-2",
                "cursor-pointer", // Ensure pointer cursor even for divs
                "rounded-md", // Rounded corners, but not full pill

                // Typography
                "uppercase tracking-[0.2em] font-light",

                // Glass Effect Base (Clear Glass)
                "border shadow-lg", // No backdrop-blur on primary to avoid frosted look

                // Hover Transformation
                "hover:scale-[1.03] hover:shadow-xl active:scale-95",

                // Variants
                variant === "primary" && [
                    "bg-earth/20 text-white border-white/30", // Tinted glass + stronger border
                    "bg-gradient-to-b from-white/10 to-transparent", // Glossy reflection
                    "hover:bg-earth/30 hover:border-white/50",
                ],

                variant === "secondary" && [
                    "bg-cream/40 text-earth border border-white/50",
                    "hover:bg-cream/60 hover:border-bronze/40 hover:text-bronze shadow-md",
                ],

                variant === "dark" && [
                    "bg-gradient-to-b from-[#3a2a1a]/90 via-[#2d1f12]/85 to-[#1a130a]/90 text-cream", // Vibrant earthy gradient
                    "border border-bronze/30", // Warm bronze border
                    "shadow-[0_20px_50px_rgba(139,90,43,0.25),inset_0_1px_0_rgba(255,255,255,0.15)]", // Outer glow + top glass highlight
                    "hover:from-[#4a3622]/95 hover:via-[#3a2817]/90 hover:to-[#22190d]/95 hover:border-bronze/50 hover:shadow-[0_30px_60px_rgba(139,90,43,0.35),inset_0_1px_0_rgba(255,255,255,0.25)]",
                ],

                // Sizes
                size === "sm" && "px-6 py-3 text-[10px] md:text-xs",
                size === "md" && "px-8 py-4 md:px-10 md:py-5 text-xs md:text-sm",
                size === "lg" && "px-12 py-5 md:px-14 md:py-6 text-sm md:text-base",

                fullWidth ? "w-full" : "w-auto",

                className
            )}
            {...props}
        >
            {/* Content z-index adjustment */}
            <span className="relative z-10 flex items-center gap-2">
                {children}
            </span>

            {/* Multi-layered Glass Highlights (Dark variant only) */}
            {variant === "dark" && (
                <>
                    <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/10 via-transparent to-bronze/5 pointer-events-none" />
                    <div className="absolute inset-0 rounded-md border border-white/10 pointer-events-none mix-blend-overlay" />
                    <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-bronze/20 to-transparent pointer-events-none rounded-b-md" />
                </>
            )}

            {/* Shimmer Effect Overlay */}
            <div
                className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12 pointer-events-none"
                aria-hidden="true"
            />
        </Component>
    );
};
