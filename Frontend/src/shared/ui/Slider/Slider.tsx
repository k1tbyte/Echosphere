"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import {cn} from "@/shared/lib/utils";
import {Badge} from "@/shared/ui/Badge";

const Slider = React.forwardRef<
    React.ElementRef<typeof SliderPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
    <SliderPrimitive.Root
        ref={ref}
        className={cn(
            "relative flex w-full touch-none select-none items-center",
            className
        )}
        {...props}
    >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
            <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
))

const SliderWithLabel = React.forwardRef<
    React.ElementRef<typeof SliderPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { labelAfter?: string, whileHover?: boolean }
>(({ className, onValueChange, labelAfter,value, whileHover = true, ...props }, ref) => {

    const [progress, setProgress] = React.useState(props.defaultValue);
    React.useEffect(() => {
        if (value !== undefined) {
            setProgress(value);
        }
    }, [value]);

    const handleValueChange = (value: number[]) => {
        onValueChange?.(value);
        setProgress(value);
    };
    return (
        <SliderPrimitive.Root
            ref={ref}
            value={value}
            onValueChange={handleValueChange}
            className={cn("relative flex w-full touch-none select-none items-center", className)}
            {...props}
        >
            <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
                <SliderPrimitive.Range className="absolute h-full bg-primary"/>
            </SliderPrimitive.Track>

            <SliderPrimitive.Thumb
                className="group block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
                {/* Sticky label */}
                <Badge className={cn("absolute left-1/2 -translate-x-1/2 -translate-y-1/2 -top-5 transition-transform", whileHover ? "scale-0 group-hover:scale-100" : "")}>
                    <span className="whitespace-nowrap">{progress?.[0]}{labelAfter}</span>
                    {/* Arrow */}
                    <div
                        className="absolute border-[6px] left-1/2 -translate-x-1/2 border-transparent border-t-primary top-full"/>
                </Badge>
            </SliderPrimitive.Thumb>
        </SliderPrimitive.Root>
    );
});

const SliderWithMarks = React.forwardRef<
    React.ElementRef<typeof SliderPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & { marks: string[] }
>(({ className, onValueChange, marks, ...props }, ref) => {

    return (
        <>
            <Slider max={marks.length - 1} {...props} />
            <div className="mt-2 flex items-center justify-between text-muted-foreground">
                {marks.map((o) => (
                    <span className="whitespace-pre" key={o}>{o}</span>
                ))}
            </div>
        </>
    )
})



Slider.displayName = SliderPrimitive.Root.displayName

export { Slider, SliderWithLabel, SliderWithMarks }
