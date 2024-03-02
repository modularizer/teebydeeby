function isDict(v) {
    return (v !== undefined) && (v instanceof Object) && !(v instanceof Array);
}


class TeebyDeeby extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({mode: 'open'});
        this.shadowRoot.innerHTML = `
            <style>
                tr {
                    border: 1px solid black;
                    border-radius: 10px;
                    border: 1px solid black;
                }
                table {
                    width: 100%;
                }
                thead {
                    background-color: lightblue;
                }
                th, td {
                    border: 1px solid black;
                    padding: 8px;
                    text-align: left;
                }
                tr:nth-child(even) {
                    background-color: #f2f2f2;
                }
                th {
                    background-color: #4CAF50;
                    color: white;
                }
            </style>
            <table>
            </table>
        `;
        this.table = this.shadowRoot.querySelector('table');
        // add headers row
        this.headersRow = this.table.createTHead().insertRow(0);

        // make tbody
        this.tbody = this.table.createTBody();
        this._headers = [];
        this._data = []; // list of lists

        this.onload = this.onload.bind(this);
        this.parse = this.parse.bind(this);
        this.fromDict = this.fromDict.bind(this);
        this.fromHeadersAndDict = this.fromHeadersAndDict.bind(this);
        this.fromHeadersAndListOfDicts = this.fromHeadersAndListOfDicts.bind(this);
        this.fromHeadersAndListOfLists = this.fromHeadersAndListOfLists.bind(this);
        this.fromListOfDicts = this.fromListOfDicts.bind(this);
        this.fromListOfLists = this.fromListOfLists.bind(this);
        this.fromHeaders = this.fromHeaders.bind(this);
        this._rowToDict = this._rowToDict.bind(this);
        this.addColumn = this.addColumn.bind(this);
        this.removeColumn = this.removeColumn.bind(this);
        this.moveColumn = this.moveColumn.bind(this);
        this.addRow = this.addRow.bind(this);
        this.removeRow = this.removeRow.bind(this);
        this.moveRow = this.moveRow.bind(this);
        this.setData = this.setData.bind(this);


        document.addEventListener('DOMContentLoaded', this.onload);
    }
    onload(){
        // get headers and data from attributes
        // expect a string, possibly encoded by btoa
        let headers = this.getAttribute('headers');
        let data = this.getAttribute('data');
        console.log("attributes", headers, data);
        if ((!headers) && (!data)) {
            // get from url search params
            let url = new URL(window.location.href);
            headers = url.searchParams.get('headers');
            data = url.searchParams.get('data');
            console.log("url", headers, data);
        }
        console.log("here", headers, data);
        headers = this.parse(headers);
        data = this.parse(data);

        console.log("setting data", headers, data);
        this.setData(headers, data);
    }

    parse(data){
        if (!data) {
            return []
        }else if (data instanceof Object) {
            return data;
        }

        try{
            data = JSON.parse(data);
        } catch (e) {
            try {
                data = JSON.parse(atob(data));
            } catch (e) {
                data = JSON.parse(LZString.decompressFromEncodedURIComponent(data));
            }
        }
        return data;
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

        // add cell to headers row
        let cell = this.headersRow.insertCell(index);
        cell.innerHTML = headerKey;

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
            console.log("data is object", data);
            data = this._headers.map(h => data[h]);
        }
        this._data.push(data);
        let row = this.tbody.insertRow(-1);
        console.log("adding row", data, row)
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

    // set data
    setData(headers, data) {
        if (!headers && !data) {
            return;
        }
        headers = this.parse(headers);
        data = this.parse(data);
        if (headers) {
            if (isDict(data)) {
                this.fromHeadersAndDict(headers, data);
            }else if (data instanceof Array) {
                if (data.every(x => x instanceof Array)) {
                    this.fromHeadersAndListOfLists(headers, data);
                }else if (data.every(x => x instanceof Object)) {
                    this.fromHeadersAndListOfDicts(headers, data);
                }
            }else{
                throw new Error("Data is not a dict, list of lists or a list of dicts");
            }
        }else{
            if (isDict(data)) {
                this.fromDict(data);
            } else if (data instanceof Array) {
                if (data.every(x => x instanceof Array)) {
                    this.fromListOfLists(data);
                }else if (data.every(x => x instanceof Object)) {
                    this.fromListOfDicts(data);
                }
            }else{
                throw new Error("Data is not a dict, list of lists or a list of dicts");
            }
        }
        return
    }
    fromHeaders(headers) {
        this._setContent(headers, []);
    }
    fromHeadersAndDict(headers, data) {
        this.fromHeadersAndListOfDicts(headers, [data]);
    }
    fromDict(data, mode='horizontal') {
        if (mode === 'horizontal') {
            let headers = Object.keys(data);
            let data = [Array.from(Object.values(data))];
            this._setContent(headers, data);
        }else if (mode === 'vertical') {
            let headers = ["key", "value"];
            let data = Object.entries(data);
            this._setContent(headers, data);
        }
    }
    fromHeadersAndListOfDicts(headers, data) {
        this._setContent(headers, data);
    }
    fromHeadersAndListOfLists(headers, data) {
        this._setContent(headers, data);
    }
    fromListOfDicts(data) {
        let headers = [];
        for (let row of data) {
            for (let key in row) {
                if (!headers.includes(key)) {
                    headers.push(key);
                }
            }
        }
        this._setContent(headers, data);
    }

    fromListOfLists(data) {
        let headers = new Array(data[0].length).fill(null).map((x, i) => `#<${i}>`);
        this._setContent(headers, data);
    }

    _setContent(headers, data) {
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

    get numCols() {
        return this._headers.length;
    }

    get numRows() {
        return this._data.length;
    }

    // data getters
    get data() {
        return this._data.map(this._rowToDict);
    }

    get json() {
        return JSON.stringify(this.data);
    }

    get lz() {
        return LZString.compressToEncodedURIComponent(JSON.stringify(this.data))
    }

    get b64() {
        return btoa(JSON.stringify(this.data));
    }

    get url() {
        let u = new URL(window.location.href);
        u.search = new URLSearchParams({data: this.lz}).toString();
        return u.toString();
    }

}

customElements.define('teeby-deeby', TeebyDeeby);