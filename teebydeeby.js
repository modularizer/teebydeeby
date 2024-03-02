function isDict(v) {
    return (v !== undefined) && (v instanceof Object) && !(v instanceof Array);
}


class InputParser {
    constructor() {
        this.parse = this.parse.bind(this);
        this.testString = this.testString.bind(this);
        this.parseString = this.parseString.bind(this);

        // general from methods
        this.fromData = this.fromData.bind(this);
        this.fromString = this.fromString.bind(this);

        // specific from methods
        this.fromJSON = this.fromJSON.bind(this);
        this.fromCSV = this.fromCSV.bind(this);
        this.fromMarkdown = this.fromMarkdown.bind(this);
        this.fromDict = this.fromDict.bind(this);
        this.fromHeadersAndDict = this.fromHeadersAndDict.bind(this);
        this.fromHeadersAndListOfDicts = this.fromHeadersAndListOfDicts.bind(this);
        this.fromHeadersAndListOfLists = this.fromHeadersAndListOfLists.bind(this);
        this.fromListOfDicts = this.fromListOfDicts.bind(this);
        this.fromListOfLists = this.fromListOfLists.bind(this);
        this.fromHeaders = this.fromHeaders.bind(this);
    }

    parse(data){
        if (!data) {
            return []
        }else if (data instanceof Object) {
            return data;
        }
        return JSON.parse(this.parseString(data));
     }

    testString(data){
       // check if data contains at least one character of , | [ ] { }
         return /,|\||\n|\[|\]|\{|\}/.test(data);
    }

    parseString(data){
        data = data.trim();
        if (!data) {
            return ""
        }
        // validate string contains at least one character of , | \n, [, ], {, }
        // if not, assume it is encoded
        if (!this.testString(data)) {
            let newdata;
            try {
                newdata = LZString.decompressFromEncodedURIComponent(data);
                if (this.testString(newdata)) {
                    return newdata;
                }
            } catch (e) {
            }
            try {
                newdata = atob(data);
                if (this.testString(newdata)) {
                    return newdata;
                }
            } catch (e) {
                throw new Error("unable to interpret string")
            }
        }
        data = data.trim();
        return data;
    }

    // from methods
    // set data
    fromData(headers, data) {
        if (!headers && !data) {
            return;
        }
        headers = this.parse(headers);
        data = this.parse(data);
        console.log("setData", headers, data);
        if (headers && headers.length > 0) {
            if (isDict(data)) {
                return this.fromHeadersAndDict(headers, data);
            }else if (data instanceof Array) {
                if (data.every(x => x instanceof Array)) {
                    return this.fromHeadersAndListOfLists(headers, data);
                }else if (data.every(x => x instanceof Object)) {
                    return this.fromHeadersAndListOfDicts(headers, data);
                }
            }else{
                throw new Error("Data is not a dict, list of lists or a list of dicts");
            }
        }else{
            if (isDict(data)) {
                return this.fromDict(data);
            } else if (data instanceof Array) {
                if (data.every(x => x instanceof Array)) {
                    return this.fromListOfLists(data);
                }else if (data.every(x => x instanceof Object)) {
                    return this.fromListOfDicts(data);
                }
            }else{
                throw new Error("Data is not a dict, list of lists or a list of dicts");
            }
        }
        return [headers, data];
    }

    fromString(data) {
        data = this.parseString(data);
        console.log("fromString", data)
        if (this.testString(data)) {
            if ((data.startsWith('[') && data.endsWith(']')) || (data.startsWith('{') && data.endsWith('}'))) {
                return this.fromJSON(data);
            }else if (data.startsWith("|") && data.endsWith("|")) {
                return this.fromMarkdown(data);
            } else if (data.startsWith("<") && data.endsWith(">")) {
                return this.fromHTML(data);
            }else {
                return this.fromCSV(data);
            }
        }else{
            throw new Error("unable to interpret string")
        }
    }

    fromJSON(json) {
        return this.fromData(undefined, json);
    }

    fromCSV(csv) {
        csv = this.parseString(csv);
        console.log("from csv", csv);
        let rows = csv.split('\n'); // Split by new line to get rows
        console.log("rows", rows)
        rows = rows.filter(row => row.trim()); // Remove empty rows
        rows = rows.map(row => {
            // Split row by comma not enclosed in quotes
            const cells = row.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);

            return cells.map(cell => {
                // Remove leading/trailing spaces and enclosing double quotes
                return cell.trim().replace(/^"|"$/g, '');
            });
        });
        let headers = rows[0];
        let data = rows.slice(1);
        let numCols = headers.length;
        if (!data.every(row => row.length === numCols)) {
            throw new Error('Number of columns in data does not match number of columns in headers');
        }
        return this.fromHeadersAndListOfLists(headers, data);
    }

    fromMarkdown(md) {
        md = this.parseString(md);
        console.log("from markdown", md)
        // Split by new line to get rows, trim each row to remove leading/trailing spaces
        let rows = md.trim().split('\n').map(row => row.trim());

        // Filter out the row that separates headers from data
        rows = rows.filter((row, index) => index !== 1);

        // Parse each row, accounting for escaped pipes
        let parsedRows = rows.map(row => {
            // First, temporarily replace escaped pipes with a placeholder
            row = row.replace(/\\\|/g, '\0');
            // Split row by pipe not at the start or end of the string
            let cells = row.split('|').map(cell => cell.trim()); // Trim cells to remove leading/trailing spaces
            // Restore escaped pipes from placeholder and remove leading/trailing quotes if any
            cells = cells.map(cell => cell.replace(/\0/g, '|').trim());
            // Filter out empty strings that occur due to split at start or end of the string
            return cells.filter(cell => cell);
        });

        // Separate headers from data
        let headers = parsedRows[0];
        let data = parsedRows.slice(1);
        let numCols = headers.length;

        if (!data.every(row => row.length === numCols)) {
            throw new Error('Number of columns in data does not match number of columns in headers');
        }

        // Use your method to handle headers and data
        return this.fromHeadersAndListOfLists(headers, data);
    }

    fromHTML(html) {
        // support for html tables
        // allow <table> tags or if not present, assume the content goes into the <table> tag
        // parse to html and then extract headers and data
        if (!html.startsWith('<table>')) {
            html = `<table>${html}</table>`;
        }
        console.log("from html", html);

        let parser = new DOMParser();
        let doc = parser.parseFromString(html, 'text/html');
        let table = doc.querySelector('table');

        const tableData = [];

        // Function to parse rows of a table section (thead, tbody, tfoot)
        const parseSection = (section) => {
            section.querySelectorAll('tr').forEach(row => {
                const rowData = [];
                row.querySelectorAll('th, td').forEach(cell => {
                    rowData.push(cell.textContent || cell.innerText);
                });
                tableData.push(rowData);
            });
        };

        // Parse <thead>, <tbody>, and <tfoot> sections if they exist
        const sections = table.querySelectorAll('thead, tbody, tfoot');
        if(sections.length) {
            // Parse each section found
            sections.forEach(section => parseSection(section));
        } else {
            // If no specific sections found, parse the table as a whole
            parseSection(table);
        }
        let headers = tableData[0];
        let data = tableData.slice(1);
        return this.fromHeadersAndListOfLists(headers, data);

    }
    fromHeaders(headers) {
        headers = this.parse(headers);
        console.log("from headers", headers);
        return [headers, []]
    }
    fromHeadersAndDict(headers, data) {
        headers = this.parse(headers);
        data = this.parse(data);
        console.log("from headers and dict", headers, data);
        return this.fromHeadersAndListOfDicts(headers, [data]);
    }
    fromDict(data, mode='horizontal') {
        data = this.parse(data);
        if (mode === 'horizontal') {
            console.log("from dict (horizontal)", data);
            let headers = Object.keys(data);
            let data = [Array.from(Object.values(data))];
            return [headers, data]
        }else if (mode === 'vertical') {
            console.log("from dict (vertical)", data);
            let headers = ["key", "value"];
            let data = Object.entries(data);
            return [headers, data]
        }
    }
    fromHeadersAndListOfDicts(headers, data) {
        data = this.parse(data);
        console.log("from headers and list of dicts", headers, data);
        return [headers, data]
    }
    fromHeadersAndListOfLists(headers, data) {
        data = this.parse(data);
        console.log("from headers and list of lists", headers, data);
        return [headers, data]
    }
    fromListOfDicts(data) {
        data = this.parse(data);
        console.log("from list of dicts", data);
        let headers = [];
        for (let row of data) {
            for (let key in row) {
                if (!headers.includes(key)) {
                    headers.push(key);
                }
            }
        }
        return [headers, data]
    }

    fromListOfLists(data) {
        data = this.parse(data);
        console.log("from list of lists", data);
        let headers = new Array(data[0].length).fill(null).map((x, i) => `#<${i}>`);
        return [headers, data]
    }


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
        this.headersRow = this.table.createTHead();

        // make tbody
        this.tbody = this.table.createTBody();
        this._headers = [];
        this._data = []; // list of lists

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
        this.setContent = this.setContent.bind(this);

        // for every method in parser which starts with "from", add a method bound to this which calls the parser method then set_content
        for (let method of Object.getOwnPropertyNames(Object.getPrototypeOf(this.parser))) {
            if (method.startsWith('from')) {
                this[method] = (function (a, b){
                    let [h, d] = this.parser[method](a, b);
                    this.setContent(h, d);
                }).bind(this);
            }
        }

        document.addEventListener('DOMContentLoaded', this.onload);
    }

    onload(){
        if (this.innerHTML.trim()){
            let t = this.innerHTML;
            this.innerHTML = '';
            this.fromString(t);
            return
        }

        // get headers and data from attributes
        // expect a string, possibly encoded by btoa
        let headers = this.getAttribute('headers');
        let data = this.getAttribute('data');
        let markdown = this.getAttribute('md');
        let csv = this.getAttribute('csv');


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

                if ((!headers) && (!data)) {
                    if (markdown) {
                        this.fromMarkdown(markdown);
                    }else if (csv) {
                        this.fromCSV(csv);
                    }else{
                        throw new Error("No data provided");
                    }
                }
            }
            return
        }
        this.fromData(headers, data);
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


class OutputParser {
    constructor(tbdb){
        this.tbdb = tbdb;
        this.getColumn = this.getColumn.bind(this);

    }

    getColumn(which){
        for (let [i, h] of this.headers.entries()) {
            if (h === which) {
                return this.rows.map(row => row[i]);
            }
        }
        for (let [i, h] of this.headers.entries()) {
            if (h === i) {
                return this.tbdb.rows.map(row => row[i]);
            }
        }
    }

    get headers() {
        return this.tbdb.headers;
    }

    get data() {
        return this.tbdb.data;
    }

    get rows(){
        return this.tbdb.rows;
    }

    get columnData() {
        let d = {}
        for (let [i, h] of this.headers.entries()) {
            d[h] = this.rows.map(row => row[i]);
        }
        return d
    }

    // more getters

    get json() {
        return JSON.stringify(this.data);
    }

    get lzdata() {
        return LZString.compressToEncodedURIComponent(JSON.stringify(this.data))
    }

    get b64data() {
        return btoa(JSON.stringify(this.data));
    }

    get url() {
        let u = new URL(window.location.href);
        u.search = new URLSearchParams({data: this.lzdata}).toString();
        return u.toString();
    }

    get csv() {
        // make sure to quote any content which contains a comma
        let r;
        let csv = '';
        let rows = [this.headers, ...this.rows];

        for (let row of rows) {
            r = row.map(x => x.includes(',') ? `"${x}"` : x);
            csv += r.join(',') + '\n';
        }
        return csv;
    }

    get lzcsv() {
        return LZString.compressToEncodedURIComponent(this.csv);
    }

    get b64csv() {
        return btoa(this.csv);
    }

    get md(){
        // make sure to escape any pipes
        let r;
        let md = '';
        let rows = [this.headers, ...this.rows];
        for (let row of rows) {
            r = row.map(x => x.includes('|') ? x.replace(/\|/g, '\\|') : x);
            md += '|' + r.join('|') + '|\n';
        }
        return md;
    }

    get lzmd() {
        return LZString.compressToEncodedURIComponent(this.md);
    }

    get b64md() {
        return btoa(this.md);
    }
}

customElements.define('teeby-deeby', TeebyDeeby);