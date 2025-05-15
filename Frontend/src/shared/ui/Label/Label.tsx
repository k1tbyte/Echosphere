"use client"

import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const labelVariants = cva(
    "leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 font-medium",
    {
        variants: {
            variant: {
                default: "",
                filled: "bg-foreground text-background p-1.5 rounded",
                outlined: "border border-border p-1.5",
            },
            size: {
                sm: "text-xs",
                md: "text-sm",
                lg: "text-base",
                xl: "text-lg",
            }
        },
        defaultVariants: {
            variant: "default",
            size: "md",
        },
    }
)

interface LabelProps
    extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
        VariantProps<typeof labelVariants> {}

const Label = React.forwardRef<
    React.ElementRef<typeof LabelPrimitive.Root>,
    LabelProps
>(({ className, variant, size, ...props }, ref) => (
    <LabelPrimitive.Root
        ref={ref}
        className={cn(labelVariants({ variant, size, className }))}
        {...props}
    />
))
Label.displayName = LabelPrimitive.Root.displayName

export { Label }