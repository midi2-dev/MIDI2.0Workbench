#include "functions.h"

using v8::FunctionTemplate;

NAN_MODULE_INIT(InitAll) {
  
  Nan::Set(target, Nan::New("setup").ToLocalChecked(),
      Nan::GetFunction(Nan::New<FunctionTemplate>(setup)).ToLocalChecked());
  Nan::Set(target, Nan::New("end").ToLocalChecked(),
      Nan::GetFunction(Nan::New<FunctionTemplate>(end)).ToLocalChecked());

  Nan::Set(target, Nan::New("MIDIGetNumberOfDestinations").ToLocalChecked(),
      Nan::GetFunction(Nan::New<FunctionTemplate>(CM_MIDIGetNumberOfDestinations)).ToLocalChecked());
  Nan::Set(target, Nan::New("MIDIGetDevice").ToLocalChecked(),
      Nan::GetFunction(Nan::New<FunctionTemplate>(CM_MIDIGetDevice)).ToLocalChecked());
  Nan::Set(target, Nan::New("MIDIObjectGetStringProperty").ToLocalChecked(),
      Nan::GetFunction(Nan::New<FunctionTemplate>(CM_MIDIObjectGetStringProperty)).ToLocalChecked());

  Nan::Set(target, Nan::New("MIDIObjectGetIntegerProperty").ToLocalChecked(),
      Nan::GetFunction(Nan::New<FunctionTemplate>(CM_MIDIObjectGetIntegerProperty)).ToLocalChecked());
  Nan::Set(target, Nan::New("MIDIDeviceGetNumberOfEntities").ToLocalChecked(),
      Nan::GetFunction(Nan::New<FunctionTemplate>(CM_MIDIDeviceGetNumberOfEntities)).ToLocalChecked());
  Nan::Set(target, Nan::New("MIDIDeviceGetEntity").ToLocalChecked(),
      Nan::GetFunction(Nan::New<FunctionTemplate>(CM_MIDIDeviceGetEntity)).ToLocalChecked());
  Nan::Set(target, Nan::New("MIDIEntityGetNumberOfDestinations").ToLocalChecked(),
      Nan::GetFunction(Nan::New<FunctionTemplate>(CM_MIDIEntityGetNumberOfDestinations)).ToLocalChecked());
  Nan::Set(target, Nan::New("MIDIEntityGetNumberOfSources").ToLocalChecked(),
      Nan::GetFunction(Nan::New<FunctionTemplate>(CM_MIDIEntityGetNumberOfSources)).ToLocalChecked());
  Nan::Set(target, Nan::New("MIDIEntityGetSource").ToLocalChecked(),
      Nan::GetFunction(Nan::New<FunctionTemplate>(CM_MIDIEntityGetSource)).ToLocalChecked());
  Nan::Set(target, Nan::New("MIDIEntityGetDestination").ToLocalChecked(),
      Nan::GetFunction(Nan::New<FunctionTemplate>(CM_MIDIEntityGetDestination)).ToLocalChecked());

  Nan::Set(target, Nan::New("MIDIOutputPortCreate").ToLocalChecked(),
      Nan::GetFunction(Nan::New<FunctionTemplate>(CM_MIDIOutputPortCreate)).ToLocalChecked());
  Nan::Set(target, Nan::New("MIDIPortDispose").ToLocalChecked(),
      Nan::GetFunction(Nan::New<FunctionTemplate>(CM_MIDIPortDispose)).ToLocalChecked());    
  Nan::Set(target, Nan::New("MIDISendEventList").ToLocalChecked(),
      Nan::GetFunction(Nan::New<FunctionTemplate>(CM_MIDISendEventList)).ToLocalChecked());    
  Nan::Set(target, Nan::New("MIDIInputPortCreateWithProtocol").ToLocalChecked(),
      Nan::GetFunction(Nan::New<FunctionTemplate>(CM_MIDIInputPortCreateWithProtocol)).ToLocalChecked());

  Nan::Set(target, Nan::New("MIDISourceCreateWithProtocol").ToLocalChecked(),
      Nan::GetFunction(Nan::New<FunctionTemplate>(CM_MIDISourceCreateWithProtocol)).ToLocalChecked());

  Nan::Set(target, Nan::New("MIDIDestinationCreateWithProtocol").ToLocalChecked(),
     Nan::GetFunction(Nan::New<FunctionTemplate>(CM_MIDIDestinationCreateWithProtocol)).ToLocalChecked());

}


NODE_MODULE(CoreMIDI, InitAll)
