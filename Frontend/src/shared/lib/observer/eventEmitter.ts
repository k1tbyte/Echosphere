import {IObservable} from "@/shared/lib/observer/IObservable";

export class EventEmitter<T> extends IObservable<T> {
    emit(data: T): void {
        this._state = data;
        this.listeners.forEach(listener => listener(data));
    }
}