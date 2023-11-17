#ifndef NATIVE_EXTENSION_GRAB_H
#define NATIVE_EXTENSION_GRAB_H

#include <nan.h>

NAN_METHOD(setup);
NAN_METHOD(end);
NAN_METHOD(CM_MIDIOutputPortCreate);
NAN_METHOD(CM_MIDISourceCreateWithProtocol);
NAN_METHOD(CM_MIDIDestinationCreateWithProtocol);

NAN_METHOD(CM_MIDIInputPortCreateWithProtocol);
NAN_METHOD(CM_MIDIPortDispose);
NAN_METHOD(CM_MIDISendEventList);

NAN_METHOD(CM_MIDIGetNumberOfDestinations);
NAN_METHOD(CM_MIDIGetDevice);

NAN_METHOD(CM_MIDIObjectGetStringProperty);
NAN_METHOD(CM_MIDIObjectGetIntegerProperty);

NAN_METHOD(CM_MIDIDeviceGetNumberOfEntities);
NAN_METHOD(CM_MIDIDeviceGetEntity);
NAN_METHOD(CM_MIDIEntityGetNumberOfSources);
NAN_METHOD(CM_MIDIEntityGetNumberOfDestinations);
NAN_METHOD(CM_MIDIEntityGetSource);
NAN_METHOD(CM_MIDIEntityGetDestination);

#endif
