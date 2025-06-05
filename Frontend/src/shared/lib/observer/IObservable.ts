export class IObservable <T> {
    protected _state: T | undefined;
    protected listeners: Array<(data: T) => void> = [];

    public subscribe(listener: (data: T) => void): void {
        this.listeners.push(listener);
    }

    public unsubscribe(listener: (data: T) => void): void {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }

    public get state() {
        return this._state;
    }
}
