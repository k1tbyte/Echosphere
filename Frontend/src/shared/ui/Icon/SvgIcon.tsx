import {FC, SVGProps} from "react";

export const enum EIcon {
    Google = 1,
    Check,
    CrossFill,
    Close,
    AlertCircleOutline,
    InfoCircleOutline,
    CloseCircleOutline,
    CheckCircleOutline,
    Cog = 9,
    Bell = 10,
    Vimeo = 11,
    YouTube = 12,
    CircleFilled = 13,
    CancelBlock = 14,
    Plus = 15,
    Magnifier,
    OrderAscending,
    OrderDescending,
}

export interface ISvgIconProps extends SVGProps<SVGSVGElement> {
    size?: number;
    className?: string;
    icon: EIcon;
}

export const SvgIcon: FC<ISvgIconProps> = ({size, icon, fill, ...props}) => {
    return (
        <svg fill={fill ?? "currentColor"}
             stroke={props.stroke ?? "currentColor"}
             strokeWidth={0}
             width={size ?? props.width}
             height={size ?? props.height} {...props}>
            <use xlinkHref={`/images/sprites.svg#i${icon}`}/>
        </svg>
    )
}

export const IconButton: FC<ISvgIconProps> = ({size, icon, fill, className, ...props}) => {
    return (
        // @ts-ignore
        <button className={`hover:text-accent-foreground text-foreground/80 cursor-pointer transition-colors flex-center ${className ?? ''}`}
                style={{width: size, height: size}}
                {...props}>
            <SvgIcon icon={icon} size={size} fill={fill}/>
        </button>
    )
}