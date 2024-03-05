if (!window.teebydeebyimported) {

class TeebyDeeby extends HTMLElement {
    constructor() {
        super();

        this._pageSize = 25;
        this._page = 0;


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
        this.clear = this.clear.bind(this);
        this.rePage = this.rePage.bind(this);
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
                <thead>
                </thead>
                <tbody>
                </tbody>
                <tfoot>
                </tfoot>
                <div class="pagination">
                    <span>Page </span>
                    <input type="number" class="page" value="0" min="0"  max="10000" >
                    <span>/</span>
                    <input type="number" class="numPages" min="0"  max="10000" value="0" disabled>

                    <span>(size</span>
                    <input type="number" class="pageSize" min="0" max="10000" value="50">
                    <span>)</span>

                    <div class="arrows hidden">
                        <button class="prev">prev</button>
                        <button class="next">next</button>
                    </div>
                </div>
                <input type="file" id="file_input" style="display:none;" />
            </table>

        `;
        this.table = this.querySelector('table');
        this.thead = this.querySelector('thead');
        this.tbody = this.querySelector('tbody');
        this.tfoot = this.querySelector('tfoot');
        this.pager = this.querySelector('.pager');

        this.pageInput = this.querySelector('.page');
        this.pageInput.value = this._page;
        this.numPagesInput = this.querySelector('.numPages');
        this.numPagesInput.value = this._numPages;
        this.pageInput.setAttribute('max', this.numPages);
        this.pageSizeInput = this.querySelector('.pageSize');
        this.pageSizeInput.value = this._pageSize;


        this.pageSizeInput.addEventListener('input', (e) => {
            this.pageSize = e.target.value;
        });
        this.pageInput.addEventListener('input', (e) => {
            this.page = e.target.value;
        });

        this.prev = this.querySelector('.prev');
        this.next = this.querySelector('.next');
        if (this.prev){
            this.prev.addEventListener('click', (e) => {
                this.page -= 1;
            });
        }
        if (this.next){
            this.next.addEventListener('click', (e) => {
                this.page += 1;
            });
        }



        this.addEventListener('dragover', (event) => {
          console.log("dragover", event.dataTransfer.items);
          event.preventDefault(); // Necessary to allow the drop
          if (event.dataTransfer.items && event.dataTransfer.items.length > 0 && event.dataTransfer.items[0].kind === 'file') {
            // This indicates that at least one of the dragged items is a file.
            this.classList.add('dragover');
          }
        });
        this.addEventListener('dragleave', (event) => {
          this.classList.remove('dragover');
        });
        this.addEventListener('drop', (event) => {
          event.preventDefault();
          this.classList.remove('dragover');
          if (event.dataTransfer.items && event.dataTransfer.items.length > 0 && event.dataTransfer.items[0].kind === 'file') {
            let file = event.dataTransfer.items[0].getAsFile();
            console.log("file", file);
            let stringContent = '';
            let reader = new FileReader();
            reader.onload = (e) => {
              stringContent = e.target.result;
              console.log("file", file, stringContent);
              this.fromString(stringContent);
            };
            reader.readAsText(file);
          }
        });

    }
    clear(){
        this._headers = [];
        this._data = [];
        this.thead.innerHTML = '';
        this.tbody.innerHTML = '';
        this.tfoot.innerHTML = '';
    }



    onload(){
        let url = new URL(window.location.href);
        let mode = this.getAttribute('mode') || url.searchParams.get('mode') || 'horizontal';
        let uclass = url.searchParams.get('class');
        this._contentEditable = this.getAttribute('contenteditable') || url.searchParams.get('contenteditable') || false;
        this._headersEditable = this.getAttribute('headerseditable') || url.searchParams.get('headerseditable') || false;


        let _pageSize = this.getAttribute('pagesize') || url.searchParams.get('pagesize');
        this._pageSize = parseInt(this.getAttribute('pagesize') || url.searchParams.get('pagesize') || this._pageSize);
        if (this._pageSize instanceof String || typeof this._pageSize === 'string'){
            this._pageSize = parseInt(this._pageSize);
        }
        let _page = this.getAttribute('page') || url.searchParams.get('page');
        this._page = parseInt(_page || this._page);
        if (this._page instanceof String || typeof this._page === 'string'){
            this._page = parseInt(this._page);
        }
        console.warn("page", _page, this.getAttribute('page'), url.searchParams.get('page'), (this.getAttribute('page') || url.searchParams.get('page')));
        if ((_page === null) && (parseInt(_pageSize) > 0)){
            this._page = 1;
        }
        if ((this._page > 0) && (this._pageSize > 0)){
            this.classList.add("pager");
        }
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

    get minRow(){
        return this.page?((this._page - 1) * this._pageSize):0;
    }
    get maxRow(){
        return this.page?(this._page * this._pageSize):this._data.length;
    }

    get pageSize(){
        return this._pageSize;
    }
    get page(){
        return this._page;
    }
    get numPages(){
        return Math.ceil(this._data.length / this._pageSize);
    }
    set page(value){
        value = parseInt(value);
        this._page = value;
        this.pageInput.value = value;
        this.setAttribute('page', value);
        this.rePage();
    }
    set pageSize(value){
        value = parseInt(value);
        this._pageSize = value;
        this.pageSizeInput.value = value;
        this.numPagesInput.value = this.numPages;
        this.setAttribute('pagesize', value);
        this.pageInput.setAttribute('max', this.numPages);
        console.warn("set page size", value, this.numPages);
        this.rePage();
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
        th.classList.add('none');
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

        let rowInd = this._data.length - 1;
        if (this.minRow <= rowInd && rowInd < this.maxRow){
            row.classList.remove('hidden');
        } else {
            row.classList.add('hidden');
        }
        this.numPagesInput.value = this.numPages;
    }

    removeRow(index) {
        this._data.splice(index, 1);
        this.tbody.deleteRow(index);

        if (index < 0) {
            index = this._data.length + index;
        }

        let nextRow = this.tbody.children[index];
        if (nextRow){
            if (this.minRow <= index && index < this.maxRow){
                nextRow.classList.remove('hidden');
            } else {
                nextRow.classList.add('hidden');
            }
        }
    }

    moveRow(startIndex, endIndex) {
        let data = this._data.splice(startIndex, 1)[0];
        this._data.splice(endIndex, 0, data);
        let row = this.tbody.deleteRow(startIndex);
        this.tbody.insertBefore(row, this.tbody.children[endIndex]);
        this.rePage();

    }

    rePage(){
        if ((this._page > 0) && (this._pageSize > 0)){
            this.classList.add("pager");
        }

        // update hidden class on all rows
        for (let i = 0; i < this._data.length; i++){
            let row = this.tbody.children[i];
            if (this.minRow <= i && i < this.maxRow){
                row.classList.remove('hidden');
            } else {
                row.classList.add('hidden');
            }
        }
        if (this.addedResize){
            this.resizeThead();
        }
    }


    setContent(headers, data) {
        this.clear();
        for (let h of headers) {
            this.addColumn(h);
        }
        for (let d of data) {
            this.addRow(d);
        }
        // if table height is greater than window height, add scroll class
        if (this.table.offsetHeight > window.innerHeight) {
            // set pagination to a number which makes the table height less than 90vh
            let h = window.innerHeight * 0.9;
            let top = this.table.getBoundingClientRect().top;
            let maxBottom = top + h;
            let n = 0;
            let row;
            while (true) {
                // get
                n += 1;
                row = this.tbody.children[n];
                if (row.getBoundingClientRect().bottom > maxBottom) {
                    n -= 1;
                    break;
                }
            }
            this.pageSize = Math.max(5, 5 * Math.floor(n / 5));
            if (!this.page){
                this.page = 1;
            }

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

class TbDb extends TeebyDeeby {
    constructor() {
        super();
    }
}
customElements.define('tb-db', TbDb);

window.TeebyDeeby = TeebyDeeby;
window.TbDb = TbDb;


// if this script has any attributes other than src, or if it has innerHTML, convert to teeby-deeby element
// get the script tag this page was loaded from
let script = document.currentScript;
if (script){
    let attrs = Array.from(script.attributes).map(x => x.name).filter(x => x !== 'src');
    if (attrs.length || script.innerHTML.trim()){
        let tbdb = document.createElement('teeby-deeby');
        for (let attr of attrs){
            tbdb.setAttribute(attr, script.getAttribute(attr));
        }
        tbdb.innerHTML = script.innerHTML;

        // if script is in the body, replace it with tbdb
        // if script is in the head, append tbdb to the body and remove innerHTML from script
        let head = document.head || document.getElementsByTagName('head')[0];
        let body = document.body || document.getElementsByTagName('body')[0];
        if (script.parentElement === head){
            body.appendChild(tbdb);
            script.innerHTML = '';
        }else{
            script.replaceWith(tbdb);
        }
    }
}

window.teebydeebyimported = true;
}