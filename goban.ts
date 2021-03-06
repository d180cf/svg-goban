namespace testbench {
    export class SVGGobanItemsCollection {
        private tag: string; // can be null; the "id" attribute for <use xlink:href="#ID">
        private elements: { [coords: string]: HTMLElement } = {}; // elements["2,7"] = <...>

        constructor(private svg: SVGGobanElement, private update: (x: number, y: number) => void, private def: string) {
            try {
                this.tag = /\bid="(\w+)"/.exec(def)[1];
                const defs = svg.querySelector('defs');

                // IE doesn't support innerHTML for SVG elements, hence this hack
                const g = <HTMLElement>document.createElementNS(this.svg.getAttribute('xmlns'), 'g');
                g.innerHTML = def;
                const m = <HTMLElement>g.firstChild;
                g.removeChild(m);
                defs.appendChild(m);
            } catch (_) {
                // the svg element cannot be referred to with <use>
            }
        }

        get(x: number, y: number): HTMLElement {
            for (const coords in this.elements)
                if (x + ',' + y == coords)
                    return this.elements[coords];

            return null;
        }

        add(x: number, y: number, value?: string): HTMLElement {
            const ref = this.get(x, y);
            if (ref) return ref;

            const g = <HTMLElement>document.createElementNS(this.svg.getAttribute('xmlns'), 'g');

            g.innerHTML = this.tag ?
                `<use x="${x}" y="${y}" xlink:href="#${this.tag}"/>` :
                this.def.replace(/\bx=""/, 'x="' + x + '"').replace(/\by=""/, 'y="' + y + '"').replace('></', '>' + value + '</');

            const m = <HTMLElement>g.firstChild;

            g.removeChild(m);
            this.svg.appendChild(m);
            this.elements[x + ',' + y] = m;
            this.update(x, y);
            return m;
        }

        remove(x: number, y: number) {
            const ref = this.get(x, y);
            if (!ref) return;
            this.svg.removeChild(ref);
            delete this.elements[x + ',' + y];
            this.update(x, y);
        }

        flip(x: number, y: number) {
            if (this.get(x, y))
                this.remove(x, y);
            else
                this.add(x, y);
        }

        clear() {
            for (const coords in this.elements) {
                const ref = this.elements[coords];

                const x = +ref.getAttribute('x');
                const y = +ref.getAttribute('y');

                this.svg.removeChild(ref);
                this.update(x, y);
            }

            this.elements = {};
        }
    }

    export interface SVGGobanElement extends HTMLElement {
        AB: SVGGobanItemsCollection; // black stone
        AW: SVGGobanItemsCollection; // white stone
        CR: SVGGobanItemsCollection; // circle
        TR: SVGGobanItemsCollection; // triangle
        SQ: SVGGobanItemsCollection; // square
        MA: SVGGobanItemsCollection; // cross
        SL: SVGGobanItemsCollection; // selection
        LB: SVGGobanItemsCollection; // text label

        addEventListener(type: "click", listener: (ev: GobanMouseEvent) => any, useCapture?: boolean): void;
        addEventListener(type: "mousedown", listener: (ev: GobanMouseEvent) => any, useCapture?: boolean): void;
        addEventListener(type: "mousemove", listener: (ev: GobanMouseEvent) => any, useCapture?: boolean): void;
        addEventListener(type: "mouseup", listener: (ev: GobanMouseEvent) => any, useCapture?: boolean): void;
        addEventListener(type: string, listener: EventListenerOrEventListenerObject, useCapture?: boolean): void;
    }

    export interface GobanMouseEvent extends MouseEvent {
        /** 0-based column index, counted from the left side */
        cellX: number;

        /** 0-based row index, counted from the top side */
        cellY: number;
    }

    export module SVGGobanElement {
        export function create(n: number): SVGGobanElement {
            const div = document.createElement('div');

            div.innerHTML = `
            <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
                 xmlns:xlink="http://www.w3.org/1999/xlink"
                 width="100%"
                 viewBox="-1.5 -1.5 ${n + 2} ${n + 2}">
              <defs>
                <pattern id="svg-goban-grid" x="0" y="0" width="1" height="1" patternUnits="userSpaceOnUse">
                  <path d="M 1 0 L 0 0 0 1" fill="none" stroke="black" stroke-width="0.05"></path>
                </pattern>
              </defs>

              <rect x="0" y="0" width="${n - 1}" height="${n - 1}" fill="url(#svg-goban-grid)" stroke="black" stroke-width="0.1"></rect>
            </svg>`;

            const svg: SVGGobanElement = div.querySelector('svg') as any;

            div.removeChild(svg);

            Object.assign(svg, {
                AB: new SVGGobanItemsCollection(svg, update, '<circle id="AB" r="0.475" fill="black" stroke="black" stroke-width="0.05"></circle>'),
                AW: new SVGGobanItemsCollection(svg, update, '<circle id="AW" r="0.475" fill="white" stroke="black" stroke-width="0.05"></circle>'),
                CR: new SVGGobanItemsCollection(svg, update, '<circle id="CR" r="0.5" stroke="none" transform="scale(0.4)"></circle>'),
                TR: new SVGGobanItemsCollection(svg, update, '<path id="TR" d="M 0 -0.5 L -0.433 0.25 L 0.433 0.25 Z" stroke="none" transform="scale(0.5)"></path>'),
                MA: new SVGGobanItemsCollection(svg, update, '<path id="MA" d="M -0.2 -0.2 L 0.2 0.2 M 0.2 -0.2 L -0.2 0.2" stroke-width="0.05"></path>'),
                SQ: new SVGGobanItemsCollection(svg, update, '<rect id="SQ" x="-0.5" y="-0.5" width="1" height="1" stroke="none" transform="scale(0.4)"></rect>'),
                SL: new SVGGobanItemsCollection(svg, update, '<rect id="SL" x="-0.5" y="-0.5" width="1" height="1" fill-opacity="0.5" stroke="none"></rect>'),
                LB: new SVGGobanItemsCollection(svg, update, `<text x="" y="" font-size="0.3" text-anchor="middle" dominant-baseline="middle" stroke-width="0"></text>`),
            });

            // invoked after a marker has been added or removed
            function update(x: number, y: number) {
                const color = svg.AB.get(x, y) ? 'white' : 'black';

                for (const mark in svg) {
                    if (/^[A-Z]{2}$/.test(mark) && !/AB|AW|SL/.test(mark)) {
                        try {
                            const item = (<SVGGobanItemsCollection>svg[mark]).get(x, y);

                            if (item) {
                                item.setAttribute('stroke', color);
                                item.setAttribute('fill', color);
                            }
                        } catch (err) {
                            console.log(mark, x, y, err);
                        }
                    }
                }
            }

            // upper letters: A, B, C, ... (I is skipped)
            for (let x = 0; x < n; x++) {
                const label = String.fromCharCode(0x41 + x + (x > 7 ? 1 : 0));
                svg.LB.add(x, -0.7, label);
            }

            // left digits: 9, 8, 7, ...
            for (let y = 0; y < n; y++) {
                const label = n - y + '';
                svg.LB.add(-0.7, y, label);
            }

            // lower labels: a, b, c, ...
            for (let x = 0; x < n; x++) {
                const label = String.fromCharCode(0x61 + x);
                svg.LB.add(x, n - 1 + 0.7, label);
                svg.LB.add(n - 1 + 0.7, x, label);
            }

            function getStoneCoords(event: MouseEvent) {
                // Chrome had a bug which made offsetX/offsetY coords wrong
                // this workaround computes the offset using client coords
                const r = svg.getBoundingClientRect();

                const offsetX = event.clientX - r.left;
                const offsetY = event.clientY - r.top;

                const x = offsetX / r.width;
                const y = offsetY / r.height;

                const nx = Math.round(x * (n + 2) - 1.5);
                const ny = Math.round(y * (n + 2) - 1.5);

                return nx >= 0 && nx < n && ny >= 0 && ny < n && [nx, ny];
            }

            function attachCellCoords(event: GobanMouseEvent) {
                const coords = getStoneCoords(event);

                if (coords)
                    [event.cellX, event.cellY] = coords;
            }

            svg.addEventListener('click', attachCellCoords);
            svg.addEventListener('mousedown', attachCellCoords);
            svg.addEventListener('mousemove', attachCellCoords);
            svg.addEventListener('mouseup', attachCellCoords);

            return svg;
        }
    }
}
