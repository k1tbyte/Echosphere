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
             height={size ?? props.height} {...props} >
            <use xlinkHref={`/sprites.svg#i${icon}`}/>
        </svg>
    )
}