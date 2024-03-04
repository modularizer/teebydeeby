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

        this.sort = this.sort.bind(this);
        this._onTHClick = this._onTHClick.bind(this);
        this._onHeaderEdit = this._onHeaderEdit.bind(this);
        this._onDataEdit = this._onDataEdit.bind(this);
        this._onDataEditInput = this._onDataEditInput.bind(this);
        this._onHeaderEditInput = this._onHeaderEditInput.bind(this);
        this._unsavedHeaderEdits = {};
        this._unsavedDataEdits = {};

        this.fromSRC = this.fromSRC.bind(this);
        this.resizeThead = this.resizeThead.bind(this);
        this.setContent = this.setContent.bind(this);

        this.resizing = 0;

        this._contentEditable = false;
        this._headersEditable = false;

        // for every method in parser which starts with "from", add a method bound to this which calls the parser method then set_content
        for (let method of Object.getOwnPropertyNames(Object.getPrototypeOf(this.parser))) {
            if (method.startsWith('from')) {
                if (!this[method]){
                    console.log("adding", method);
                    this[method] = (function (a, b){
                        console.log("calling", method, a, b);
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
//        this.thead = this.table.createTHead();
//        this.tbody = this.table.createTBody();
//        this.innerHTML = '';
        this.innerHTML = `
            <table>
            </table>
        `;
        this.table = this.querySelector('table');
        this.thead = this.table.createTHead();
        this.tbody = this.table.createTBody();
        this.tfoot = this.table.createTFoot();
    }

    onload(){
        let url = new URL(window.location.href);
        let mode = this.getAttribute('mode') || url.searchParams.get('mode') || 'horizontal';
        let uclass = url.searchParams.get('class');
        this._contentEditable = this.getAttribute('contenteditable') || url.searchParams.get('contenteditable') || false;
        this._headersEditable = this.getAttribute('headerseditable') || url.searchParams.get('headerseditable') || false;
        console.warn("contenteditable", this._contentEditable, this._headersEditable);

        if (uclass){
            for (let cls of uclass.split(" ")){
                this.classList.add(cls.trim());
            }
        }
        this.parser.defaultFromDictMode = mode;

        let t = this.innerHTML.trim()
        this.setupInnerHTML();
        if (t){
            return this.fromString(t);
        }

        // get headers and data from attributes
        // expect a string, possibly encoded by btoa
        let headers = this.getAttribute('headers');
        let data = this.getAttribute('data');
        let markdown = this.getAttribute('md');
        let csv = this.getAttribute('csv');
        let src = this.getAttribute('src');

        if (src){
            return this.fromSRC(src);
        }


        console.log(this, {headers, data, markdown, csv})
        if ((!headers) && (!data)) {
            if (markdown) {
                return this.fromMarkdown(markdown);
            }else if (csv) {
                return this.fromCSV(csv);
            }else{
                // get from url search params

                headers = url.searchParams.get('headers');
                data = url.searchParams.get('data');
                markdown = url.searchParams.get('md');
                csv = url.searchParams.get('csv');
                src= url.searchParams.get('src');
                if (src){
                    return this.fromSRC(src);
                }

                console.log("url", {headers, data, markdown, csv})

                if ((!headers) && (!data)) {
                    console.log("no headers or data");
                    if (markdown) {
                        return this.fromMarkdown(markdown);
                    }else if (csv) {
                        return this.fromCSV(csv);
                    }else{
                        console.log("displaying default")

                        // wait for user to set content
                        return this.fromData(
                            ["fmt", "what", "attribute(s)", "lz okay", "b64 okay"],
                            [
                                ["json", "autodetect", "data", "yes", "yes"],
                                ["url", "path to .json, .md, .csv", "src", "yes", "yes"],
                                ["markdown", "table", "md", "yes", "yes"],
                                ["csv", "table", "csv", "yes", "yes"],
                                ["innerHTML", "table", "N/A", "no", "no"],
                                ["headers + list of lists", "list", "headers", "yes", "yes"],
                                ["list of lists", "row values", "data", "yes", "yes"],
                                ["list of dicts", "row values", "data", "yes", "yes"],
                                ["dict of dicts", "row values", "data", "yes", "yes"],
                                ["dict of lists", "column values", "data", "yes", "yes"],
                                ["dict of values", "single row (if mode = 'horizontal')", "data", "yes", "yes"],
                                ["dict of values", "key/value columns (if mode = 'vertical')", "data", "yes", "yes"],
                            ]
                        )
                    }
                }
                return this.fromData(headers, data);
            }
        }
        return this.fromData(headers, data);
    }

    _onTHClick(e){
        console.log("th click", e);
        let th = e.target;
        // get index of th in parent's children
        let colInd = Array.from(th.parentElement.children).indexOf(th);
        console.log("colInd", colInd);
        if (th.classList.contains('up')){
            this.sort(colInd, 0);
        }else if (th.classList.contains('down')){
            this.sort(colInd, 1);
        }else{
            this.sort(colInd, -1);
        }
    }
    sort(colInd, dir = 1){
        if (typeof colInd === 'string'){
            colInd = this._headers.indexOf(colInd);
        }else if (colInd < 0){
            colInd = this._headers.length + colInd;
        }
        if (dir === "up"){
            dir = 1;
        }
        if (dir === "down"){
            dir = -1;
        }
        if ((dir === "none") || (!dir)){
            dir = 0;
        }
        let th = this.thead.children[colInd];
        let oldDir = parseInt(th.getAttribute('dir') || '0');
        console.log(th, oldDir, dir);
        if (oldDir === dir){
            return
        }


        // change styles
        th.classList.remove('down');
        th.classList.remove('up');
        th.classList.remove('none');
        if (dir === 0){
            th.classList.add('none');
        }else if (dir === 1){
            th.classList.add('up');
        }else if (dir === -1){
            th.classList.add('down');
        }else{
            throw new Error("dir must be 1, 0, or -1");
        }
        th.setAttribute('dir', dir);

        // sort data
        let column = this._data.map((row, i) => {return {value: row[colInd], index: i}});
        if (column.every(x => !isNaN(x.value))){
            column = column.map(x => {return {value: parseFloat(x.value), index: x.index}});
        }
        let sortFunc = (a, b) => {
            let av = a.value;
            let bv = b.value;
            if (av < bv){
                return dir;
            }
            if (av > bv){
                return -dir;
            }
            return 0;
        }
        column.sort(sortFunc);

        // move each row
        let oldRows = Array.from(this.tbody.children);
        let newData = [];
        this.tbody.innerHTML = '';
        for (let row of column){
            newData.push(this._data[row.index]);
            this.tbody.appendChild(oldRows[row.index]);
        }
        this._data = newData;

    }

    _onDataEditInput(rowInd, colInd, value){
        console.log("data edit input", rowInd, colInd, value);
        if (!this._unsavedDataEdits[rowInd]){
            this._unsavedDataEdits[rowInd] = {};
        }
        this._unsavedDataEdits[rowInd][colInd] = value;
        if (this.onDataEditInput){
            this.onDataEditInput(rowInd, colInd, value);
        }
        if (this.addedResize){
            this.resizeThead();
        }
    }
    _onDataEdit(rowInd, colInd, value){
        if (this._unsavedDataEdits[rowInd] && this._unsavedDataEdits[rowInd][colInd]){
            delete this._unsavedDataEdits[rowInd][colInd];
            if (Object.keys(this._unsavedDataEdits[rowInd]).length === 0){
                delete this._unsavedDataEdits[rowInd];
            }
        }
        if (value === this._data[rowInd][colInd]){
            return;
        }
        console.log("data edit", rowInd, colInd, value);
        this._data[rowInd][colInd] = value;
        if (this.onDataEdit){
            this.onDataEdit(rowInd, colInd, value);
        }
    }
    _onHeaderEditInput(colInd, value){
        console.log("header edit input", colInd, value);
        this._unsavedHeaderEdits[colInd] = value;
        if (this.onHeaderEditInput){
            this.onHeaderEditInput(colInd, value);
        }
        if (this.addedResize){
            this.resizeThead();
        }
    }
    _onHeaderEdit(colInd, value){
        delete this._unsavedHeaderEdits[colInd];
        if (value === this._headers[colInd]){
            return;
        }
        console.log("header edit", colInd, value);
        this._headers[colInd] = value;
        if (this.onHeaderEdit){
            this.onHeaderEdit(colInd, value);
        }
    }

    fromSRC(src){
        this.parser.fromSRC(src).then(([h, d]) => this.setContent(h, d));
    }

    // column operations
    addColumn(headerKey = null, index = -1, fillValue = undefined) {

        console.log("adding column contenteditable", this._contentEditable);
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
        if (this._headersEditable){
            th.setAttribute('contenteditable', true);
            th.addEventListener('input', (e) => {
                this._onHeaderEditInput(th.cellIndex, e.target.innerHTML);
            })
            th.addEventListener('blur', (e) => {
                this._onHeaderEdit(th.cellIndex, e.target.innerHTML);
            })
        }
        th.addEventListener('click', this._onTHClick);
        if (index === this._headers.length - 1){
            this.thead.appendChild(th);
        }else{
            this.thead.insertBefore(th, this.thead.children[index]);
        }

        // add empty cell to footer
        let tf = document.createElement('td');
        tf.innerHTML = '';
        if (index === this._headers.length - 1){
            this.tfoot.appendChild(tf);
        }else{
            this.tfoot.insertBefore(tf, this.tfoot.children[index]);
        }


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
            let cell = row.insertCell(index);
            if (this._contentEditable){
                // set attribute to contenteditable
                cell.setAttribute('contenteditable', true);
                cell.addEventListener('input', (e) => {
                    this._onDataEditInput(row.rowIndex, cell.cellIndex, e.target.innerHTML);
                });
                cell.addEventListener('blur', (e) => {
                    this._onDataEdit(row.rowIndex, cell.cellIndex, e.target.innerHTML);
                })
            }
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
            if (this._contentEditable){
                cell.setAttribute('contenteditable', true);
                cell.addEventListener('input', (e) => {
                    this._onDataEditInput(row.rowIndex, cell.cellIndex, e.target.innerHTML);
                });
                cell.addEventListener('blur', (e) => {
                    this._onDataEdit(row.rowIndex, cell.cellIndex, e.target.innerHTML);
                })
            }
            cell.innerHTML = value;
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
        // if table height is greater than window height, add scroll class
        if (this.table.offsetHeight > window.innerHeight) {
            this.classList.add('scroll');
        }
        console.log("set content", this.classList, this.classList.contains('scroll'));
        if (this.classList.contains('scroll')){
            this.resizeThead();
        }
    }

    resizeThead() {
      this.resizing += 1;
      let r = this.resizing;
      // Assuming the first row of tbody represents typical cell widths
      const firstRowCells = Array.from(this.tbody.children[0].children)

      // Get all the header cells
      const headerCells = Array.from(this.thead.children)

      // get the width of the first row, not including the scrollbar
      const tbodyWidth = this.tbody.children[0].offsetWidth;

      // get the width of the header row
      const theadWidth = this.table.offsetWidth;

      const scrollbarWidth = (theadWidth - tbodyWidth)/2;

      console.warn("resize", tbodyWidth, theadWidth)

      console.log("resizing", firstRowCells, headerCells);

      for (let i =0; i < 20; i++){
        if (this.resizing !== r){
          return;
        }

      // First apply widths from tbody cells to thead cells
      firstRowCells.map((cell, index) => {
        if (headerCells[index] !== undefined) {
          const cellWidth = cell.offsetWidth;
          if (index === firstRowCells.length - 1) {
            headerCells[index].style.width = `${cellWidth + scrollbarWidth}px`;
          }else{
            headerCells[index].style.width = `${cellWidth}px`;
          }
        }
      });

      // Then apply widths from thead cells to tbody cells
        headerCells.map((cell, index) => {
            if (firstRowCells[index] !== undefined) {
                const cellWidth = cell.offsetWidth;
                if (index === firstRowCells.length - 1) {
                    firstRowCells[index].style.width = `${cellWidth - scrollbarWidth}px`;
                }else{
                    firstRowCells[index].style.width = `${cellWidth}px`;
                }
            }
        });
      }

      if (!this.addedResize){
          window.addEventListener('resize', this.resizeThead.bind(this));
          this.addedResize = true;
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