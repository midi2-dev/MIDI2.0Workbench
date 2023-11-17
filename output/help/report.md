# Reporting MIDI 2.0 Workbench Issues, Errors ar suggested improvements

All Issues, Errors ar suggested improvements should be reported at [https://github.com/midi-mma/midi-workbench/issues](https://github.com/midi-mma/midi-workbench/issues)

If there are Issues or Errors please include the Log file which can downloaded on the [[Debug|debug]] page. 
Please note that this file may contain sensitive information and users should redact any information that should be not public.

MIDIWorkbench may throw internal errors which will display. Please include a screenshot of these errors with the report.

Example of a MIDI 2.0 Workbench error:
```
Uncaught Exception:
TypeError: Cannot read property 'active' of undefined
at //midi2workbench.app/Contents/Resources/app.asar/main.js:1008:26
at midici.findMatchingFile (//midi2workbench.app/Contents/Resources/app.asar/libs/midici.js:1045:3)
at midici.ciEventHandler (//midi2workbench.app/Contents/Resources/app.asar/main.js:1000:9)
at midici.processCI (//midi2workbench.app/Contents/Resources/app.asar/libs/midici.js:884:26)
at //midi2workbench.app/Contents/Resources/app.asar/main.js:185:22
at Object.t.processUMP (//midi2workbench.app/Contents/Resources/app.asar/libs/translations.js:473:21)
at Object.midiToProc (//midi2workbench.app/Contents/Resources/app.asar/main.js:180:4)
at NodeMidiInput.processMidi (//midi2workbench.app/Contents/Resources/app.asar/libs/VirtualMIDI1.js:381:21)
at NodeMidiInput.emit (events.js:315:20)
```