// aws-config.js
import AWS from 'aws-sdk';

AWS.config.update({
  accessKeyId: '',
  secretAccessKey: '',
  region: 'ca-central-1',
});

export default AWS;
