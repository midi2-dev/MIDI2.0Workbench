# MIDI 2.0 Workbench
![img.png](img.png)

The MIDI 2.0 Workbench is a free tool from MIDI Association Members to help developers develop, debug (and deploy) MIDI 2.0 Applications and Devices. It runs on Windows, Mac and Linux.
The Workbench connects to your device or software, to test various MIDI 2.0 implementation features against the currently released specifications.

It provides a comprehensive debug of: 
* UMP messages
  * Stream Messages
  * Channel Voice Messages
  * System Messages
  * Utility Messages
  * System Exclusive
* MIDI-CI v1.1 and 1.2
  * Discovery
  * Property Exchange
  * Profiles
  * Process Inquiry
  * Protocol Negotiation (1.1. only)
* Standard MIDI File 2 - Processor and validator

The MIDI 2.0 Workbench also test various UMP transports where possible.

To test USB MIDI 2.0 please make sure you use either:
* OSX 14+
* Linux with a 6.5+ Kernel and ALSA libs 1.2.10+

Some prior version may work with mixed results.


This project uses a lot of raw data, as such it may not use available OS API's. It is recommended to use OS API's where 
available, and this project should not been seen as reference code.

### How To Build this Project
-----------------------
Use version 16.x of NodeJS. Later versions have issues with the C++ plugins.
On Mac please make sure the Xcode command line tools are installed.

After you cloned this repository
please run:
```
yarn
yarn run build
```
To run the application:
```
yarn run start
```

#### Installation FAQ's
_Q: Why are there no binary releases?_<br/>
A: This will happen eventually. Once code-signing is set up and working this will occur.

_Q: Later Ubuntu distro's don't support Node 16. How do I get it work?_<br/>
A: Use yarnpkg and nvm
```
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 16
nvm use 16
git clone https://github.com/midi2-dev/MIDI2.0Workbench.git
cd MIDI2.0Workbench
sudo apt-get install yarnpkg
yarnpkg
yarnpkg run build
yarnpkg run start
```

#### Issues and Updates
-----------------
This Project aims to follow the current public MIDI specifications. 
Please use the GitHub Issues to log any bugs, suggestions etc. 

This project is supported and copyrighted by Yamaha Corporation 2020 under MIT. 
