import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import {cn} from "@/shared/lib/utils";
import {Loader} from "@/shared/ui/Loader";
import Link from "next/link";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 cursor-pointer",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground shadow hover:bg-primary/90",
                destructive:
                    "bg-red-600/20 hover:bg-red-600/30 text-red-500 shadow-none rounded-sm",
                success: "bg-green-600/20 hover:bg-green-600/30 text-green-500 shadow-none rounded-sm",
                outline:
                    "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
                secondary:
                    "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
                ghost: "hover:bg-accent hover:text-accent-foreground",
                transparent: "bg-transparent hover:text-foreground text-foreground/80 transition-colors duration-400",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                auto: "",
                default: "h-9 px-4 py-2",
                sm: "h-8 rounded-md px-3 text-xs",
                lg: "h-10 rounded-md px-8",
                icon: "h-9 w-9",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
    asChild?: boolean;
    loading?: boolean;
    href?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size,loading,href, children, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        if(href) {
            children = <Link href={href} className="w-full h-full">{children}</Link>
        }

        return (
            <Comp
                className={cn({ "pointer-events-none": loading },buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            >
                {loading && <Loader variant={"dots"} className="text-inherit"/> }
                {!loading && children}
            </Comp>
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
