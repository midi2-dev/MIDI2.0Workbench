#include <nan.h>
#include <map>
#include <iostream>

#include <CoreMIDI/CoreMIDI.h>
#include <CoreServices/CoreServices.h>
#include "coreMIDI/readerwriterqueue.h"

typedef struct {
    uint32_t packetWords[512];
    MIDITimeStamp packetTimestamp;
    uint32_t srcConnRefConExt;
    int wc;

} mpackets;

moodycamel::ReaderWriterQueue< mpackets> q(100);

MIDIClientRef midiclient;
MIDIClientRef outport;
Nan::Callback* cbPeriodic;
int packetWC = 0;

uint32_t inPointers[256];
uint8_t inPPos=0;

uint32_t connectionRefs[256];
uint8_t crPos=0;


MIDIReceiveBlock receiveBlock = ^(const MIDIEventList* eventList,
                                      void* srcConnRefCon)
    {
      uint32_t* portin = (uint32_t*)srcConnRefCon;
      int numpackets  = (int)eventList->numPackets;
      std::cout << "RecieveBlock : " << portin << " : " << numpackets << '\n';
      const MIDIEventPacket* packetGet = eventList->packet;



      for (int index = 0; index < numpackets; index++){

        mpackets m;
        m.srcConnRefConExt =*portin;
        m.packetTimestamp = packetGet->timeStamp;
        m.wc = (int)packetGet->wordCount;

        for (int c = 0; c < m.wc; c++){
            m.packetWords[c] = packetGet->words[c];
        }

        q.enqueue(m);

        packetGet = MIDIEventPacketNext(packetGet);
      }
   };


NAN_METHOD(UMPSupported) {
    SInt32 majorVersion;

    Gestalt(gestaltSystemVersionMajor, &majorVersion);
    std::cout << "UMPSupported  majorVersion " << majorVersion << '\n';
    if(majorVersion >= 14){
        info.GetReturnValue().Set(1);
    }else{
        info.GetReturnValue().Set(0);
    }

}

NAN_METHOD(get_UMP_Endpoints) {

   v8::Local <v8::Array> eps = Nan::New<v8::Array>();
   uint8_t epFound=0;

   char name[128];
   CFStringRef str;
   str = NULL;
   SInt32 offline;

   int numDevices = MIDIGetNumberOfDevices();
   for(int i=0;i<numDevices;i++) {

     //int umpEnabled;
     //MIDIObjectGetIntegerProperty( MIDIDeviceRef, kMIDIPropertyUniqueID, &umpEnabled );

    uint32_t MIDIDeviceRef = MIDIGetDevice(i);

    int numEntities = MIDIDeviceGetNumberOfEntities(MIDIDeviceRef);

    uint32_t lastEntityRef = MIDIDeviceGetEntity(MIDIDeviceRef, numEntities-1);
    MIDIObjectGetStringProperty( lastEntityRef, kMIDIPropertyName, &str );
    if ( str != NULL ) {
        CFStringGetCString( str, name, sizeof(name), kCFStringEncodingUTF8 );
        CFRelease( str );
    }

//     SInt32 UMPSup;
//     //kMIDIPropertyUMPCanTransmitGroupless
//     MIDIObjectGetIntegerProperty( MIDIDeviceRef, kMIDIPropertyUMPActiveGroupBitmap, &UMPSup );
//     std::cout << "listing MIDIDeviceRef : " << i <<" : kMIDIPropertyUMPActiveGroupBitmap " << UMPSup << '\n';
//     MIDIObjectGetIntegerProperty( lastEntityRef, kMIDIPropertyUMPActiveGroupBitmap, &UMPSup );
//     std::cout << "listing lastEntityRef : " << i <<" : kMIDIPropertyUMPActiveGroupBitmap " << UMPSup << '\n';

    MIDIObjectGetIntegerProperty( MIDIDeviceRef, kMIDIPropertyOffline, &offline );
    if(offline || strcmp(name,"MIDI 2.0")){ continue;} //Not a MIDI 2.0 Endpoint

    //Ok Add to List of Devices

    v8::Local <v8::Object> port = Nan::New<v8::Object>();
    Nan::Set(port,Nan::New("MIDIDeviceRef").ToLocalChecked(),Nan::New(MIDIDeviceRef));

    MIDIObjectGetStringProperty( MIDIDeviceRef, kMIDIPropertyName, &str );
    if ( str != NULL ) {
        CFStringGetCString( str, name, sizeof(name), kCFStringEncodingUTF8 );
        CFRelease( str );
        Nan::Set(port,Nan::New("clientName").ToLocalChecked(), Nan::New(name).ToLocalChecked());
    }

    MIDIObjectGetStringProperty( MIDIDeviceRef, kMIDIPropertyModel, &str );
    if ( str != NULL ) {
        CFStringGetCString( str, name, sizeof(name), kCFStringEncodingUTF8 );
        CFRelease( str );
        Nan::Set(port,Nan::New("model").ToLocalChecked(), Nan::New(name).ToLocalChecked());
    }

    MIDIObjectGetStringProperty( MIDIDeviceRef, kMIDIPropertyManufacturer, &str );
    if ( str != NULL ) {
        CFStringGetCString( str, name, sizeof(name), kCFStringEncodingUTF8 );
        CFRelease( str );
        Nan::Set(port,Nan::New("manufacturer").ToLocalChecked(), Nan::New(name).ToLocalChecked());
    }

    Nan::Set(port,Nan::New("offline").ToLocalChecked(),Nan::New(offline));

    //Get Source and Dest Refs
    uint32_t SourceRef = MIDIEntityGetSource(lastEntityRef, 0);
    Nan::Set(port,Nan::New("SourceRef").ToLocalChecked(),Nan::New(SourceRef));
    uint32_t DestinationRef = MIDIEntityGetDestination(lastEntityRef, 0);
    Nan::Set(port,Nan::New("DestinationRef").ToLocalChecked(),Nan::New(DestinationRef));

    //TODO Set up connection
    int found=0;
    for(int j=0;j<256;j++){
        if(connectionRefs[j]==SourceRef){
            Nan::Set(port,Nan::New("InportRef").ToLocalChecked(),Nan::New(inPointers[j]));
            found=1;
            break;
        }
    }
    if(!found){
        MIDIPortRef inport;
        OSStatus result = MIDIInputPortCreateWithProtocol(midiclient,
              CFSTR("IN"), kMIDIProtocol_2_0, &inport, receiveBlock);
        if (result){
              Nan::ThrowTypeError("ERROR: cannot create input port");
              return;
        }
        inPointers[inPPos] = (uint32_t)inport;
        result = MIDIPortConnectSource(inport, SourceRef, &inPointers[inPPos]);
        if (result){
            Nan::ThrowTypeError("ERROR: cannot create input port");
            return;
        }
        std::cout << "MIDIInputPortCreate 2 : inport " << inport <<" : inports " << inPointers[inPPos]
            <<" : SourceRef " <<  MIDIDeviceRef << " : res " << result << '\n';
        inPPos++;
        connectionRefs[crPos++]=SourceRef;
        Nan::Set(port,Nan::New("InportRef").ToLocalChecked(),Nan::New(inport));
    }

    //Go through Entities to build GTB topology
    int currentSourceGroup = 0;
    int currentDestinationGroup = 0;
    v8::Local <v8::Array> blks = Nan::New<v8::Array>();
    for (int i = 0; i < numEntities-1; i++) {
        v8::Local <v8::Object> blkO = Nan::New<v8::Object>();
        uint32_t EntityRef = MIDIDeviceGetEntity(MIDIDeviceRef, i);

        Nan::Set(blkO,Nan::New("blockId").ToLocalChecked(),Nan::New(EntityRef));
        Nan::Set(blkO,Nan::New("active").ToLocalChecked(),Nan::New(true));

        MIDIObjectGetStringProperty( EntityRef, kMIDIPropertyName, &str );
        if ( str != NULL ) {
            CFStringGetCString( str, name, sizeof(name), kCFStringEncodingUTF8 );
            CFRelease( str );
            Nan::Set(blkO,Nan::New("name").ToLocalChecked(), Nan::New(name).ToLocalChecked());
        }

        int numSource = MIDIEntityGetNumberOfSources(EntityRef);
        int numDestination = MIDIEntityGetNumberOfDestinations(EntityRef);
        int dir=0;
        if(numSource){
            dir |= 0b10;
            Nan::Set(blkO,Nan::New("firstGroup").ToLocalChecked(),Nan::New(currentSourceGroup));
            Nan::Set(blkO,Nan::New("numberGroups").ToLocalChecked(),Nan::New(numSource));
            currentSourceGroup += numSource;
        }
        if(numDestination){
            dir |= 0b01;
            if(!numSource){
                Nan::Set(blkO,Nan::New("firstGroup").ToLocalChecked(),Nan::New(currentDestinationGroup));
                Nan::Set(blkO,Nan::New("numberGroups").ToLocalChecked(),Nan::New(numDestination));
            }
            currentDestinationGroup += numDestination;
        }
        Nan::Set(blkO,Nan::New("direction").ToLocalChecked(),Nan::New(dir));
        int numGroups = numSource > numDestination? numSource : numDestination;
        Nan::Set(blkO,Nan::New("numberGroups").ToLocalChecked(),Nan::New(numGroups));
        //std::cout << "MIDIInputPortCreate 2 : numSource " << numSource <<" : numDestination " << numDestination << '\n';
        Nan::Set(blks, i, blkO);
       }
       Nan::Set(port,Nan::New("blocks").ToLocalChecked(),blks);

       Nan::Set(eps, epFound++, port);
  }

  info.GetReturnValue().Set(eps);
}

NAN_METHOD(startListen) {
  if (MIDIClientCreate(CFSTR("NodeCoreMIDI"), NULL, NULL, &midiclient)) {
    Nan::ThrowTypeError("Error trying to create MIDI Client");
        return;
  }
  OSStatus result = MIDIOutputPortCreate(midiclient, CFSTR("out"), /*OUT*/ &outport);
  if (result){
        Nan::ThrowTypeError("ERROR: cannot create output port");
        return;
  }
}

NAN_METHOD(getEvents) {
    v8::Local <v8::Object> evOut = Nan::New<v8::Object>();

   mpackets mout;
   if(q.try_dequeue(mout)){
   Nan::Set(evOut,Nan::New("client").ToLocalChecked(),Nan::New(mout.srcConnRefConExt));
    //std::cout << "asyncmsg " << mout.srcConnRefConExt << " wc " << mout.wc <<  '\n';
        v8::Local <v8::Array> umps = Nan::New <v8::Array> (mout.wc);
        for(int i=0 ; i < mout.wc; i++ ){
              Nan::Set(umps, i, Nan::New(mout.packetWords[i]));
          }
        Nan::Set(evOut,Nan::New("ump").ToLocalChecked(),umps);
   }

    info.GetReturnValue().Set(evOut);
}

NAN_METHOD(sendUMP){

std::cout << "Sending+"  << " \n";

    if (info.Length() < 1) {
      Nan::ThrowTypeError("Missing Client!");
      return;
    }

    if (info.Length() < 2 || !info[1]->IsArray()) {
            Nan::ThrowTypeError("Missing UMP!");
            return;
      }

    int protocol;
    if (info.Length() < 3 ) {
      protocol = 2;
    }else{
      protocol = Nan::To<int>(info[3]).FromJust();
    }

    int entityRef = Nan::To<int>(info[0]).FromJust();
    std::cout << " - entityRef " << entityRef << " \n";




    v8::Local<v8::Context> context = info.GetIsolate()->GetCurrentContext();
    v8::Local<v8::Array> jsArray = v8::Local<v8::Array>::Cast(info[1]);
    int arrayLen = jsArray->Length();
    std::cout << " - arrayLen" << arrayLen << " \n";
    uint32_t ump[arrayLen];
    for(uint16_t i=0; i< arrayLen;i++){
        uint32_t uVal = jsArray->Get(context, i).ToLocalChecked()->Uint32Value(context).FromJust();
        ump [i] = uVal;
        std::cout << " -" << uVal << " \n";
    }
    
    MIDIEventList eventList;
    MIDIEventPacket* curPacket = MIDIEventListInit(&eventList, protocol==2?kMIDIProtocol_2_0:kMIDIProtocol_1_0);

    curPacket = MIDIEventListAdd(&eventList,
                                     sizeof(eventList),
                                     curPacket,
                                     (MIDITimeStamp)0,
                                     arrayLen,
                                     (const UInt32*)ump);



   OSStatus result = MIDISendEventList(outport, entityRef, &eventList);
   std::cout << "MIDISendEventList = " << result << " : "  << outport << " : " << entityRef << '\n';
   //       for (int l=0; l<arrayLen ; l++){
   //         std::cout << "  --  " << ump[l]  <<'\n';
   //       }
   info.GetReturnValue().Set(result);
}


NAN_MODULE_INIT(Initialize) {

  NAN_EXPORT(target, UMPSupported);
  NAN_EXPORT(target, get_UMP_Endpoints);
  NAN_EXPORT(target, startListen);
  NAN_EXPORT(target, getEvents);
  NAN_EXPORT(target, sendUMP);

}

NODE_MODULE(CoreMIDI2, Initialize)



