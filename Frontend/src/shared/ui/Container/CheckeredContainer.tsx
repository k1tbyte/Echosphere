import {type ComponentProps, FC} from "react";
import styles from "./CheckeredContainer.module.css";
import {clsx} from "clsx";


interface ICheckeredContainer extends ComponentProps<'div'> {
    cellSize?: number;

}

export const GetCheckeredClass = () => {
    return styles.checkered;
}

export const CheckeredContainer: FC<ICheckeredContainer> = ({ children, className, cellSize = 50 }, ...props) => {
    return (
        <div style={{ backgroundSize: `${cellSize}px ${cellSize}px` }} className={clsx(styles.checkered, className)}  {...props}>
            {children}
        </div>
    );
}