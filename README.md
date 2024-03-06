# TeebyDeeby
A front-end renderer of many different sources of tabular data.

### Weird Name?
Tabular Database ... TeebyDeeby ... TbdB ... Teeby ... Tb

## Usage

### iframe / URL usage
1. iframe referencing a data source (.json, .csv, .md)

    https://modularizer.github.io/teebydeeby/?src=https://data.cityofnewyork.us/resource/uvxr-2jwn.json
    ```html
    <iframe src="https://modularizer.github.io/teebydeeby/?src=https://data.cityofnewyork.us/resource/uvxr-2jwn.json"></iframe>
    ```
2. iframe with data as an attribute
    ```html
    <iframe src="https://modularizer.github.io/teebydeeby/?headers=a,b,c&data=[[1,2,3],[4,5,6],[7,8,9]]"></iframe>
    ```

### HTML usage
1. import and use all in one
    ```html
    <script src="https://modularizer.github.io/teebydeeby/tbdb.js">[
        {"name": "Fred", "age": 23, "height": "5'10\""},
        {"name": "Sally", "age": 25, "height": "5'6\""},
        {"name": "Bob", "age": 27, "height": "6'0\""}
    ]</script>
    ```
1. data as innerHTML
    ```html
    <teeby-deeby headers="a,b,c">[[1,2,3],[4,5,6],[7,8,9]]</teeby-deeby>
    ```
2... And many more ways to pass in data! (see below)


## Development Plan
- [x] single minified distribution file
  - NOTE: does not iclude lz-string, so you'll need to include that in your project if you want to use lz compressed strings
- [x] Render tables from a variety of pre-loaded data sources
  - [x] JSON (many formats)
  - [x] CSV
  - [x] Markdown
  - [x] HTML
  - [ ] Excel
  - [ ] Google Sheets
  - [ ] YAML
- [x] Multiple ways to pass in data
  - [x] attributes
  - [x] innerHTML
  - [x] url
  - [x] lz compressed string 
    * NOTE: requires `lz-string` package from `<script src="https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js"></script>`
  - [x] base64 encoded string
  - [x] drag and drop file upload
  - [x] use script tag as teeby-deeby element
  - [ ] copy and paste
- [x] Add styling options
  - [x] width
  - [x] height
  - [x] padding
  - [x] radius
  - [x] gap
  - [x] colors
  - [x] scroll
- [ ] Front-end rendering features
  - [x] pagination
  - [ ] filtering
  - [x] sorting
  - [ ] searching
  - [ ] hiding columns
  - [ ] drag/drop reordering rows
  - [ ] drag/drop reordering columns
  - [x] data types
    - [ ] per column data types
    - [x] autodetected data types
    - [x] int
    - [x] float
    - [x] image
    - [x] date
    - [x] time
    - [x] datetime
    - [x] currency
    - [x] percent
    - [x] boolean
    - [x] string
- [ ] Editing
  - [x] contenteditable
  - [x] headereditable
  - [x] callback slots
  - [ ] undo/redo
  - [ ] common web requests on update
- [ ] SQL
  - [ ] simple select queries
  - [ ] load schema
  - [ ] query builder (using sort, filter, etc.)
  - [ ] query editor
  - [ ] SQL on update
- [ ] Caching
  - [ ] cache style preferences
  - [ ] cache table settings
    - [ ] column order
    - [ ] column visibility
    - [ ] column width
    - [ ] pagination

## Contributing
Please! I probably don't have time to see this project through, so it you want to work on it, reach out!
modularizer@gmail.com

* install node and npm
  * https://docs.npmjs.com/downloading-and-installing-node-js-and-npm
* run `install.sh` to install the necessary packages and setup pre-commit hooks

## Features
## Parameter Specifications
### location
1. parameters can be passed in as attributes on the html tag
2. parameters can be passed in as search parameters in the url

### format
1. `JSON`
2. `lz` - any parameter can be passed in as a lz encoded string (from `lz-string` package `LZString.compressToEncodedURIComponent`)
3. `base64` - any parameter can be passed in as a base64 encoded string (from `btoa`)

## Data Sources 
#### Attributes
* `data` - the data to be rendered
  * `list of lists` - a list of lists of row values
  * `list of dicts` - a list of dictionaries of row values
  * `dict of dicts` - a dictionary of dictionaries of row values
  * `dict of lists` - a dictionary of lists of column values
  * `dict` - a dictionary of values
    * if `mode` is `horizontal` then the keys are the headers and there is one row
    * if `mode` is `vertical` then there are two columns, one for the keys and one for the values
* `headers` - the headers of the data (if data is a `list of lists` and headers can't be inferred from the data)
* `md` - render from a markdown table string
* `csv` - render from csv string
* `src` - the source of the data
  * .json
  * .csv
  * .md

#### Alternate Data Source
innerHTML of a `<table>` tag nested in the `<teeby-deeby>` tag will be used as the data source

## Settings Attributes
* `mode` - if the data is a dictionary, then it can be `horizontal` or `vertical`
* `contenteditable` - whether data can be edited
* `headereditable` - whether headers can be edited
* `page` - the page number to start on
* `pagesize` - the number of rows to show per page

## Styles

#### CSS Classes
##### width
* `wide`
* `w80`
* `half`
* `third`
* `quarter`

##### height
* `scroll` - adds a scrollbar to the table body without scrolling the header
    * NOTE: this messes with some built-in styles and makes it so the headers don't auto-size to the body. This needs some work to look better, but the functionality is worth it not looking quite as nice
* `h50`

#### padding
* `p16`
* `p12`
* `p8`
* `p4`
* `p2`

#### radius
* `round`
* `soft`
* `square`

#### gap
* `zero`
* `nogap`
* `gap1`
* `gap2`

#### colors
* `dark`
* `blue`
* `green`
* `red`
* `yellow`
* `purple`
* `orange`
* `rainbow`
* `dblue`
* `dgreen`


