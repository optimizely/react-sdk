// eslint-disable-next-line @typescript-eslint/no-var-requires
const dotenv = require('dotenv');

dotenv.config();

const scenario = process.argv[2];
const sdkKey = process.env.SDK_KEY;

console.log('SDK Key: ', sdkKey);

switch (scenario) {
  case 'scenario1':
    console.log('Running setup for scenario 1...');
    // Code to set up scenario 1
    break;
  case 'scenario2':
    console.log('Running setup for scenario 2...');
    // Code to set up scenario 2
    break;
  // etc.
  default:
    console.error(`Unknown scenario: ${scenario}`);
    process.exit(1);
}
