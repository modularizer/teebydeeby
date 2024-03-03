class TeebyDeeby extends HTMLElement {
    constructor() {
        super();


        this._headers = [];
        this._data = []; // list of lists

        this.setupInnerHTML = this.setupInnerHTML.bind(this);
        this.onload = this.onload.bind(this);

        this._rowToDict = this._rowToDict.bind(this);

        // column operations
        this.addColumn = this.addColumn.bind(this);
        this.removeColumn = this.removeColumn.bind(this);
        this.moveColumn = this.moveColumn.bind(this);

        // row operations
        this.addRow = this.addRow.bind(this);
        this.removeRow = this.removeRow.bind(this);
        this.moveRow = this.moveRow.bind(this);

        this.parser = new InputParser();
        this.out = new OutputParser(this);

        this.fromSRC = this.fromSRC.bind(this);
        this.setContent = this.setContent.bind(this);

        // for every method in parser which starts with "from", add a method bound to this which calls the parser method then set_content
        for (let method of Object.getOwnPropertyNames(Object.getPrototypeOf(this.parser))) {
            if (method.startsWith('from')) {
                if (!this[method]){
                    this[method] = (function (a, b){
                        let [h, d] = this.parser[method](a, b);
                        this.setContent(h, d);
                    }).bind(this);
                }
            }
        }

        document.addEventListener('DOMContentLoaded', this.onload);
    }

    setupInnerHTML() {
//        this.attachShadow({mode: 'open'});
//        this.shadowRoot.innerHTML = `
//
//            <table>
//            </table>
//        `;
//        this.table = this.shadowRoot.querySelector('table');
//        this.headersRow = this.table.createTHead();
//        this.tbody = this.table.createTBody();
//        this.innerHTML = '';
        this.innerHTML = `
            <table>
            </table>
        `;
        this.table = this.querySelector('table');
        this.headersRow = this.table.createTHead();
        this.tbody = this.table.createTBody();
    }

    onload(){
        let t = this.innerHTML.trim()
        this.setupInnerHTML();
        if (t){
            this.fromString(t);
            return
        }

        // get headers and data from attributes
        // expect a string, possibly encoded by btoa
        let headers = this.getAttribute('headers');
        let data = this.getAttribute('data');
        let markdown = this.getAttribute('md');
        let csv = this.getAttribute('csv');
        let src = this.getAttribute('src');

        if (src){
            this.fromSRC(src);
            return
        }


        console.log(this, {headers, data, markdown, csv})
        if ((!headers) && (!data)) {
            if (markdown) {
                this.fromMarkdown(markdown);
            }else if (csv) {
                this.fromCSV(csv);
            }else{
                // get from url search params
                let url = new URL(window.location.href);
                headers = url.searchParams.get('headers');
                data = url.searchParams.get('data');
                markdown = url.searchParams.get('md');
                csv = url.searchParams.get('csv');
                src= url.searchParams.get('src');
                if (src){
                    this.fromSRC(src);

                    return
                }

                console.log("url", {headers, data, markdown, csv})

                if ((!headers) && (!data)) {
                    if (markdown) {
                        this.fromMarkdown(markdown);
                    }else if (csv) {
                        this.fromCSV(csv);
                    }else{
                        // wait for user to set content

                    }
                }
                this.fromData(headers, data);
            }
            return
        }
        this.fromData(headers, data);
    }

    fromSRC(src){
        this.parser.fromSRC(src).then(([h, d]) => this.setContent(h, d));
    }

    // column operations
    addColumn(headerKey = null, index = -1, fillValue = undefined) {
        // insert headerKey into headers at index
        // -1 means append to end, -2 means insert before last element
        if (index < 0) {
            index = this._headers.length + index + 1;
        }
        if (headerKey === null) {
            headerKey = `#<${index}>`;
        }
        this._headers.splice(index, 0, headerKey);

        // add th tag cell to headers row
        let th = document.createElement('th');
        th.innerHTML = headerKey;
        this.headersRow.appendChild(th);


        // modify any old headers of `#index`
        this._headers = this._headers.map((x, i) =>{
            if (x.startsWith('#<') && x.endsWith('>')) {
                return `#<${i}>`;
            }
            return x;
        });

        for (let data of this._data) {
            let isfunc = typeof fillValue === 'function';
            if (isfunc) {
                data.splice(index, 0, null);
                fillValue = fillValue(this._rowToDict(data));
                data[index] = fillValue;
            }else {
                data.splice(index, 0, fillValue);
            }
        }

        for (let row of this.tbody.children){
            if (i == 0) {
                continue;
            }
            console.log(row, i, index);
            let cell = row.insertCell(index);
            cell.innerHTML = fillValue;
        }
    }

    removeColumn(index) {
        if (index < 0) {
            index = this._headers.length + index;
        }
        this._headers.splice(index, 1);
        for (let data of this._data) {
            data.splice(index, 1);
        }
        for (let row of this.tbody.children){
            row.deleteCell(index);
        }
    }

    moveColumn(startIndex, endIndex) {
        if (startIndex < 0) {
            startIndex = this._headers.length + startIndex;
        }
        if (endIndex < 0) {
            endIndex = this._headers.length + endIndex;
        }
        let header = this._headers.splice(startIndex, 1)[0];
        this._headers.splice(endIndex, 0, header);
        for (let data of this._data) {
            let value = data.splice(startIndex, 1)[0];
            data.splice(endIndex, 0, value);
        }
        for (let row of this.tbody.children){
            let cell = row.deleteCell(startIndex);
            row.insertBefore(cell, row.children[endIndex]);
        }
    }

    // row operations
    _rowToDict(row) {
        let dict = {};
        for (let i = 0; i < this._headers.length; i++) {
            dict[this._headers[i]] = row[i];
        }
        return dict;
    }

    addRow(data = undefined) {
        if (data === undefined) {
            data = new Array(this._headers.length).fill(null);
        }else if (data instanceof Array) {

        }else if (data instanceof Object) {
            data = this._headers.map(h => data[h]);
        }
        this._data.push(data);
        let row = this.tbody.insertRow(-1);
        for (let value of data) {
            let cell = row.insertCell(-1);
            cell  .innerHTML = value;
        }
    }

    removeRow(index) {
        this._data.splice(index, 1);
        this.tbody.deleteRow(index);
    }

    moveRow(startIndex, endIndex) {
        let data = this._data.splice(startIndex, 1)[0];
        this._data.splice(endIndex, 0, data);
        let row = this.tbody.deleteRow(startIndex);
        this.tbody.insertBefore(row, this.tbody.children[endIndex]);
    }


    setContent(headers, data) {
        for (let h of headers) {
            this.addColumn(h);
        }
        for (let d of data) {
            this.addRow(d);
        }
    }

    // getters
    get headers() {
        return this._headers;
    }

    // data getters
    get rows() {
        return this._data;
    }

    get data() {
        return this._data.map(this._rowToDict);
    }
}


customElements.define('teeby-deeby', TeebyDeeby);