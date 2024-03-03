window.lz = LZString?LZString.compressToEncodedURIComponent:()=>{console.error('LZString not found. add <script src="https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js"></script> to your html');return ''};
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
