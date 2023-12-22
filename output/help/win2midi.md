# Testing UMP Devices on Windows
_Note: UMP testing on windows is fairly new and this information is changing rapidly._

To get UMP working in Windows please make sure that MIDI Services is installed and running.
Please use the latest installer located at https://github.com/microsoft/MIDI/releases or on the discord. (or wait until it is shipped with Windows).

Test that MIDI Services works on the commandline, before restarting MIDI 2.0 Workbench.

Windows MIDI Services provides two Diagnostic Loopback Devices that are crosslinked. The Workbench only connect to 
Loopback B. Setup your software to connect to LoopBack A, it then should appear in the Workbench. 

