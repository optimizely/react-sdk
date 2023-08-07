#!/bin/bash

echo "Welcome to the Bug Bash 🐞"

cd bug-bash/app

# Install deps
npm install --silent
# Add dotenv 
npm install --save-dev --silent dotenv
# Add a reference to the local React SDK
npm install --save --silent ../../

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

echo
echo "Please go into bug-bash/app-src and \033[1;38;2;59;224;129mbegin editing App.tsx\033[0m for your testing scenarios."
echo
echo "Press enter to start the local Bug Bash server. You'll need to leave this terminal active."
read _discard

npm run dev
