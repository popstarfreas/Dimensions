#!/usr/bin/env bash
set -e

rm -rf release
rm -rf build/spec
mkdir release
cp -r build release/build
cp package.json release/package.json
cp pnpm-lock.yaml release/pnpm-lock.yaml
mkdir release/configuration
cp config.yaml.example release/configuration/config.yaml.example
cd release/build
mkdir -p node_modules
cd node_modules
ln -s ../dimensions dimensions
cd ../../../
mkdir release/logs
cp dimensions_cli.js release/dimensions_cli.js
cp License.md release/License.md
cp README.md release/README.md
name="Dimensions.zip"
package=$(cat package.json)
regex="\"version\": \"(([0-9]+\.?){3})"
if [[ $package =~ $regex ]]; then
    version="${BASH_REMATCH[1]}"
    name="Dimensions-v$version.zip"
fi
mv release Dimensions
zip --symlinks -r "$name" Dimensions
rm -rf Dimensions
