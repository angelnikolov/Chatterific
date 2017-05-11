import { Directive, ElementRef, Input, Renderer, AfterViewInit, EventEmitter, Output } from '@angular/core';

@Directive({ selector: '[message]' })
export class MessageDirective implements AfterViewInit {
    @Output() onMessageAdded: EventEmitter<any> = new EventEmitter<any>();
    constructor(private _elementRef: ElementRef, private renderer: Renderer) {
    }

    ngAfterViewInit() {
        this.onMessageAdded.emit();

    }
}