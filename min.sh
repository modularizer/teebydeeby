#!/usr/bin/env bash

# Combine and minify CSS
npx postcss css/*.css -o teebydeeby.min.css --use cssnano


# Combine and minify JS
cat js/*.js | uglifyjs -o teebydeeby.min.js

# Preprocess CSS content to make it safe for sed replacement
CSS_CONTENT=$(awk '{printf "%s\\n", $0}' teebydeeby.min.css | sed -e 's/[\/&]/\\&/g')

# Replace '%CSS%' in JS with CSS content
sed -i'' -e "/%CSS%/{
    s|%CSS%||g
    r /dev/stdin
}" teebydeeby.min.js <<<"$CSS_CONTENT"

# Optional cleanup
rm teebydeeby.min.css
