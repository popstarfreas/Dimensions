#!/usr/bin/env bash
set -e

rm -rf release
rm -rf build/spec
mkdir release
cp -r build release/build
cp package.json release/package.json
cp pnpm-lock.yaml release/pnpm-lock.yaml
mkdir release/native-addon
cp native-addon/binding.gyp release/native-addon/binding.gyp
cp native-addon/tcp_rtt.cc release/native-addon/tcp_rtt.cc
if [ -d native-addon/prebuilds ]; then
  cp -r native-addon/prebuilds release/native-addon/prebuilds
fi
if [ -d native-addon/build/Release ]; then
  mkdir -p release/native-addon/build
  cp -r native-addon/build/Release release/native-addon/build/Release
fi
mkdir release/configuration
cp configuration/config.yaml.example release/configuration/config.yaml.example
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
version=$(jq -r '.version' package.json)
name="Dimensions-v$version.zip"
mv release Dimensions
zip --symlinks -r "$name" Dimensions
rm -rf Dimensions
