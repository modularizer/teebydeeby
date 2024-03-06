#!/usr/bin/env bash
# Install PostCSS and cssnano globally
npm install -g postcss-cli cssnano

# Install UglifyJS globally
npm install -g uglify-js

# get fullpath to min.sh
SCRIPT=$(readlink -f "$0")
DIR=$(dirname "$SCRIPT")
MINSH="$DIR/min.sh"

# add a pre-commit hook which calls min.sh with no arguments
# get the version of bash executing this script
echo "$MINSH" > .git/hooks/pre-commit