const express = require('express');
const { exec } = require('child_process');
const app = express();
const port = 9000;

const DEPLOY_TOKEN = process.env.DEPLOY_TOKEN || 'secret_token_123';

app.use(express.json());

app.post('/deploy', (req, res) => {
    const token = req.headers['authorization'];
    
    if (token !== `Bearer ${DEPLOY_TOKEN}`) {
        return res.status(401).send('Unauthorized');
    }

    console.log('Deployment triggered...');

    // We run the update script
    // Since we are in a container, we need to communicate with the host 
    // or we mount the repo and docker socket.
    exec('cd /app/repo && git pull && docker compose up -d --build', (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return res.status(500).send('Deploy failed');
        }
        console.log(`stdout: ${stdout}`);
        console.error(`stderr: ${stderr}`);
    });

    res.send('Deployment started');
});

app.listen(port, () => {
    console.log(`Deployer listening at http://0.0.0.0:${port}`);
});
