// import       ========================================>
const express = require('express');
const app = express();

const mongoose = require('mongoose');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const cors = require('cors');

const logger = require('./config/logger');

const port = process.env.PORT || 8080;

const exec = require('child_process').exec;
const path = require('path');
const fs = require('fs');

const util = require("util");
const promiseFS = { stat: util.promisify(fs.stat), 
                    unlink: util.promisify(fs.unlink), 
                    readFile: util.promisify(fs.readFile), 
                    writeFile: util.promisify(fs.writeFile) };
const os = require('os');
const spawn = require('child_process').spawn;
//db conn       ========================================>
if (mongoose.connect('mongodb://localhost:27017/phoenixdb', { useNewUrlParser: true })) {
    logger.info("Db connected")
}

app.use(express.static(__dirname + '/public'));
app.use(cors());
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({ 'extended': 'true' }));
app.use(bodyParser.json());
app.use(bodyParser.json({ type: 'application/vnd.api+json' }));
app.use(methodOverride());

//utility       ========================================>
const aws_phoenixFile_location = "/home/ubuntu/instance_creation";
const azure_phoenixFile_location = "/home/ubuntu/instance_creation_azure";
const gcp_phoenixFile_location = "/home/ubuntu/instance_creation_gcp";
const file_name = "phoenixFile";
const phoenixFile_path = '/home/ubuntu' + path.sep + file_name;

//method to trigger shell command
async function shellFileLocation(cloud, action) {
    try {
        let shellScriptFile = "";
        if (cloud == "aws") {
            if (action == "initiate") {
                shellScriptFile = "sh /home/ubuntu/instance_creation/initiate.sh";
            }
            else {
                shellScriptFile = "sh /home/ubuntu/instance_creation/destroy.sh";
            }
        }
        if (cloud == "azure") {
            if (action == "initiate") {
                shellScriptFile = "sh /home/ubuntu/instance_creation_azure/initiate.sh";
            }
            else {
                shellScriptFile = "sh /home/ubuntu/instance_creation_azure/destroy.sh";
            }
        }
        if (cloud == "gcp") {
            if (action == "initiate") {
                shellScriptFile = "sh /home/ubuntu/instance_creation_gcp/initiate.sh";
            }
            else {
                shellScriptFile = "sh /home/ubuntu/instance_creation_gcp/destroy.sh";
            }
        }
        return shellScriptFile;
    } catch (ex) {
        logger.error("shellFileLocation()-Exception: " + ex);
    }
}
/*exec method
function initiateShellCommand(file_path) {
    exec(file_path, { maxBuffer: 1024 * 10000 }, (err, stdout, stderr) => {
        if (err instanceof Error) {
            console.log("initiateShellCommand()-Error", err);
        }
        console.log("initiateShellCommand()-shell command is being executed");
        console.log(stdout);
        console.log(stderr);
    });
}*/
//spawn method
function initiateShellCommand(file_path) {
    logger.info("initiateShellCommand()-Shell command being executed");
    let child = spawn(file_path, {
        shell: true
    });

    child.stderr.on('data', function (data) {
        logger.error("STDERR: " + data.toString());
    });

    child.stdout.on('data', function (data) {
        logger.info("STDOUT: " + data.toString());
    });

    child.on('exit', function (exitCode) {
        logger.info("Child process exited with errorCode: " + exitCode);
    });
}

function destroyShellCommand(file_path) {
    logger.info("destroyShellCommand()-Shell command being executed");
    let child = spawn(file_path, {
        shell: true
    });
    child.stderr.on('data', function (data) {
        logger.error("STDERR: " + data.toString());
    });

    child.stdout.on('data', function (data) {
        logger.info("STDOUT: " + data.toString());
    });

    child.on('exit', function (exitCode) {
        logger.info("Child process exited with errorCode: " + exitCode);
    });
}
/*
function destroyShellCommand(file_path) {
    exec(file_path, { maxBuffer: 1024 * 10000 }, (err, stdout, stderr) => {
        if (err instanceof Error) {
            console.log("destroyShellCommand()-Error: ", err);
        }
        console.log("destroyShellCommand()-shell command is being executed");
        console.log(stdout);
        console.log(stderr);
    })
}
*/
//method to deal with file system
async function phoenixCheckFile(fileLocation) {
    try {
        //let promiseFS = util.promisify(fs.stat);
        let fileExistsFlag = await promiseFS.stat(fileLocation);
        return true;
    }
    catch (ex) {
        logger.error("phoenixCheckFile()-Exception: " + ex);
        return false;
    }

}

async function phoenixReadAndCreateFile(phoenix_file_path, formData) {
    try {
        var file_path = __dirname + path.sep + 'template.txt';
        // var phoenix_file_path = aws_phoenixFile_location + path.sep + file_name;
        let fileCheck = await phoenixCheckFile(file_path);
        logger.info("phoenixReadAndCreateFile()-File Check: " + fileCheck);
        if (fileCheck) {
            let content = await promiseFS.readFile(file_path, 'utf8');
            content = content.replace('<giturl>', formData["giturl"]);
            content = content.replace('<cloud>', formData["cloud"]);
            content = content.replace('<appserver>', formData["appserver"]);
            content = content.replace('<email>', formData["email"]);

            content = content.replace('<1.0.0.0>', formData["ip1"]);
            content = content.replace('<2.0.0.0>', formData["ip2"]);
            content = content.replace('<3.0.0.0>', formData["ip3"]);
            
            await promiseFS.writeFile(phoenix_file_path, content, 'utf8');
            logger.info("phoenixReadAndCreateFile()-file created successfully " + phoenix_file_path);
            return true;
        }
    } catch (e) {
        logger.error("phoenixReadAndCreateFile()-Exception: " + e);
        return false;
    }
}

async function phoenixReadFile(formData) {
    try {
        let fileCheck = await phoenixCheckFile(phoenixFile_path);
        logger.info("phoenixReadFile()-File Check: " + fileCheck);
        if (fileCheck) {
            let content = await promiseFS.readFile(phoenixFile_path, 'utf8');
            if (content.includes(formData.giturl) && 
                content.includes(formData.cloud) && 
                content.includes(formData.appserver) && 
                content.includes(formData.email)) {
                    logger.info("phoenixReadFile()-File String matches with the formData");
                    await phoenixRemoveFile(phoenixFile_path);
                    return true;
            }
            else {
                logger.error("phoenixReadFile()-File String does not matches with formData");
                return false;
            }
        }
    } catch (ex) {
        logger.error("phoenixReadFile()-Exception: " + ex);
    }
}
async function phoenixRemoveFile(file_path) {
    try {
        await promiseFS.unlink(file_path);
        logger.info("phoenixRemoveFile()-File Deleted")
        return true;
    } catch (e) {
        logger.error("phoenixRemoveFile()-Exception: " + e);
        return false;

    }
}

function phoenixFileLocationTracker(cloud) {
    let file_path = ""
    if (cloud == "aws") {
        file_path = '/home/ubuntu' + path.sep + file_name;
        return file_path;
    }
    if (cloud == "azure") {
        file_path = '/home/ubuntu' + path.sep + file_name;
        return file_path;
    }
    if (cloud == "gcp") {
        file_path = '/home/ubuntu' + path.sep + file_name;
        return file_path;
    }
}

async function phoenixAwsFile(formData) {
    try {
        // let file_path = aws_phoenixFile_location + path.sep + file_name;
        let fileCheckFlag = await phoenixCheckFile(phoenixFile_path);
        logger.info("phoenixAwsFile()-fileCheckFlag: " + fileCheckFlag);
        if (fileCheckFlag) {
            logger.info("phoenixAwsFile()-file already exists");
            await phoenixRemoveFile(phoenixFile_path);
            await phoenixReadAndCreateFile(phoenixFile_path, formData);
        }
        else {
            await phoenixReadAndCreateFile(phoenixFile_path, formData);
            // phoenixCreateFile(file_path, formData);
        }
    } catch (e) {
        logger.error("phoenixAwsFile()-Exception: " + e);
    }
}

async function phoenixAzureFile(formData) {
    try {
        let fileCheckFlag = await phoenixCheckFile(phoenixFile_path);
        logger.info("phoenixAzureFile()-fileCheckFlag: " + fileCheckFlag);
        if (fileCheckFlag) {
            logger.info("phoenixAzureFile()-file already exists");
            await phoenixRemoveFile(phoenixFile_path);
            await phoenixReadAndCreateFile(phoenixFile_path, formData);
        }
        else {
            await phoenixReadAndCreateFile(phoenixFile_path, formData);
        }
    } catch (ex) {
        logger.error("phoenixAzureFile()-Exception: " + ex);
    }
}
async function phoenixGcpFile(formData) {
    try {
        let fileCheckFlag = await phoenixCheckFile(phoenixFile_path);
        logger.info("phoenixGcpFile()-fileCheckFlag: " + fileCheckFlag);
        if (fileCheckFlag) {
            logger.info("phoenixGcpFile()-file already exists");
            await phoenixRemoveFile(phoenixFile_path);
            await phoenixReadAndCreateFile(phoenixFile_path, formData);
        }
        else {
            await phoenixReadAndCreateFile(phoenixFile_path, formData);
        }
    } catch (ex) {
        logger.error("phoenixGcpFile()-Exception: " + ex);
    }
}
//define model  ========================================>
const Phoenix = mongoose.model('Phoenix', {
    appserver: String,
    email: String,
    cloud: String,
    giturl: String
});

//routes        ========================================>

//post method=====>
app.post('/api', function (req, res) {
    Phoenix.create({
        cloud: req.body.cloud,
        email: req.body.email,
        appserver: req.body.appserver,
        giturl: req.body.giturl
    }, function (err, data) {
        if (err) { res.send(err); }
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('success');
    });
});
// aws post api
app.post('/api/aws', async function (req, res) {
    logger.info("*****".repeat(10));
    try {
        await Phoenix.create({
            cloud: req.body.cloud,
            email: req.body.email,
            appserver: req.body.appserver,
            giturl: req.body.giturl
        }, async function (err, data) {
            if (err) {
                logger.error("AWS-Create-API()-Error: " + err);
            }
            else {
                logger.info("AWS-Create-API()-inserting data to database");
                await phoenixAwsFile(req.body);
                let shell_file_path = await shellFileLocation(req.body.cloud, 'initiate');
                res.writeHead(200, { 'Content-Type': 'text/plain' })
                res.end('success');
                initiateShellCommand(shell_file_path);
            }
        });
    }
    catch (e) {
        logger.error("AWS-Create-API()-Exception: " + e);
    }
});
// azure post api
app.post('/api/azure', async function (req, res) {
    logger.info("*****".repeat(10));
    try {
        await Phoenix.create({
            cloud: req.body.cloud,
            email: req.body.email,
            appserver: req.body.appserver,
            giturl: req.body.giturl
        }, async function (err, data) {
            if (err) {
                logger.error("Azure-Create-API()-Error: " + err);
            }
            else {
                logger.info("Azure-Create-API()-inserting data to database");
                await phoenixAzureFile(req.body);
                let shell_file_path = await shellFileLocation(req.body.cloud, 'initiate');
                res.writeHead(200, { 'Content-Type': 'text/plain' })
                res.end('success');
                initiateShellCommand(shell_file_path);
            }
        });
    } catch (ex) {
        logger.error("Azure-Create-API()-Exception: " + ex);
    }

});
// gcp post api
app.post('/api/gcp', async function (req, res) {
    logger.info("*****".repeat(10));
    try {
        await Phoenix.create({
            cloud: req.body.cloud,
            email: req.body.email,
            appserver: req.body.appserver,
            giturl: req.body.giturl
        }, async function (err, data) {
            if (err) {
                logger.error("GCP-Create-API()-Error: " + err);
            }
            else {
                logger.info("GCP-Create-API()-inserting data to database");
                await phoenixGcpFile(req.body);
                let shell_file_path = await shellFileLocation(req.body.cloud, 'initiate');
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('success');
                initiateShellCommand(shell_file_path);
            }
        });
    } catch (ex) {
        logger.error("GCP-Create-API()-Exception: " + ex);
    }
});

//delete method======>
//aws delete api
app.post('/api/aws/remove', async function (req, res) {
    logger.info("*****".repeat(10));
    try {
        let reqData = {
            appserver: req.body.appserver,
            email: req.body.email,
            cloud: req.body.cloud,
            giturl: req.body.giturl
        };
        logger.info("AWS-Delete-API()-reqData: " + JSON.stringify(reqData));
        let removeFileCheck = await phoenixReadFile(reqData);
        if (removeFileCheck) {
            await Phoenix.findOneAndDelete(reqData, async function (err, data) {
                if (err) {
                    logger.error("AWS-Delete-API()-Error: " + err);
                }
                else {
                    logger.info("AWS-Delete-API()-reqData match found in database");
                    logger.info("AWS-Delete-API()-deleting data from database");
                    let shell_file_path = await shellFileLocation(reqData.cloud, 'destroy');
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('success');
                    destroyShellCommand(shell_file_path);
                }
            });
        }
        else {
            logger.error("AWS-Delete-API()-reqData match not found in database");
        }
    }
    catch (ex) {
        logger.error("AWS-Delete-API()-Exception: " + ex);
    }
});
app.post('/api/azure/remove', async function (req, res) {
    logger.info("*****".repeat(10));
    try {
        let reqData = {
            appserver: req.body.appserver,
            email: req.body.email,
            cloud: req.body.cloud,
            giturl: req.body.giturl
        };
        logger.info("Azure-Delete-API()-reqData: " + JSON.stringify(reqData));
        let removeFileCheck = await phoenixReadFile(reqData);
        if (removeFileCheck) {
            await Phoenix.findOneAndDelete(reqData, async function (err, data) {
                if (err) {
                    logger.error("Azure-Delete-API()-Error: " + err);
                }
                else {
                    logger.info("Azure-Delete-API()-reqData match found in database");
                    logger.info("Azure-Delete-API()-deleting data from database");
                    let shell_file_path = await shellFileLocation(reqData.cloud, 'destroy');
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('success');
                    destroyShellCommand(shell_file_path);
                }
            });
        }
        else {
            logger.error("Azure-Delete-API()-reqData match not found in database");
        }
    } catch (ex) {
        logger.error("Azure-Delete-API()-Exception: " + ex);
    }
});
app.post('/api/gcp/remove', async function (req, res) {
    logger.info("*****".repeat(10));
    try {
        var reqData = {
            appserver: req.body.appserver,
            email: req.body.email,
            cloud: req.body.cloud,
            giturl: req.body.giturl
        };
        logger.info("GCP-Delete-API()-reqData: " + JSON.stringify(reqData));
        let removeFileCheck = await phoenixReadFile(reqData);
        if (removeFileCheck) {
            await Phoenix.findOneAndDelete(reqData, async function (err, data) {
                if (err) {
                    logger.error("GCP-Delete-API()-Error: " + err);
                }
                else {
                    logger.info("GCP-Delete-API()-reqData match found in database");
                    logger.info("GCP-Delete-API()-deleting data from database");
                    let shell_file_path = await shellFileLocation(reqData.cloud, 'destroy');
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end('success');
                    destroyShellCommand(shell_file_path);
                }
            });
        }
        else {
            logger.error("GCP-Delete-API()-reqData match not found in database");
        }
    } catch (ex) {
        logger.error("GCP-Delete-API()-Exception: " + ex);
    }
});

app.get("/", function (req, res) {
    res.sendFile(__dirname + './public/index.html');
});

logger.info("app: " + (app ? true : false));

app.listen(port);
logger.info("server is running at port " + port);