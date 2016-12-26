Automation Server
=================

An HTTP API server for controlling my air conditioner and ceiling light.

Dependencies
------------
- [ir-slinger](https://github.com/bschwind/ir-slinger)
- NodeJS
```
$ sudo apt-get install nodejs
$ sudo ln -s /usr/bin/nodejs /usr/bin/node
```
- npm
```
$ sudo apt-get install npm
$ sudo npm install -g npm
```

Build
-----
    $ npm install

Run
---

    $ node app.js

PM2 Startup
-----------

```
$ sudo npm install -g pm2
$ sudo env PATH=$PATH:/usr/local/bin pm2 startup systemd -u pi --hp /home/pi
$ pm2 start automationServer.json
$ pm2 save
```

```
$ cat /home/pi/automationServer.json
{
  "apps" : [{
    "name"        : "automation-server",
    "script"      : "server.js",
    "cwd"         : "/home/pi/projects/automation-server/"
  }]
}
```
