#!/bin/bash

echo "Welcome to the Bug Bash 🐞"

# Install via NPM instead of yarn so as not to save to package.json 
npm install --no-save --legacy-peer-deps --silent dotenv 
# Revert changes to yarn.lock file
git checkout -- yarn.lock

# Prompt for SDK key
echo
echo "\033[1;38;2;0;55;255mPlease enter your SDK key: \033[0m\c"
read sdk_key

# Check if .env file exists and contains SDK_KEY entry
if [ -f .env ] && grep -q "SDK_KEY" .env; then
  # If it does, replace the existing entry
  sed -i "s/^SDK_KEY=.*/SDK_KEY=$sdk_key/" .env
else
  # If it doesn't, create the file and append the new entry
  echo "SDK_KEY=$sdk_key" > .env
fi

cd bug-bash/app
npm install --silent

echo
echo "Please go into bug-bash/app-src and \033[1;38;2;59;224;129mbegin editing App.tsx\033[0m for your testing scenarios."
echo
echo "Press enter to start the local Bug Bash server. You'll need to leave this terminal active."
read _discard

npm run dev
