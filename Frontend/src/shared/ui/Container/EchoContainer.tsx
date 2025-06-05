import {type ComponentProps, FC} from "react";
import {EPosition, PositionedElement} from "@/shared/ui/Particles/PositionedElement";
import {Plus} from "lucide-react";
import { cn } from "@/shared/lib/utils";

export const EchoContainer: FC<ComponentProps<'div'>> = ({ className, children }) => {
    return <div className={cn("bg-background/75 border border-dashed md:px-6 py-5 relative", className)}>
        {children}
        <PositionedElement position={EPosition.TOP_RIGHT} children={<Plus/>}/>
        <PositionedElement position={EPosition.BOTTOM_RIGHT} children={<Plus/>}/>
        <PositionedElement position={EPosition.TOP_LEFT} children={<Plus/>}/>
        <PositionedElement position={EPosition.BOTTOM_LEFT} children={<Plus/>}/>
    </div>
}