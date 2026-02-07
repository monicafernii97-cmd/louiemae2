
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
                "border shadow-lg", // Removed backdrop-blur-md per user request

                // Hover Transformation
                "hover:scale-[1.03] hover:shadow-xl active:scale-95",

                // Variants
                variant === "primary" && [
                    "bg-earth/20 text-white border-white/20", // Tinted glass
                    "hover:bg-earth/30 hover:border-white/40",
                ],

                variant === "secondary" && [
                    "bg-black/20 text-white border-white/10",
                    "hover:bg-black/30 hover:border-white/30",
                ],

                variant === "dark" && [
                    "bg-earth/90 text-white border-transparent",
                    "hover:bg-earth hover:text-white"
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

            {/* Shimmer Effect Overlay */}
            <div
                className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12"
                aria-hidden="true"
            />
        </Component>
    );
};
