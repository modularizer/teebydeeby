class InputParser {
    constructor(defaultFromDictMode = 'horizontal') {
        this.parse = this.parse.bind(this);
        this.testString = this.testString.bind(this);
        this.parseString = this.parseString.bind(this);
        this.isDict = this.isDict.bind(this);

        this.defaultFromDictMode = defaultFromDictMode;

        // general from methods
        this.fromData = this.fromData.bind(this);
        this.fromString = this.fromString.bind(this);
        this.fromSRC = this.fromSRC.bind(this);

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

    isDict(v) {
        return (v !== undefined) && (v instanceof Object) && !(v instanceof Array);
    }

    parse(data){
        if (!data) {
            return []
        }else if (data instanceof Object) {
            return data;
        }
        if (typeof data === 'string') {
            if ((data.startsWith('[') && data.endsWith(']')) || (data.startsWith('{') && data.endsWith('}'))) {
                return JSON.parse(data);
            }else {
                return data.split(",").map(x => x.trim());
            }
        }
     }

    testString(data){
       // check if data contains at least one character of , | [ ] { }, or /
         return /,|\||\n|\[|\]|\{|\}|\//.test(data);
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

    fromSRC(src) {
        src = this.parseString(src);
        return fetch(src).then(r => r.text()).then(t => this.fromString(t));
    }
    fromData(headers, data) {
        if (!headers && !data) {
            return [[], []]
        }
        headers = this.parse(headers);
        data = this.parse(data);
        console.log("setData", headers, data);
        if (headers && headers.length > 0) {
            if (this.isDict(data)) {
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
            if (this.isDict(data)) {
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
    fromDict(data, mode) {
        mode = mode || this.defaultFromDictMode;
        data = this.parse(data);
        let values = Array.from(Object.values(data));
        if (values.every(x => x instanceof Array)) {
            let headers = Array.from(Object.keys(data));
            let i = 0;
            let numRows = data[headers[0]].length;
            if (!values.every(x => x.length === numRows)) {
                throw new Error('Number of rows in data does not match number of rows in headers');
            }
            let newdata = [];
            for (i = 0; i < numRows; i++) {
                let row = [];
                for (let header of headers) {
                    row.push(data[header][i]);
                }
                newdata.push(row);
            }
            return this.fromHeadersAndListOfLists(headers, newdata);
        }else if (values.every(this.isDict)){
            let keyIsValueInEveryDict = true;
            for (let [k, v] of Object.entries(data)){
                if (!Object.keys(v).includes(k)){
                    return false;
                }
            }
            if (keyIsValueInEveryDict){
                return this.fromListOfDicts(values);
            }
            let headers = [];
            for (let row of values) {
                for (let key in row) {
                    if (!headers.includes(key)) {
                        headers.push(key);
                    }
                }
            }
            let keyNameChoices = ["name", "id", "key", "pk"]
            // get first keyNameChoice not in headers
            let keyName = keyNameChoices.find(x => !headers.includes(x));
            let newValues = [];
            for (let [k, v] of Object.entries(data)){
                v[keyName] = k;
                newValues.push(v);
            }
            return this.fromListOfDicts(newValues);
        }

        if (mode === 'horizontal') {
            console.log("from dict (horizontal)", data);
            let headers = Object.keys(data);
            data = [Array.from(Object.values(data))];
            return [headers, data]
        }else if (mode === 'vertical') {
            console.log("from dict (vertical)", data);
            let headers = ["key", "value"];
            data = Object.entries(data);
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