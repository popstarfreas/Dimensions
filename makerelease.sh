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
cp dimensions_cli.js release/dimensions_cli.js
cp License.md release/License.md
cp README.md release/README.md
cd release
name="Dimensions.zip"
package=$(cat package.json)
regex="\"version\": \"(([0-9]+\.?){3})"
if [[ $package =~ $regex ]]
then
    version="${BASH_REMATCH[1]}"
    name="Dimensions-v$version.zip" 
fi
zip -r "$name" ./
cd ../
mv "release/$name" "./$name"
rm -rf release