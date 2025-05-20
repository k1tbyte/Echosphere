import React, { FC, ReactElement, useMemo } from 'react';

export const enum EPosition {
    TOP_LEFT,
    TOP_RIGHT,
    TOP_CENTER,
    MIDDLE_LEFT,
    MIDDLE_RIGHT,
    MIDDLE_CENTER,
    BOTTOM_LEFT,
    BOTTOM_RIGHT,
    BOTTOM_CENTER,
}

const POSITION_STYLES: Record<EPosition, React.CSSProperties> = {
    [EPosition.TOP_LEFT]: {
        top: 0,
        left: 0,
        transform: 'translate(-50%, -50%)'
    },
    [EPosition.TOP_RIGHT]: {
        top: 0,
        right: 0,
        transform: 'translate(50%, -50%)'
    },
    [EPosition.TOP_CENTER]: {
        top: 0,
        left: '50%',
        transform: 'translate(-50%, -50%)'
    },
    [EPosition.MIDDLE_LEFT]: {
        top: '50%',
        left: 0,
        transform: 'translate(-50%, -50%)'
    },
    [EPosition.MIDDLE_RIGHT]: {
        top: '50%',
        right: 0,
        transform: 'translate(50%, -50%)'
    },
    [EPosition.MIDDLE_CENTER]: {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
    },
    [EPosition.BOTTOM_LEFT]: {
        bottom: 0,
        left: 0,
        transform: 'translate(-50%, 50%)'
    },
    [EPosition.BOTTOM_RIGHT]: {
        bottom: 0,
        right: 0,
        transform: 'translate(50%, 50%)'
    },
    [EPosition.BOTTOM_CENTER]: {
        bottom: 0,
        left: '50%',
        transform: 'translate(-50%, 50%)'
    }
};

interface PositionedElementProps {
    children: ReactElement;
    position: EPosition;
    offset?: number;
    zIndex?: number;
    className?: string;
}

export const PositionedElement: FC<PositionedElementProps> = ({
                                                                  children,
                                                                  position,
                                                                  offset = 0,
                                                                  zIndex = 10,
                                                                  className = ''
                                                              }) => {
    // Get base styles for position
    const positionStyles = useMemo(() => {
        const styles = { ...POSITION_STYLES[position] };

        if (offset !== 0) {
            // For each direction we apply an offset if it is set in the base styles
            if ('top' in styles) {
                styles.top = typeof styles.top === 'number' ?
                    styles.top + offset :
                    styles.top;
            }

            if ('bottom' in styles) {
                styles.bottom = typeof styles.bottom === 'number' ?
                    styles.bottom + offset :
                    styles.bottom;
            }

            if ('left' in styles) {
                styles.left = typeof styles.left === 'number' ?
                    styles.left + offset :
                    styles.left;
            }

            if ('right' in styles) {
                styles.right = typeof styles.right === 'number' ?
                    styles.right + offset :
                    styles.right;
            }
        }

        return {
            position: 'absolute',
            zIndex,
            ...styles
        };
    }, [position, offset, zIndex]);

    return React.cloneElement(children, {
        // @ts-ignore
        style: {
            ...positionStyles,
            // @ts-ignore
            ...(children.props.style || {}),
        },
        // @ts-ignore
        className: `positioned-element ${className} ${children.props.className || ''}`.trim()
    });
};