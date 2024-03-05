#!/usr/bin/env bash

# Combine and minify CSS
npx postcss css/*.css -o teebydeeby.min.css --use cssnano


# Combine and minify JS
uglifyjs js/loadcss.js js/celltype.js js/InputParser.js js/OutputParser.js js/teebydeeby.js -o tbdb.js

# Preprocess CSS content to make it safe for sed replacement
CSS_CONTENT=$(awk '{printf "%s\\n", $0}' teebydeeby.min.css | sed -e 's/[\/&]/\\&/g')

# Replace '%CSS%' in JS with CSS content
sed -i'' -e "/%CSS%/{
    s|%CSS%||g
    r /dev/stdin
}" tbdb.js <<<"$CSS_CONTENT"

# Optional cleanup
rm teebydeeby.min.css
