#!/bin/bash

echo "Welcome to the Bug Bash 🐞"
echo "Setting up for the bug bash..."

# Install dotenv via NPM instead of yarn so as not to save to package.json 
npm install --no-save --legacy-peer-deps --silent dotenv 
# Revert changes to yarn.lock file
git checkout -- yarn.lock

# Prompt for SDK key
echo
echo "\033[1;38;2;0;55;255mPlease enter your SDK key: \033[0m\c"
read sdk_key

# Check if .env file contains SDK_KEY entry
if grep -q "SDK_KEY" .env; then
  # If it does, replace the existing entry
  sed -i "s/^SDK_KEY=.*/SDK_KEY=$sdk_key/" .env
else
  # If it doesn't, append the new entry
  echo "SDK_KEY=$sdk_key" >> .env
fi

echo
echo "\033[1;38;2;59;224;129mReady\033[0m."
echo "Please run \"npm run bug-bash -- <your-scenario>\" (note the spaces before & after --)"
echo