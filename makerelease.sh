#!/bin/bash
rm -rf release
npm run build
rm -rf build/spec
mkdir release
cp -r build release/build
cp package.json release/package.json
cp package-lock.json release/package-lock.json
cp config.js.example release/config.js.example
mkdir release/logs
cp interface.js release/interface.js
cp dimensions_cli.js release/dimensions_cli.js
cp -r lib release/lib
cp License.md release/License.md
cp README.md release/README.md
package=$(cat package.json)
regex="\"version\": \"(([0-9]+\.?){3})"
if [[ $package =~ $regex ]]
then
    version="${BASH_REMATCH[1]}"
    zip -r "Dimensions-v$version.zip" ./
else
    zip -r Dimensions.zip ./
fi
rm -rf release