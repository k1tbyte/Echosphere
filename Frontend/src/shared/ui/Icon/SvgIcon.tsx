import {FC, SVGProps} from "react";

export const enum EIcon {
    Google = 1,
}

export interface ISvgIconProps extends SVGProps<SVGSVGElement> {
    size?: number;
    className?: string;
    icon: EIcon;
}

export const SvgIcon: FC<ISvgIconProps> = ({size , className, icon, fill, ...props}) => {
    return (
        <svg fill={fill ?? "currentColor"}
             stroke={props.stroke ?? "currentColor"}
             strokeWidth={0}
             width={size ?? props.width}
             height={size ?? props.height} {...props} >
            <use xlinkHref={`/sprites.svg#i${icon}`}/>
        </svg>
    )
}