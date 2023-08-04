#!/bin/bash

echo "Welcome to the Bug Bash 🐞"
echo "Setting up for the bug bash..."

# Prompt for SDK key
read -p "Please enter your SDK key: " sdk_key

# Create .env file or append to existing one
echo "SDK_KEY=$sdk_key" >> .env