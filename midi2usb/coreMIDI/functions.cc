#include "functions.h"
#include <CoreMIDI/CoreMIDI.h>
#include <nan.h>

#include <iostream>
#include "readerwriterqueue.h"
//#include <vector>

typedef struct {
    uint32_t packetWords[512];
    MIDITimeStamp packetTimestamp;
    uint32_t srcConnRefConExt;
    int wc;

} mpackets;

moodycamel::ReaderWriterQueue< mpackets> q(100);

MIDIClientRef midiclient;
Nan::Callback* cbPeriodic;
int packetWC = 0;

uint32_t inPointers[256];
uint8_t inPPos=0;

//std::vector<MIDIPortRef> inports;

uv_async_t async; // keep this instance around for as long as we might need to do the periodic callback
uv_loop_t* loop = uv_default_loop();


void asyncmsg(uv_async_t* handle) {
  // Called by UV in main thread after our worker thread calls uv_async_send()
  //    I.e. it's safe to callback to the CB we defined in node!
  Nan::HandleScope scope;
  v8::Isolate* isolate = v8::Isolate::GetCurrent();

  mpackets mout;
  while(q.try_dequeue(mout)){
    //std::cout << "asyncmsg " << mout.srcConnRefConExt << " wc " << mout.wc <<  '\n';
    v8::Local <v8::Array> umps = Nan::New <v8::Array> (mout.wc);
    for(int i=0 ; i < mout.wc; i++ ){
          Nan::Set(umps, i, Nan::New(mout.packetWords[i]));
      }
      v8::Local<v8::Value> argv[] = {
          Nan::New<v8::Number>(mout.srcConnRefConExt),
          Nan::New<v8::Number>((uint64_t)mout.packetTimestamp),
          umps
      };
      cbPeriodic->Call(3, argv);
  }



//   if (packetWC){
//     v8::Local <v8::Array> umps = Nan::New <v8::Array> (packetWC);
//     for(int i=0 ; i < packetWC; i++ ){
//       Nan::Set(umps, i, Nan::New(packetWords[i]));
//     }
//     v8::Local<v8::Value> argv[] = {
//         Nan::New<v8::Number>(srcConnRefConExt),
//         Nan::New<v8::Number>((uint64_t)packetTimestamp),
//         umps
//     };
//     cbPeriodic->Call(3, argv);
//     packetWC = 0;
//   }

}

NAN_METHOD(end){
  uv_close((uv_handle_t*) &async, NULL);
  std::cout << "end: " << midiclient << '\n';
  MIDIClientDispose(midiclient);
}

NAN_METHOD(setup){
  if (info.Length() < 1) {
        Nan::ThrowTypeError("Missing Callback!");
        return;
  }

  if (MIDIClientCreate(CFSTR("NodeCoreMIDI"), NULL, NULL, &midiclient)) {
    Nan::ThrowTypeError("Error trying to create MIDI Client");
        return;
  }
  std::cout << "setup: midiinclient " << midiclient <<  '\n';
  uv_async_init(loop, &async, asyncmsg);
  cbPeriodic = new Nan::Callback(info[0].As<v8::Function>());
}

NAN_METHOD(CM_MIDIOutputPortCreate){
  MIDIPortRef outport;
  OSStatus result = MIDIOutputPortCreate(midiclient, CFSTR("out"), /*OUT*/ &outport);
  if (result){
      Nan::ThrowTypeError("ERROR: cannot create output port");
      return;
  }

  std::cout << "MIDIoutputCreate: port " << outport << " : res " << result << '\n';

  info.GetReturnValue().Set(outport);
}


NAN_METHOD(CM_MIDISourceCreateWithProtocol){
    if (info.Length() < 1) {
        Nan::ThrowTypeError("Missing Name!");
        return;
  }
  if (!info[0]->IsString()) {
          Nan::ThrowTypeError( " must be a string");
          return;
        }
        std::string var = (*Nan::Utf8String(info[0]));

  MIDIEndpointRef source;
  OSStatus result = MIDISourceCreateWithProtocol(
        midiclient,
        CFStringCreateWithCString(NULL, var.c_str(), kCFStringEncodingUTF8),
        kMIDIProtocol_1_0,
        &source);
  if (result){
      Nan::ThrowTypeError("ERROR: cannot create Virtual out port");
      return;
  }

  std::cout << "MIDISourceCreateWithProtocol: port " << source << " : res " << result << '\n';

  info.GetReturnValue().Set(source);
}


NAN_METHOD(CM_MIDIDestinationCreateWithProtocol){
   if (info.Length() < 1) {
          Nan::ThrowTypeError("Missing Name!");
          return;
    }
    if (!info[0]->IsString()) {
        Nan::ThrowTypeError( " must be a string");
        return;
      }
      std::string var = (*Nan::Utf8String(info[0]));

  v8::Local<v8::Context> context = info.GetIsolate()->GetCurrentContext();
  MIDIEndpointRef inport;

  MIDIReceiveBlock receiveBlock = ^(const MIDIEventList* eventList,
                                      void* srcConnRefCon)
    {
       //uint32_t* portin = (uint32_t*)srcConnRefCon;
      int numpackets  = (int)eventList->numPackets;
      const MIDIEventPacket* packetGet = eventList->packet;

      std::cout << "virtual srcConnRefCon : "
      << 0
      << '\n';

      for (int index = 0; index < numpackets; index++){

        mpackets m;
        m.srcConnRefConExt =0;
        m.packetTimestamp = packetGet->timeStamp;
        m.wc = (int)packetGet->wordCount;

        for (int c = 0; c < m.wc; c++){
            m.packetWords[c] = packetGet->words[c];
        }

        q.enqueue(m);

        uv_async_send(&async);

        packetGet = MIDIEventPacketNext(packetGet);
      }
   };

  OSStatus result = MIDIDestinationCreateWithProtocol(
        midiclient,
       CFStringCreateWithCString(NULL, var.c_str(), kCFStringEncodingUTF8),
       kMIDIProtocol_1_0,
       &inport,
       receiveBlock);
  if (result){
      Nan::ThrowTypeError("ERROR: cannot create Virtual input port");
      return;
  }

  std::cout << "MIDIDestinationCreateWithProtocol:  " << midiclient << " : inport " << inport << " : res " << result << '\n';

  inPointers[inPPos] = (uint32_t)inport;
//   result = MIDIPortConnectSource(inport, MIDIDeviceRef, &inPointers[inPPos]);
//   if (result){
//       Nan::ThrowTypeError("ERROR: cannot create input port");
//       return;
//   }

  //std::cout << "Virtual MIDIInputPortCreate 2 : inport " << inport <<" : inports " << inPointers[inPPos]
//   <<" : deviceref " <<  MIDIDeviceRef
  //<< " : res " << result << '\n';
  inPPos++;
  info.GetReturnValue().Set(inport);
}

NAN_METHOD(CM_MIDIInputPortCreateWithProtocol){
  if (info.Length() < 1) {
        Nan::ThrowTypeError("Missing Port Ref!");
        return;
  }

  if (info.Length() < 2) {
        Nan::ThrowTypeError("Missing Protocol!");
        return;
  }

  uint32_t MIDIDeviceRef = Nan::To<uint32_t>(info[0]).FromJust();
  int protocol = Nan::To<int>(info[1]).FromJust();
  v8::Local<v8::Context> context = info.GetIsolate()->GetCurrentContext();
  MIDIPortRef inport;

  MIDIReceiveBlock receiveBlock = ^(const MIDIEventList* eventList,
                                      void* srcConnRefCon)
    {
       uint32_t* portin = (uint32_t*)srcConnRefCon;
      //std::cout << "srcConnRefCon : " << *portin << '\n';




      //srcConnRefConExt =*portin;
      //srcConnRefConExt = (MIDIClientRef)*srcConnRefCon;

      int numpackets  = (int)eventList->numPackets;
     // std::cout << "RecieveBlock : " << srcConnRefConExt << " : " << numpackets << '\n';
      const MIDIEventPacket* packetGet = eventList->packet;

      for (int index = 0; index < numpackets; index++){

        mpackets m;
        m.srcConnRefConExt =*portin;
        m.packetTimestamp = packetGet->timeStamp;
        m.wc = (int)packetGet->wordCount;
        //uv_rwlock_wrlock(&lockthread.rwlock);
        //int wc = (int)packetGet->wordCount;
        //packetWC = (int)packetGet->wordCount;

        for (int c = 0; c < m.wc; c++){
            m.packetWords[c] = packetGet->words[c];
        }
       // std::copy(std::begin(packetGet->words), std::end(packetGet->words), std::begin(packetWords));

        q.enqueue(m);

        uv_async_send(&async);

        packetGet = MIDIEventPacketNext(packetGet);
      }


    };

  OSStatus result = MIDIInputPortCreateWithProtocol(midiclient,
      CFSTR("IN"), protocol==2?kMIDIProtocol_2_0: kMIDIProtocol_1_0, &inport, receiveBlock);
  if (result){
      Nan::ThrowTypeError("ERROR: cannot create input port");
      return;
  }

  std::cout << "MIDIInputPortCreate:  " << midiclient << " : inport " << inport << " : res " << result << '\n';

  inPointers[inPPos] = (uint32_t)inport;
  //inports.push_back(inport);

  //result = MIDIPortConnectSource(inport, MIDIDeviceRef, inports.data()[inports.size()-1]);
  result = MIDIPortConnectSource(inport, MIDIDeviceRef, &inPointers[inPPos]);
  if (result){
      Nan::ThrowTypeError("ERROR: cannot create input port");
      return;
  }

  std::cout << "MIDIInputPortCreate 2 : inport " << inport <<" : inports " << inPointers[inPPos] <<" : deviceref " <<  MIDIDeviceRef << " : res " << result << '\n';
  inPPos++;
  info.GetReturnValue().Set(inport);
}

NAN_METHOD(CM_MIDIPortDispose){
  if (info.Length() < 1) {
        Nan::ThrowTypeError("Missing Port Ref!");
        return;
  }


   MIDIPortRef MIDIDeviceRef = (MIDIPortRef)Nan::To<uint32_t>(info[0]).FromJust();
   OSStatus result = MIDIPortDispose(MIDIDeviceRef);

   std::cout << "CM_MIDIPortDispose: " << MIDIDeviceRef << " : " << result << '\n';
}

NAN_METHOD(CM_MIDISendEventList){
  if (info.Length() < 1) {
        Nan::ThrowTypeError("Missing Port Ref!");
        return;
  }

  if (info.Length() < 2) {
        Nan::ThrowTypeError("Missing Enitity Ref!");
        return;
  }
  if (info.Length() < 3 || !info[2]->IsArray()) {
        Nan::ThrowTypeError("Missing UMP!");
        return;
  }

  int protocol;
  if (info.Length() < 4 ) {
    protocol = 2;
  }else{
    protocol = Nan::To<int>(info[3]).FromJust();
  }



  v8::Local<v8::Context> context = info.GetIsolate()->GetCurrentContext();

  v8::Local<v8::Array> jsArray = v8::Local<v8::Array>::Cast(info[2]);
  int arrayLen = jsArray->Length();
  uint32_t ump[arrayLen];
  for(uint16_t i=0; i< arrayLen;i++){
      uint32_t uVal = jsArray->Get(context, i).ToLocalChecked()->Uint32Value(context).FromJust();
      ump[i] = uVal;
  }

  uint32_t portRef = Nan::To<uint32_t>(info[0]).FromJust();
  uint32_t entityRef = Nan::To<uint32_t>(info[1]).FromJust();
  MIDIEventList eventList;
  MIDIEventPacket* curPacket = MIDIEventListInit(&eventList, protocol==2?kMIDIProtocol_2_0:kMIDIProtocol_1_0);

  curPacket = MIDIEventListAdd(&eventList,
                                 sizeof(eventList),
                                 curPacket,
                                 (MIDITimeStamp)0,
                                 arrayLen,
                                 (const UInt32*)ump);



   OSStatus result = MIDISendEventList(portRef, entityRef, &eventList);

//    std::cout << "MIDISendEventList = " << result << " : "  << portRef << " : " << entityRef << '\n';
//       for (int l=0; l<arrayLen ; l++){
//         std::cout << "  --  " << ump[l]  <<'\n';
//       }
   info.GetReturnValue().Set(result);
}

NAN_METHOD(CM_MIDIGetNumberOfDestinations) {
    int numDevices = MIDIGetNumberOfDevices();
    info.GetReturnValue().Set(numDevices);
}

NAN_METHOD(CM_MIDIGetDevice) {
  if (info.Length() < 1) {
        Nan::ThrowTypeError("Missing Device Index!");
        return;
    }
    int deviceIndex0 = Nan::To<int>(info[0]).FromJust();
    uint32_t MIDIDeviceRef = MIDIGetDevice(deviceIndex0);
    info.GetReturnValue().Set(MIDIDeviceRef);
}

NAN_METHOD(CM_MIDIObjectGetStringProperty){
  if (info.Length() < 1) {
        Nan::ThrowTypeError("Missing Device Ref!");
        return;
  }
  if (info.Length() < 2) {
        Nan::ThrowTypeError("Missing Lookup!");
        return;
  }

  uint32_t MIDIDeviceRef = Nan::To<uint32_t>(info[0]).FromJust();
  char* lookup = *Nan::Utf8String(info[1]);

  char name[128];
  CFStringRef str;
  str = NULL;

  if(!strcmp(lookup,"kMIDIPropertyName")){
    MIDIObjectGetStringProperty( MIDIDeviceRef, kMIDIPropertyName, &str );
  }else
  if(!strcmp(lookup,"kMIDIPropertyModel")){
    MIDIObjectGetStringProperty( MIDIDeviceRef, kMIDIPropertyModel, &str );
  }else
  if(!strcmp(lookup,"kMIDIPropertyManufacturer")){
    MIDIObjectGetStringProperty( MIDIDeviceRef, kMIDIPropertyManufacturer, &str );
  }else
  if(!strcmp(lookup,"kMIDIPropertyUniqueID")){
    MIDIObjectGetStringProperty( MIDIDeviceRef, kMIDIPropertyUniqueID, &str );
  }else
  if(!strcmp(lookup,"kMIDIPropertyDeviceID")){
    MIDIObjectGetStringProperty( MIDIDeviceRef, kMIDIPropertyDeviceID, &str );
  }else
  if(!strcmp(lookup,"kMIDIPropertyProtocolID")){
    MIDIObjectGetStringProperty( MIDIDeviceRef, kMIDIPropertyProtocolID, &str );
  }else
  if(!strcmp(lookup,"kMIDIPropertyOffline")){
    MIDIObjectGetStringProperty( MIDIDeviceRef, kMIDIPropertyOffline, &str );
  }else
  if(!strcmp(lookup,"kMIDIPropertyDriverVersion")){
    MIDIObjectGetStringProperty( MIDIDeviceRef, kMIDIPropertyDriverVersion, &str );
  }else
  if(!strcmp(lookup,"kMIDIPropertyDriverOwner")){
    MIDIObjectGetStringProperty( MIDIDeviceRef, kMIDIPropertyDriverOwner, &str );
  }else{
    CFRelease( str );
    Nan::ThrowTypeError("Wrong Lookup!");
    return;
  }

  if ( str != NULL ) {
    CFStringGetCString( str, name, sizeof(name), kCFStringEncodingUTF8 );
    CFRelease( str );
  }

  info.GetReturnValue().Set(Nan::New(name).ToLocalChecked());
}

NAN_METHOD(CM_MIDIObjectGetIntegerProperty){
  if (info.Length() < 1) {
        Nan::ThrowTypeError("Missing Device Ref!");
        return;
  }
  if (info.Length() < 2) {
        Nan::ThrowTypeError("Missing Lookup!");
        return;
  }

  uint32_t MIDIDeviceRef = Nan::To<uint32_t>(info[0]).FromJust();
  char* lookup = *Nan::Utf8String(info[1]);

  int outvalue;

  if(!strcmp(lookup,"kMIDIPropertyUniqueID")){
    MIDIObjectGetIntegerProperty( MIDIDeviceRef, kMIDIPropertyUniqueID, &outvalue );
  }else
  if(!strcmp(lookup,"kMIDIPropertyDeviceID")){
    MIDIObjectGetIntegerProperty( MIDIDeviceRef, kMIDIPropertyDeviceID, &outvalue );
  }else
  if(!strcmp(lookup,"kMIDIPropertyProtocolID")){
    MIDIObjectGetIntegerProperty( MIDIDeviceRef, kMIDIPropertyProtocolID, &outvalue );
  }else
  if(!strcmp(lookup,"kMIDIPropertyOffline")){
    MIDIObjectGetIntegerProperty( MIDIDeviceRef, kMIDIPropertyOffline, &outvalue );
  }else
  if(!strcmp(lookup,"kMIDIPropertyDriverVersion")){
    MIDIObjectGetIntegerProperty( MIDIDeviceRef, kMIDIPropertyDriverVersion, &outvalue );
  }else{
    Nan::ThrowTypeError("Wrong Lookup!");
    return;
  }

  info.GetReturnValue().Set(outvalue);
}


NAN_METHOD(CM_MIDIDeviceGetNumberOfEntities) {
  if (info.Length() < 1) {
        Nan::ThrowTypeError("Missing Device Ref!");
        return;
    }
    uint32_t MIDIDeviceRef = Nan::To<uint32_t>(info[0]).FromJust();
    int numDevices = MIDIDeviceGetNumberOfEntities(MIDIDeviceRef);
    info.GetReturnValue().Set(numDevices);
}

NAN_METHOD(CM_MIDIDeviceGetEntity) {
  if (info.Length() < 1) {
        Nan::ThrowTypeError("Missing Device ref!");
        return;
    }
  if (info.Length() < 2) {
        Nan::ThrowTypeError("Missing Entity Index!");
        return;
    }
    uint32_t MIDIDeviceRef = Nan::To<uint32_t>(info[0]).FromJust();
    int entityIndex0 = Nan::To<int>(info[1]).FromJust();
    uint32_t MIDIDeviceRefOut = MIDIDeviceGetEntity(MIDIDeviceRef, entityIndex0);
    info.GetReturnValue().Set(MIDIDeviceRefOut);
}

NAN_METHOD(CM_MIDIEntityGetNumberOfSources) {
  if (info.Length() < 1) {
        Nan::ThrowTypeError("Missing Entity Ref!");
        return;
    }
    uint32_t MIDIDeviceRef = Nan::To<uint32_t>(info[0]).FromJust();
    int numDevices = MIDIEntityGetNumberOfSources(MIDIDeviceRef);
    info.GetReturnValue().Set(numDevices);
}

NAN_METHOD(CM_MIDIEntityGetNumberOfDestinations) {
  if (info.Length() < 1) {
        Nan::ThrowTypeError("Missing Entity Ref!");
        return;
    }
    uint32_t MIDIDeviceRef = Nan::To<uint32_t>(info[0]).FromJust();
    int numDevices = MIDIEntityGetNumberOfDestinations(MIDIDeviceRef);
    info.GetReturnValue().Set(numDevices);
}

NAN_METHOD(CM_MIDIEntityGetSource) {
  if (info.Length() < 1) {
        Nan::ThrowTypeError("Missing Enity ref!");
        return;
    }
  if (info.Length() < 2) {
        Nan::ThrowTypeError("Missing source Index!");
        return;
    }
    uint32_t MIDIDeviceRef = Nan::To<uint32_t>(info[0]).FromJust();
    int sourceIndex0 = Nan::To<int>(info[1]).FromJust();
    uint32_t MIDIDeviceRefOut = MIDIEntityGetSource(MIDIDeviceRef, sourceIndex0);
    info.GetReturnValue().Set(MIDIDeviceRefOut);
}

NAN_METHOD(CM_MIDIEntityGetDestination) {
  if (info.Length() < 1) {
        Nan::ThrowTypeError("Missing Enity ref!");
        return;
    }
  if (info.Length() < 2) {
        Nan::ThrowTypeError("Missing Destination Index!");
        return;
    }
    uint32_t MIDIDeviceRef = Nan::To<uint32_t>(info[0]).FromJust();
    int destIndex0 = Nan::To<int>(info[1]).FromJust();
    uint32_t MIDIDeviceRefOut = MIDIEntityGetDestination(MIDIDeviceRef, destIndex0);
    info.GetReturnValue().Set(MIDIDeviceRefOut);
}